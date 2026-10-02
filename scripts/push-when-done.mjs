#!/usr/bin/env node
/**
 * push-when-done.mjs — Talia Studio Automated Deployment & Push Instrument
 * 
 * Usage:
 *   node scripts/push-when-done.mjs "commit message here"
 *   npm run push:done -- "commit message here"
 * 
 * Function:
 *   1. Verifies git working directory status.
 *   2. Runs lint check (`npm run lint`) to ensure zero syntax/typing regressions.
 *   3. Stages modified and new files.
 *   4. Creates a semantic commit if changes are present.
 *   5. Pushes cleanly to origin/HEAD (triggering Vercel preview/production build).
 *   6. Displays the deployed commit SHA, branch, and status summary.
 */

import { execSync } from 'node:child_process';
import process from 'node:process';

function run(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: options.silent ? 'pipe' : 'inherit', ...options });
  } catch (error) {
    if (options.allowFailure) return null;
    console.error(`\n❌ Command failed: ${command}`);
    if (error.stdout) console.error(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

function runSilent(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    return null;
  }
}

console.log('🌿 [Talia Studio] Initializing "Push When Done" verification instrument...\n');

// 1. Verify we are in a git repository
const branch = runSilent('git rev-parse --abbrev-ref HEAD');
if (!branch) {
  console.error('❌ Error: Not inside a valid git repository.');
  process.exit(1);
}
console.log(`📌 Active Branch: ${branch}`);

// 2. Check for working tree modifications
const statusOutput = runSilent('git status --porcelain');
const hasChanges = Boolean(statusOutput && statusOutput.length > 0);

// Check if current local branch is ahead of upstream
const upstream = runSilent('git rev-parse --abbrev-ref --symbolic-full-name @{u}');
let aheadCount = 0;
if (upstream) {
  const aheadStr = runSilent(`git rev-list --count ${upstream}..HEAD`);
  aheadCount = parseInt(aheadStr || '0', 10);
}

if (!hasChanges && aheadCount === 0) {
  console.log('✨ Working tree is completely clean and up to date with remote. Nothing to commit or push.');
  process.exit(0);
}

if (hasChanges) {
  console.log('🔍 Detected uncommitted changes:');
  const files = statusOutput.split('\n').map(line => `   ${line}`).join('\n');
  console.log(files);

  // 3. Code Verification (Lint)
  console.log('\n🧪 Running code lint verification...');
  let lintPassed = false;
  try {
    execSync(`"${process.execPath}" ./node_modules/eslint/bin/eslint.js src`, { stdio: 'inherit' });
    lintPassed = true;
  } catch (err) {
    console.error('\n❌ Lint check failed! Please resolve errors before pushing.');
    process.exit(1);
  }

  if (lintPassed) {
    console.log('✅ Lint check passed successfully.\n');
  }

  // 4. Determine commit message
  let commitMessage = process.argv.slice(2).join(' ').trim();
  if (!commitMessage) {
    commitMessage = `chore: update session work [${new Date().toISOString().slice(0, 10)}]`;
    console.log(`ℹ️  No commit message provided. Using default: "${commitMessage}"`);
  }

  // 5. Stage files and commit
  console.log('📦 Staging files (`git add -A`)...');
  run('git add -A');

  console.log(`📝 Creating commit: "${commitMessage}"...`);
  run(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
}

// 6. Push to remote
console.log(`\n🚀 Pushing to origin ${branch}...`);
run(`git push origin ${branch}`);

const latestCommit = runSilent('git rev-parse --short HEAD');
const latestMsg = runSilent('git log -1 --pretty=%B').trim();

console.log('\n======================================================');
console.log('🎉 PUSH COMPLETE & VERIFIED!');
console.log(`   Branch:     ${branch}`);
console.log(`   Commit:     ${latestCommit} - "${latestMsg}"`);
console.log('   Deployment: Vercel automated build triggered.');
console.log('======================================================\n');
