#!/usr/bin/env node

/**
 * End-to-End Test Script for Git-2-Jira-Dev-Pulse v2.0
 * Tests backend API and frontend availability
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:5175';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed) {
  const status = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`  ${status} ${name}`, color);
  return passed;
}

async function testBackendHealth() {
  log('\n📡 Testing Backend API...', 'cyan');

  try {
    const { stdout } = await execAsync(`curl -s ${BACKEND_URL}/api/health`);
    const health = JSON.parse(stdout);

    const tests = [
      logTest('Backend is reachable', true),
      logTest('Health status is ok', health.status === 'ok'),
      logTest('Jira connection exists', health.jira !== undefined),
      logTest('Jira is connected', health.jira?.connected === true),
    ];

    return tests.every(t => t);
  } catch (error) {
    logTest('Backend health check', false);
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

async function testConfigurationAPI() {
  log('\n⚙️  Testing Configuration API...', 'cyan');

  try {
    const { stdout } = await execAsync(`curl -s ${BACKEND_URL}/api/config/`);
    const config = JSON.parse(stdout);

    const tests = [
      logTest('Config API is reachable', true),
      logTest('Config has version', config.version !== undefined),
      logTest('Config has scan_directories', Array.isArray(config.scan_directories)),
      logTest('Config has auto_discovery', config.auto_discovery !== undefined),
      logTest('Config has UI preferences', config.ui !== undefined),
      logTest('Config has performance settings', config.performance !== undefined),
    ];

    return tests.every(t => t);
  } catch (error) {
    logTest('Configuration API', false);
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

async function testAutoDiscoveryAPI() {
  log('\n🔍 Testing Auto-Discovery API...', 'cyan');

  try {
    const { stdout } = await execAsync(`curl -s ${BACKEND_URL}/api/config/auto-discovery/status`);
    const status = JSON.parse(stdout);

    const tests = [
      logTest('Auto-discovery status API is reachable', true),
      logTest('Status has running field', status.running !== undefined),
      logTest('Status has enabled field', status.enabled !== undefined),
      logTest('Status has watch_paths', Array.isArray(status.watch_paths)),
      logTest('Status has scan_interval_seconds', typeof status.scan_interval_seconds === 'number'),
      logTest('Status has discovered_count', typeof status.discovered_count === 'number'),
    ];

    return tests.every(t => t);
  } catch (error) {
    logTest('Auto-discovery API', false);
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

async function testFoldersAPI() {
  log('\n📁 Testing Folders API...', 'cyan');

  try {
    const { stdout } = await execAsync(`curl -s ${BACKEND_URL}/api/folders/`);
    const folders = JSON.parse(stdout);

    const tests = [
      logTest('Folders API is reachable', true),
      logTest('Response is an array', Array.isArray(folders)),
      logTest('Has at least one repository', folders.length > 0),
    ];

    if (folders.length > 0) {
      const repo = folders[0];
      tests.push(
        logTest('Repo has name', repo.name !== undefined),
        logTest('Repo has path', repo.path !== undefined),
        logTest('Repo has current_branch', repo.current_branch !== undefined),
        logTest('Repo has status', repo.status !== undefined)
      );
    }

    return tests.every(t => t);
  } catch (error) {
    logTest('Folders API', false);
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

async function testFrontend() {
  log('\n🌐 Testing Frontend...', 'cyan');

  try {
    const { stdout } = await execAsync(`curl -s ${FRONTEND_URL}`);

    const tests = [
      logTest('Frontend is reachable', true),
      logTest('HTML contains root div', stdout.includes('<div id="root">')),
      logTest('HTML loads React', stdout.includes('react')),
      logTest('HTML loads main.tsx', stdout.includes('/src/main.tsx')),
      logTest('HTML has proper doctype', stdout.includes('<!doctype html>')),
    ];

    return tests.every(t => t);
  } catch (error) {
    logTest('Frontend', false);
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

async function testFrontendAssets() {
  log('\n🎨 Testing Frontend Assets...', 'cyan');

  const assets = [
    '/src/main.tsx',
    '/src/App.tsx',
    '/src/styles/glassmorphism.css',
    '/src/components/GlassCard/GlassCard.tsx',
    '/src/components/CustomIcons/index.tsx',
    '/src/pages/SettingsPage.tsx',
  ];

  const tests = [];
  for (const asset of assets) {
    try {
      await execAsync(`curl -s -o /dev/null -w "%{http_code}" ${FRONTEND_URL}${asset}`);
      tests.push(logTest(`Asset available: ${asset}`, true));
    } catch {
      tests.push(logTest(`Asset available: ${asset}`, false));
    }
  }

  return tests.every(t => t);
}

async function runAllTests() {
  log('╔════════════════════════════════════════════════╗', 'blue');
  log('║  Git-2-Jira-Dev-Pulse v2.0 E2E Test Suite     ║', 'blue');
  log('╚════════════════════════════════════════════════╝', 'blue');

  const results = {
    backendHealth: await testBackendHealth(),
    configAPI: await testConfigurationAPI(),
    autoDiscoveryAPI: await testAutoDiscoveryAPI(),
    foldersAPI: await testFoldersAPI(),
    frontend: await testFrontend(),
    frontendAssets: await testFrontendAssets(),
  };

  const allPassed = Object.values(results).every(r => r);

  log('\n' + '═'.repeat(50), 'blue');
  log('📊 Test Summary', 'cyan');
  log('═'.repeat(50), 'blue');

  for (const [name, passed] of Object.entries(results)) {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? 'green' : 'red';
    log(`  ${status.padEnd(8)} ${name}`, color);
  }

  log('═'.repeat(50), 'blue');

  if (allPassed) {
    log('\n🎉 All tests passed! Application is healthy.', 'green');
    log('\n🚀 You can now:', 'cyan');
    log(`   - Open ${FRONTEND_URL} in your browser`, 'cyan');
    log('   - Navigate to Settings to configure directories', 'cyan');
    log('   - Try the glassmorphic theme', 'cyan');
    log('   - Test auto-discovery by creating a new repo', 'cyan');
    process.exit(0);
  } else {
    log('\n❌ Some tests failed. Please check the errors above.', 'red');
    log('\n💡 Troubleshooting:', 'yellow');
    log('   1. Ensure both backend and frontend are running', 'yellow');
    log('   2. Check for errors in the console logs', 'yellow');
    log('   3. Try restarting the servers: make all', 'yellow');
    log('   4. Check VERIFICATION.md for detailed test procedures', 'yellow');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
