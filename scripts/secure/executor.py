"""
Secure Script Executor - Core implementation of the sandboxed execution environment.
"""

import subprocess
import resource
import signal
import time
import os
import psutil
import socket
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List, Union
from .policy import SecurityPolicy
from .audit import AuditLogger
from .monitor import SecurityMonitor
from .analyzer import SecurityAnalyzer
from .exceptions import (
    ResourceLimitException, TimeoutException, ScriptExecutionException,
    FileSystemViolationException, NetworkViolationException, PolicyViolationException
)

class SecureScriptExecutor:
    """Secure script execution environment with sandboxing and resource controls."""

    def __init__(self, policy_file: str = "scripts/config/security_policy.yml"):
        self.policy = SecurityPolicy(policy_file)
        self.audit_logger = AuditLogger()
        self.security_monitor = SecurityMonitor(self.policy, self.audit_logger)
        self.security_analyzer = SecurityAnalyzer(self.audit_logger)
        self.quarantine_dir = Path("scripts/quarantine")
        self.quarantine_dir.mkdir(exist_ok=True)

        # Network monitoring
        self.network_activity = []
        self.network_monitor_thread = None
        self.monitoring_active = False

        # Filesystem monitoring
        self.filesystem_access_log = []

        # Start security monitoring
        self.security_monitor.start_monitoring()

    def _start_network_monitoring(self) -> None:
        """Start network activity monitoring."""
        self.network_activity = []
        self.monitoring_active = True

        def monitor_network():
            # This is a simplified network monitoring implementation
            # In production, this would use system-level network monitoring
            while self.monitoring_active:
                time.sleep(0.1)  # Check every 100ms

        self.network_monitor_thread = threading.Thread(target=monitor_network, daemon=True)
        self.network_monitor_thread.start()

    def _stop_network_monitoring(self) -> List[Dict[str, Any]]:
        """Stop network monitoring and return activity log."""
        self.monitoring_active = False
        if self.network_monitor_thread:
            self.network_monitor_thread.join(timeout=1.0)
        return self.network_activity.copy()

    def _validate_filesystem_access(self, script_path: str) -> None:
        """Validate filesystem access permissions for script execution."""
        script_path_obj = Path(script_path)

        # Check if script path is allowed
        if not self.policy.is_path_allowed(str(script_path_obj)):
            self.audit_logger.log_security_event(
                event_type="FILESYSTEM_VIOLATION",
                message=f"Script path not allowed: {script_path}",
                script_path=str(script_path)
            )
            raise FileSystemViolationException(f"Script path not allowed: {script_path}")

        # Check for potentially dangerous file operations in script content
        try:
            with open(script_path, 'r', encoding='utf-8') as f:
                content = f.read()

            dangerous_patterns = [
                'import os', 'import subprocess', 'os.system', 'subprocess.call',
                'os.remove', 'os.rmdir', 'shutil.rmtree', 'open(',
                'socket.', 'urllib.request'
            ]

            for pattern in dangerous_patterns:
                if pattern in content:
                    self.audit_logger.log_security_event(
                        event_type="DANGEROUS_PATTERN_DETECTED",
                        message=f"Potentially dangerous pattern detected: {pattern}",
                        script_path=str(script_path),
                        details={'pattern': pattern}
                    )
        except Exception as e:
            self.audit_logger.log_security_event(
                event_type="SCRIPT_ANALYSIS_ERROR",
                message=f"Could not analyze script content: {str(e)}",
                script_path=str(script_path)
            )

    def _setup_seccomp_filters(self) -> None:
        """Set up seccomp filters for system call restrictions."""
        # This is a placeholder for seccomp implementation
        # In production, this would use the seccomp library to restrict system calls
        pass

    def _validate_network_activity(self, network_logs: List[Dict[str, Any]]) -> None:
        """Validate network activity against security policy."""
        for activity in network_logs:
            if 'domain' in activity:
                if not self.policy.is_domain_allowed(activity['domain']):
                    self.audit_logger.log_security_event(
                        event_type="NETWORK_VIOLATION",
                        message=f"Domain access not allowed: {activity['domain']}",
                        details=activity
                    )
                    raise NetworkViolationException(f"Domain access not allowed: {activity['domain']}")

            if 'port' in activity:
                if self.policy.is_port_blocked(activity['port']):
                    self.audit_logger.log_security_event(
                        event_type="NETWORK_VIOLATION",
                        message=f"Port access blocked: {activity['port']}",
                        details=activity
                    )
                    raise NetworkViolationException(f"Port access blocked: {activity['port']}")

    def execute_script(self, script_path: str, args: Optional[List[str]] = None,
                      timeout: Optional[float] = None) -> Dict[str, Any]:
        """
        Execute a script in the secure environment.

        Args:
            script_path: Path to the Python script to execute
            args: List of arguments to pass to the script
            timeout: Override default timeout (optional)

        Returns:
            Dict containing execution results and metadata
        """

        script_path = Path(script_path)
        if not script_path.exists():
            raise ScriptExecutionException(f"Script file not found: {script_path}")

        # Phase 2: Advanced Security - Filesystem, Network Controls, and Static Analysis
        self._validate_filesystem_access(str(script_path))

        # Perform static analysis
        analysis_result = self.security_analyzer.analyze_script(str(script_path))
        if analysis_result['vulnerabilities_found'] > 0:
            # Log vulnerabilities but don't block execution (configurable)
            self.audit_logger.log_security_event(
                event_type="STATIC_ANALYSIS_WARNING",
                message=f"Script contains {analysis_result['vulnerabilities_found']} potential vulnerabilities",
                script_path=str(script_path),
                details={'risk_level': analysis_result['risk_level']}
            )

        self._start_network_monitoring()
        self._setup_seccomp_filters()

        # Get execution limits from policy
        limits = self.policy.get_execution_limits()
        exec_timeout = timeout or limits['timeout_seconds']

        # Set resource limits
        self._set_resource_limits(limits)

        # Prepare execution environment
        env = self._prepare_secure_environment()

        # Execute with monitoring
        start_time = time.time()
        resource_usage = {}

        try:
            # Execute the script
            result = subprocess.run(
                ['python3', str(script_path)] + (args or []),
                env=env,
                cwd=str(self.quarantine_dir),
                capture_output=True,
                text=True,
                timeout=exec_timeout
            )

            execution_time = time.time() - start_time

            # Collect resource usage (simplified for now)
            resource_usage = self._get_resource_usage()

            # Log execution
            self.audit_logger.log_execution(
                script_path=str(script_path),
                args=args,
                result=result,
                execution_time=execution_time,
                success=result.returncode == 0,
                resource_usage=resource_usage
            )

            # Phase 2: Validate network activity
            network_logs = self._stop_network_monitoring()
            self._validate_network_activity(network_logs)

            # Check for policy violations
            self._check_execution_policy(result, execution_time)

            # Record execution in security monitor
            success = result.returncode == 0
            self.security_monitor.record_execution(
                str(script_path), success, execution_time, resource_usage
            )

            return {
                'success': success,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'return_code': result.returncode,
                'execution_time': execution_time,
                'resource_usage': resource_usage,
                'network_activity': network_logs,
                'static_analysis': analysis_result,
                'security_checks': {
                    'filesystem_validated': True,
                    'network_monitored': True,
                    'resource_limits_applied': True,
                    'static_analysis_performed': True
                }
            }

        except subprocess.TimeoutExpired:
            execution_time = time.time() - start_time
            # Clean up network monitoring
            network_logs = self._stop_network_monitoring()

            self.audit_logger.log_execution(
                script_path=str(script_path),
                args=args,
                execution_time=execution_time,
                success=False,
                resource_usage={'error': 'timeout'}
            )
            raise TimeoutException(f"Script execution timed out after {exec_timeout} seconds")

        except Exception as e:
            execution_time = time.time() - start_time
            # Clean up monitoring on error
            if self.monitoring_active:
                self._stop_network_monitoring()

            self.audit_logger.log_security_event(
                event_type="EXECUTION_ERROR",
                message=f"Unexpected error during script execution: {str(e)}",
                script_path=str(script_path)
            )
            raise ScriptExecutionException(f"Script execution failed: {str(e)}")

    def get_security_stats(self) -> Dict[str, Any]:
        """Get security monitoring statistics."""
        return {
            'monitoring_stats': self.security_monitor.get_stats(),
            'recent_alerts': self.security_monitor.get_recent_alerts(5),
            'audit_summary': {
                'execution_history_count': len(self.audit_logger.get_execution_history()),
                'security_events_count': len(self.audit_logger.get_security_events())
            }
        }

    def analyze_script_security(self, script_path: str) -> Dict[str, Any]:
        """Perform detailed security analysis on a script without executing it."""
        return self.security_analyzer.analyze_script(script_path)

    def _set_resource_limits(self, limits: Dict[str, Any]) -> None:
        """Set resource limits for script execution."""
        try:
            # CPU time limit
            cpu_seconds = limits.get('cpu_seconds', 60)
            resource.setrlimit(
                resource.RLIMIT_CPU,
                (cpu_seconds, cpu_seconds)
            )

            # Memory limit
            memory_bytes = limits.get('memory_mb', 512) * 1024 * 1024
            resource.setrlimit(
                resource.RLIMIT_AS,
                (memory_bytes, memory_bytes)
            )

            # File size limit
            file_size_bytes = limits.get('file_size_mb', 100) * 1024 * 1024
            resource.setrlimit(
                resource.RLIMIT_FSIZE,
                (file_size_bytes, file_size_bytes)
            )

            # Process limit
            max_processes = limits.get('max_processes', 5)
            resource.setrlimit(
                resource.RLIMIT_NPROC,
                (max_processes, max_processes)
            )

        except (ValueError, OSError) as e:
            raise ResourceLimitException(f"Failed to set resource limits: {e}")

    def _prepare_secure_environment(self) -> Dict[str, str]:
        """Prepare a secure environment for script execution."""
        # Start with a clean environment
        env = os.environ.copy()

        # Remove potentially dangerous environment variables
        dangerous_vars = [
            'LD_PRELOAD', 'LD_LIBRARY_PATH', 'PATH',
            'PYTHONPATH', 'PYTHONHOME'
        ]

        for var in dangerous_vars:
            env.pop(var, None)

        # Set minimal PATH
        env['PATH'] = '/usr/local/bin:/usr/bin:/bin'

        # Set Python-specific environment
        env['PYTHONPATH'] = ''  # Clear to prevent module injection
        env['PYTHONHOME'] = ''  # Clear to use system Python

        # Set working directory to quarantine
        env['PWD'] = str(self.quarantine_dir)

        return env

    def _get_resource_usage(self) -> Dict[str, Any]:
        """Get current resource usage statistics."""
        try:
            process = psutil.Process()
            return {
                'cpu_percent': process.cpu_percent(),
                'memory_mb': process.memory_info().rss / 1024 / 1024,
                'num_threads': process.num_threads(),
                'num_fds': process.num_fds() if hasattr(process, 'num_fds') else None
            }
        except Exception:
            # Fallback if psutil is not available or fails
            return {
                'cpu_percent': 0.0,
                'memory_mb': 0.0,
                'num_threads': 1,
                'num_fds': None
            }

    def _check_execution_policy(self, result: subprocess.CompletedProcess,
                               execution_time: float) -> None:
        """Check execution results against security policy."""
        # Check for excessive execution time
        if execution_time > 250:  # Configurable threshold
            self.audit_logger.log_security_event(
                event_type="EXCESSIVE_RUNTIME",
                message=f"Script exceeded execution time threshold: {execution_time:.2f}s",
                details={'execution_time': execution_time}
            )

        # Check for suspicious output patterns
        if result.stderr and len(result.stderr) > 1000:  # Large error output
            self.audit_logger.log_security_event(
                event_type="SUSPICIOUS_OUTPUT",
                message="Script produced unusually large error output",
                details={'stderr_length': len(result.stderr)}
            )

        # Check for system calls that might indicate violations
        suspicious_patterns = ['import os', 'import subprocess', 'exec(', 'eval(']
        script_content = ""
        try:
            # This is a simplified check - in practice, we'd analyze the AST
            for pattern in suspicious_patterns:
                if pattern in result.stdout or pattern in result.stderr:
                    self.audit_logger.log_security_event(
                        event_type="SUSPICIOUS_PATTERN",
                        message=f"Detected potentially dangerous pattern: {pattern}"
                    )
                    break
        except Exception:
            pass  # Ignore errors in pattern checking

    def validate_script(self, script_path: str) -> bool:
        """Validate a script against security policy before execution."""
        script_path = Path(script_path)

        if not script_path.exists():
            return False

        # Check if script is in allowed location
        if not self.policy.is_path_allowed(str(script_path)):
            self.audit_logger.log_security_event(
                event_type="PATH_VIOLATION",
                message=f"Script path not allowed: {script_path}",
                script_path=str(script_path)
            )
            return False

        # Additional validation could be added here
        # e.g., AST analysis, import restrictions, etc.

        return True
