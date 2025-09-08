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

def demonstrate_secure_execution():
    """Demonstrate secure script execution."""
    print("🔒 BIP-04 Secure Script Execution Environment Demo")
    print("=" * 55)

    # Create sample script
    sample_script = create_sample_script()
    print(f"📄 Created sample script: {sample_script}")

    # Initialize secure executor
    print("🚀 Initializing secure executor...")
    executor = SecureScriptExecutor()

    # Validate script
    print("✅ Validating script...")
    is_valid = executor.validate_script(str(sample_script))
    print(f"Script validation: {'PASS' if is_valid else 'FAIL'}")

    if not is_valid:
        print("❌ Script validation failed!")
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
    print("\\n🛡️  Security Features Demonstrated:")
    print("  ✅ Process isolation")
    print("  ✅ Resource limits (CPU, memory, file size)")
    print("  ✅ Secure environment (clean PATH, restricted modules)")
    print("  ✅ Comprehensive audit logging")
    print("  ✅ Execution time monitoring")

    print("\\n📊 Check the audit logs in scripts/logs/ for execution records!")
    print("\\n🎉 Demo completed successfully!")

if __name__ == "__main__":
    demonstrate_secure_execution()
