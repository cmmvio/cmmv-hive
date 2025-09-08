#!/usr/bin/env python3
"""
Test runner for the secure script execution environment.
"""

import unittest
import sys
from pathlib import Path

# Add the secure package to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

def run_tests():
    """Run all unit tests for the secure execution environment."""
    # Discover and run tests
    loader = unittest.TestLoader()
    start_dir = Path(__file__).parent
    suite = loader.discover(start_dir, pattern='test_*.py')

    # Run tests with verbose output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Return appropriate exit code
    return 0 if result.wasSuccessful() else 1

if __name__ == '__main__':
    sys.exit(run_tests())
