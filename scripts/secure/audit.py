"""
Audit logging system for the secure script execution environment.
"""

import json
import hashlib
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
import subprocess

class AuditLogger:
    """Comprehensive audit logging for script execution."""

    def __init__(self, log_dir: str = "scripts/logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        self.execution_log = self.log_dir / "execution_audit.log"
        self.security_log = self.log_dir / "security_events.log"

        # Set up logging
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)

        # Execution audit handler
        exec_handler = logging.FileHandler(self.execution_log, encoding='utf-8')
        exec_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(exec_handler)

        # Security events handler
        sec_handler = logging.FileHandler(self.security_log, encoding='utf-8')
        sec_handler.setFormatter(logging.Formatter(
            '%(asctime)s - SECURITY - %(message)s'
        ))
        self.logger.addHandler(sec_handler)

    def log_execution(self, script_path: str, args: Optional[List[str]] = None,
                     result: subprocess.CompletedProcess = None,
                     execution_time: float = 0.0, success: bool = False,
                     resource_usage: Optional[Dict[str, Any]] = None) -> None:
        """Log script execution details."""

        # Calculate script hash for integrity verification
        script_hash = self._calculate_file_hash(script_path)

        # Prepare execution record
        execution_record = {
            'timestamp': datetime.utcnow().isoformat(),
            'script_path': script_path,
            'script_hash': script_hash,
            'args': args or [],
            'return_code': result.returncode if result else None,
            'stdout_hash': self._hash_content(result.stdout) if result and result.stdout else None,
            'stderr_hash': self._hash_content(result.stderr) if result and result.stderr else None,
            'execution_time': execution_time,
            'success': success,
            'resource_usage': resource_usage or {}
        }

        # Write to execution audit log
        with open(self.execution_log, 'a', encoding='utf-8') as f:
            json.dump(execution_record, f, ensure_ascii=False)
            f.write('\n')

        # Log to standard logger as well
        status = "SUCCESS" if success else "FAILED"
        self.logger.info(
            f"Script execution: {script_path} | Status: {status} | "
            f"Time: {execution_time:.2f}s | Hash: {script_hash[:8]}..."
        )

        # Alert on security issues
        if not success or execution_time > 250:  # Configurable threshold
            self._send_security_alert(execution_record)

    def log_security_event(self, event_type: str, message: str,
                          script_path: Optional[str] = None,
                          details: Optional[Dict[str, Any]] = None) -> None:
        """Log security-related events."""

        event_record = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'message': message,
            'script_path': script_path,
            'details': details or {}
        }

        # Write to security events log
        with open(self.security_log, 'a', encoding='utf-8') as f:
            json.dump(event_record, f, ensure_ascii=False)
            f.write('\n')

        # Log as security event
        self.logger.warning(
            f"Security Event [{event_type}]: {message} | Script: {script_path or 'N/A'}"
        )

    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA256 hash of script file."""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()
        except (FileNotFoundError, IOError):
            return "FILE_NOT_ACCESSIBLE"

    def _hash_content(self, content: str) -> str:
        """Calculate SHA256 hash of content string."""
        if content:
            return hashlib.sha256(content.encode('utf-8')).hexdigest()
        return None

    def _send_security_alert(self, execution_record: Dict[str, Any]) -> None:
        """Send security alert for concerning execution."""
        alert_message = (
            f"Security Alert: Script execution anomaly | "
            f"Script: {execution_record['script_path']} | "
            f"Time: {execution_record['execution_time']:.2f}s | "
            f"Success: {execution_record['success']}"
        )

        self.log_security_event(
            event_type="EXECUTION_ANOMALY",
            message=alert_message,
            script_path=execution_record['script_path'],
            details={
                'execution_time': execution_record['execution_time'],
                'return_code': execution_record['return_code'],
                'resource_usage': execution_record['resource_usage']
            }
        )

    def get_execution_history(self, script_path: Optional[str] = None,
                            limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve execution history, optionally filtered by script."""
        executions = []

        try:
            if not self.execution_log.exists():
                return executions

            with open(self.execution_log, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        record = json.loads(line)
                        if script_path is None or record.get('script_path') == script_path:
                            executions.append(record)
                            if len(executions) >= limit:
                                break
                    except json.JSONDecodeError as e:
                        # Log the error but continue processing other lines
                        print(f"Warning: Failed to parse JSON at line {line_num}: {e}")
                        continue

        except (FileNotFoundError, IOError):
            # File doesn't exist or can't be read
            pass

        return executions

    def get_security_events(self, event_type: Optional[str] = None,
                          limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve security events, optionally filtered by type."""
        events = []

        try:
            if not self.security_log.exists():
                return events

            with open(self.security_log, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        record = json.loads(line)
                        if event_type is None or record.get('event_type') == event_type:
                            events.append(record)
                            if len(events) >= limit:
                                break
                    except json.JSONDecodeError as e:
                        # Log the error but continue processing other lines
                        print(f"Warning: Failed to parse JSON at line {line_num}: {e}")
                        continue

        except (FileNotFoundError, IOError):
            # File doesn't exist or can't be read
            pass

        return events
