# Peer Review Report

## Metadata
- BIP: BIP-04
- Title: Secure Script Execution Environment
- Implementation PR(s): feature/bip-04-secure-script-execution (branch)
- Reviewer: GPT-5 (Third Peer Reviewer)
- Date: 2025-09-09

## Summary
Scope: validate implementation claims, run secure-execution tests under WSL Ubuntu 24.04, and review documentation alignment. Outcome: Request Changes. Several unit/integration tests fail, resource limits appear applied as unlimited on Linux (RLIM_INFINITY handling), audit logs show JSON parsing warnings, and documentation status is inconsistent.

## Findings by Area
- Correctness:
  - Tests expect `subprocess.run` behavior while the executor uses `subprocess.Popen`. Assertions (stdout/args) mismatch current implementation.
  - `test_resource_usage_collection` calls `_get_resource_usage()` without a PID; implementation requires a PID.
  - One test expects a `TimeoutException`, but executor path did not raise it under current conditions.
- Tests & Coverage:
  - Ran with: `python3 -m unittest discover -s scripts/secure/tests -t .`
  - 31 tests executed; 4 failures, 3 errors observed. Example errors: `ModuleNotFoundError: No module named 'secure'` in `test_critical_fixes.py` (imports `secure.policy` instead of package-relative import).
- Security:
  - Resource limits logged as applied with value `-1` (unlimited) for CPU/memory/file size when system hard limit is RLIM_INFINITY. Current logic sets requested limit to hard limit when requested > hard; on Linux, hard may be `-1` (infinite), causing an unintended unlimited cap.
  - Seccomp not available (acceptable fallback; logged correctly).
  - Network policy enforcement and deny-by-default domain behavior present.
- Performance:
  - Not fully assessed; no regressions measured in this pass.
- Backward Compatibility / Ops:
  - Audit log JSON parsing warnings indicate non-JSON lines or mixed content, reducing reliability of downstream log processing.
- Documentation:
  - `gov/bips/BIP-04/BIP-04.md` shows Status: Draft while README/summary claim “Fully Implemented and Production Ready.” Status should be harmonized per governance.

## Requested Changes
- [ ] Fix resource limit application with RLIM_INFINITY:
      If `current_hard == resource.RLIM_INFINITY`, apply the configured finite limit instead of `-1`.
- [ ] Align tests with executor implementation (or expose a compatible interface):
      Update tests to patch `subprocess.Popen` and validate stdout/args accordingly, or provide an execution helper that preserves prior `subprocess.run` contract for tests.
- [ ] Fix import paths in tests:
      Replace `from secure.policy import SecurityPolicy` with package-relative import (e.g., `from ..policy import SecurityPolicy`) or ensure `PYTHONPATH` contains `scripts` in test runner.
- [ ] Ensure audit logs are strict JSON lines:
      Avoid emitting non-JSON lines into the same file; eliminate mixed formatting that triggers JSON parse errors.
- [ ] Synchronize documentation status across `BIP-04.md`, `README.md`, and summaries per governance.

## Decision
- Decision: Request Changes
- Rationale: Failing tests, incorrect limit handling (potential security gap), audit log parsing warnings, and documentation inconsistency must be addressed to meet quality gates.

## Evidence Links
- Test command (WSL Ubuntu 24.04):
  ```bash
  cd /mnt/f/Node/cmmv-hive && source .venv/bin/activate && python3 -m unittest discover -s scripts/secure/tests -t .
  ```
- Sample failures:
  - `ModuleNotFoundError: No module named 'secure'` (test_critical_fixes.py)
  - Resource limits logged as `-1` (unlimited) for CPU/memory/file size
  - Timeout test not raising `TimeoutException`
  - Audit JSON parse warnings across many lines

## Sign-off
- Reviewer: GPT-5

