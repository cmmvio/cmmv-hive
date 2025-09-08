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
        required_sections = ['execution', 'filesystem', 'network', 'monitoring']
        for section in required_sections:
            if section not in self._policy:
                raise PolicyViolationException(f"Missing required section: {section}")

        # Validate execution limits
        exec_config = self._policy['execution']
        if exec_config.get('timeout_seconds', 0) <= 0:
            raise PolicyViolationException("Invalid timeout_seconds value")
        if exec_config.get('cpu_seconds', 0) <= 0:
            raise PolicyViolationException("Invalid cpu_seconds value")
        if exec_config.get('memory_mb', 0) <= 0:
            raise PolicyViolationException("Invalid memory_mb value")

    def get_execution_limits(self) -> Dict[str, Any]:
        """Get execution resource limits."""
        return self._policy['execution'].copy()

    def get_filesystem_policy(self) -> Dict[str, Any]:
        """Get filesystem access policy."""
        return self._policy['filesystem'].copy()

    def get_network_policy(self) -> Dict[str, Any]:
        """Get network access policy."""
        return self._policy['network'].copy()

    def get_monitoring_config(self) -> Dict[str, Any]:
        """Get monitoring configuration."""
        return self._policy['monitoring'].copy()

    def is_path_allowed(self, path: str) -> bool:
        """Check if a filesystem path is allowed."""
        allowed_paths = self._policy['filesystem'].get('allowed_paths', [])
        return any(path.startswith(allowed) for allowed in allowed_paths)

    def is_operation_blocked(self, operation: str) -> bool:
        """Check if a filesystem operation is blocked."""
        blocked_ops = self._policy['filesystem'].get('blocked_operations', [])
        return operation in blocked_ops

    def is_domain_allowed(self, domain: str) -> bool:
        """Check if a network domain is allowed."""
        allowed_domains = self._policy['network'].get('allowed_domains', [])
        return domain in allowed_domains or len(allowed_domains) == 0  # Empty list means all blocked

    def is_port_blocked(self, port: int) -> bool:
        """Check if a network port is blocked."""
        blocked_ports = self._policy['network'].get('blocked_ports', [])
        return port in blocked_ports

    def should_alert(self, metric: str, value: float) -> bool:
        """Check if an alert should be triggered for a metric."""
        thresholds = self._policy['monitoring'].get('alert_thresholds', {})
        threshold = thresholds.get(metric)
        return threshold is not None and value >= threshold
