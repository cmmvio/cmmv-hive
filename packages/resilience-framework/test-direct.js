#!/usr/bin/env node

/**
 * Direct test runner for resilience-framework
 * Bypasses build step to test TypeScript code directly
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  console.log('🚀 Running resilience-framework tests directly...\n');

  // Run vitest directly on TypeScript files
  const result = execSync('npx vitest run --reporter=verbose', {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--loader=tsx' }
  });

  console.log('\n✅ All tests passed!');

} catch (error) {
  console.error('\n❌ Tests failed:', error.message);
  process.exit(1);
}
