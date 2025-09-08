"""
Security policy management for the secure script execution environment.
"""

import yaml
from pathlib import Path
from typing import Dict, Any, List
from .exceptions import PolicyViolationException

class SecurityPolicy:
    """Manages security policy configuration."""

    def __init__(self, policy_file: str = "scripts/config/security_policy.yml"):
        self.policy_file = Path(policy_file)
        self._policy: Dict[str, Any] = {}
        self._load_policy()

    def _load_policy(self) -> None:
        """Load and validate the security policy from YAML file."""
        try:
            with open(self.policy_file, 'r', encoding='utf-8') as f:
                self._policy = yaml.safe_load(f)
        except FileNotFoundError:
            raise PolicyViolationException(f"Security policy file not found: {self.policy_file}")
        except yaml.YAMLError as e:
            raise PolicyViolationException(f"Invalid YAML in security policy: {e}")

        self._validate_policy()

    def _validate_policy(self) -> None:
        """Validate the loaded security policy."""
        # Handle both flat and nested YAML structures
        if 'security' in self._policy:
            # Nested structure: security: {execution: {...}, ...}
            policy_root = self._policy['security']
        else:
            # Flat structure: execution: {...}, ...
            policy_root = self._policy

        required_sections = ['execution', 'filesystem', 'network', 'monitoring']
        for section in required_sections:
            if section not in policy_root:
                raise PolicyViolationException(f"Missing required section: {section}")

        # Validate execution limits
        exec_config = policy_root['execution']
        if exec_config.get('timeout_seconds', 0) <= 0:
            raise PolicyViolationException("Invalid timeout_seconds value")
        if exec_config.get('cpu_seconds', 0) <= 0:
            raise PolicyViolationException("Invalid cpu_seconds value")
        if exec_config.get('memory_mb', 0) <= 0:
            raise PolicyViolationException("Invalid memory_mb value")

    def _get_policy_root(self) -> Dict[str, Any]:
        """Get the root policy dictionary, handling nested structure."""
        if 'security' in self._policy:
            return self._policy['security']
        return self._policy

    def get_execution_limits(self) -> Dict[str, Any]:
        """Get execution resource limits."""
        return self._get_policy_root()['execution'].copy()

    def get_filesystem_policy(self) -> Dict[str, Any]:
        """Get filesystem access policy."""
        return self._get_policy_root()['filesystem'].copy()

    def get_network_policy(self) -> Dict[str, Any]:
        """Get network access policy."""
        return self._get_policy_root()['network'].copy()

    def get_monitoring_config(self) -> Dict[str, Any]:
        """Get monitoring configuration."""
        return self._get_policy_root()['monitoring'].copy()

    def is_path_allowed(self, path: str) -> bool:
        """Check if a filesystem path is allowed."""
        fs_policy = self.get_filesystem_policy()
        allowed_paths = fs_policy.get('allowed_paths', [])
        return any(path.startswith(allowed) for allowed in allowed_paths)

    def is_operation_blocked(self, operation: str) -> bool:
        """Check if a filesystem operation is blocked."""
        fs_policy = self.get_filesystem_policy()
        blocked_ops = fs_policy.get('blocked_operations', [])
        return operation in blocked_ops

    def is_domain_allowed(self, domain: str) -> bool:
        """Check if a network domain is allowed."""
        net_policy = self.get_network_policy()
        allowed_domains = net_policy.get('allowed_domains', [])
        return domain in allowed_domains or len(allowed_domains) == 0  # Empty list means all blocked

    def is_port_blocked(self, port: int) -> bool:
        """Check if a network port is blocked."""
        net_policy = self.get_network_policy()
        blocked_ports = net_policy.get('blocked_ports', [])
        return port in blocked_ports

    def should_alert(self, metric: str, value: float) -> bool:
        """Check if an alert should be triggered for a metric."""
        monitoring_config = self.get_monitoring_config()
        thresholds = monitoring_config.get('alert_thresholds', {})
        threshold = thresholds.get(metric)
        return threshold is not None and value >= threshold
