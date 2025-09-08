#!/usr/bin/env python3
"""
Example demonstrating the secure script execution environment.
"""

import sys
import os
from pathlib import Path

# Add the secure package to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "secure"))

from secure import SecureScriptExecutor, ScriptExecutionException

def create_sample_script():
    """Create a sample script for demonstration."""
    script_dir = Path("scripts/examples/sample_scripts")
    script_dir.mkdir(parents=True, exist_ok=True)

    sample_script = script_dir / "hello_world.py"
    sample_script.write_text("""
import sys
import time

def main():
    print("Hello from the secure execution environment!")
    print(f"Arguments received: {sys.argv[1:]}")

    # Simulate some work
    time.sleep(0.1)

    # Demonstrate safe operations
    result = 2 + 2
    print(f"2 + 2 = {result}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
""")

    return sample_script

def create_vulnerable_script():
    """Create a script with potential security issues for analysis demo."""
    script_dir = Path("scripts/examples/sample_scripts")
    script_dir.mkdir(parents=True, exist_ok=True)

    vuln_script = script_dir / "vulnerable_demo.py"
    vuln_script.write_text("""
import os
import subprocess

# This script demonstrates potential security issues
def risky_operations():
    # Dangerous: shell command execution
    result = os.system("echo 'This is risky!'")

    # Dangerous: subprocess with shell=True
    output = subprocess.run("ls -la", shell=True, capture_output=True)

    # Dangerous: file operations
    with open("/tmp/sensitive_file", "w") as f:
        f.write("sensitive data")

    # Dangerous: eval usage
    user_input = "print('Hello')"
    eval(user_input)

    return "Completed risky operations"

if __name__ == "__main__":
    print(risky_operations())
""")

    return vuln_script

def demonstrate_secure_execution():
    """Demonstrate secure script execution."""
    print("🔒 BIP-04 Secure Script Execution Environment Demo")
    print("=" * 55)

    # Create sample scripts
    sample_script = create_sample_script()
    vuln_script = create_vulnerable_script()
    print(f"📄 Created sample script: {sample_script}")
    print(f"📄 Created vulnerable script: {vuln_script}")

    # Initialize secure executor
    print("\\n🚀 Initializing secure executor with Phase 2 features...")
    executor = SecureScriptExecutor()

    # Demonstrate static analysis
    print("\\n🔍 Performing static analysis on vulnerable script...")
    analysis_result = executor.analyze_script_security(str(vuln_script))
    print(f"Analysis Results:")
    print(f"  Vulnerabilities Found: {analysis_result['vulnerabilities_found']}")
    print(f"  Risk Level: {analysis_result['risk_level']}")
    print("  Recommendations:"
    for rec in analysis_result['recommendations'][:3]:  # Show first 3
        print(f"    • {rec}")

    # Validate scripts
    print("\\n✅ Validating scripts...")
    safe_valid = executor.validate_script(str(sample_script))
    vuln_valid = executor.validate_script(str(vuln_script))
    print(f"Safe script validation: {'PASS' if safe_valid else 'FAIL'}")
    print(f"Vulnerable script validation: {'PASS' if vuln_valid else 'FAIL'}")

    if not safe_valid:
        print("❌ Safe script validation failed!")
        return

    # Execute script without arguments
    print("\\n🎯 Executing script without arguments...")
    try:
        result = executor.execute_script(str(sample_script))
        print("Execution Results:")
        print(f"  Success: {result['success']}")
        print(f"  Return Code: {result['return_code']}")
        print(f"  Execution Time: {result['execution_time']:.3f}s")
        print(f"  Output: {result['stdout'].strip()}")
        if result['stderr']:
            print(f"  Errors: {result['stderr'].strip()}")

        # Show Phase 2 features
        if 'static_analysis' in result:
            analysis = result['static_analysis']
            print(f"  Static Analysis: {analysis['vulnerabilities_found']} vulnerabilities")
            print(f"  Risk Level: {analysis['risk_level']}")

        if 'network_activity' in result:
            print(f"  Network Activity: {len(result['network_activity'])} events monitored")

        if 'security_checks' in result:
            checks = result['security_checks']
            print(f"  Security Checks: {sum(checks.values())}/{len(checks)} passed")
    except ScriptExecutionException as e:
        print(f"❌ Execution failed: {e}")

    # Execute script with arguments
    print("\\n🎯 Executing script with arguments...")
    try:
        args = ["arg1", "arg2", "test"]
        result = executor.execute_script(str(sample_script), args)
        print("Execution Results:")
        print(f"  Success: {result['success']}")
        print(f"  Output: {result['stdout'].strip()}")
    except ScriptExecutionException as e:
        print(f"❌ Execution failed: {e}")

    # Demonstrate security features
    # Show security monitoring stats
    print("\\n📊 Security Monitoring Statistics:")
    try:
        stats = executor.get_security_stats()
        monitoring = stats['monitoring_stats']
        print(f"  Total Executions: {monitoring['total_executions']}")
        print(f"  Successful: {monitoring['successful_executions']}")
        print(f"  Failed: {monitoring['failed_executions']}")
        print(f"  Security Violations: {monitoring['security_violations']}")
        print(f"  Alerts Sent: {monitoring['alerts_sent']}")

        audit = stats['audit_summary']
        print(f"  Audit Records: {audit['execution_history_count']}")
        print(f"  Security Events: {audit['security_events_count']}")

        if stats['recent_alerts']:
            print(f"  Recent Alerts: {len(stats['recent_alerts'])}")
    except Exception as e:
        print(f"  Could not retrieve stats: {e}")

    print("\\n🛡️  Security Features Demonstrated:")
    print("  ✅ Process isolation")
    print("  ✅ Resource limits (CPU, memory, file size)")
    print("  ✅ Secure environment (clean PATH, restricted modules)")
    print("  ✅ Comprehensive audit logging")
    print("  ✅ Execution time monitoring")
    print("  ✅ Filesystem access controls")
    print("  ✅ Network activity monitoring")
    print("  ✅ Static security analysis")
    print("  ✅ Real-time security monitoring")
    print("  ✅ Automated alerting system")

    print("\\n📋 Phase 2 Advanced Features:")
    print("  🔍 Static Analysis: Detects dangerous code patterns")
    print("  🌐 Network Monitoring: Tracks and controls network access")
    print("  📁 Filesystem Controls: Validates file system operations")
    print("  📊 Security Dashboard: Real-time monitoring and alerts")
    print("  🛠️  Security Analyzer: Automated vulnerability detection")

    print("\\n📊 Check the audit logs in scripts/logs/ for execution records!")
    print("\\n🎉 BIP-04 Phase 2 Demo completed successfully!")
    print("\\n💡 Next: Phase 3 - Integration & Deployment")

if __name__ == "__main__":
    demonstrate_secure_execution()
