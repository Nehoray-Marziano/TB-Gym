#!/usr/bin/env node
/**
 * Usage: node scripts/push-when-done.mjs "commit message"
 * Refreshes origin, checks the branch and lint, commits changes and pushes.
 * Deployment status must be checked separately with the hosting provider.
 */
import { execFileSync } from "node:child_process";
import process from "node:process";

function run(command, args, { optional = false, silent = false } = {}) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: silent ? "pipe" : "inherit",
    })?.trim();
  } catch (error) {
    if (optional) return null;
    console.error(`Command failed: ${command} ${args.join(" ")}`);
    if (error.stdout) console.error(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

const git = (args, options) => run("git", args, options);
const readGit = (args, optional = false) =>
  git(args, { silent: true, optional });
const branch = readGit(["symbolic-ref", "--quiet", "--short", "HEAD"]);
if (!branch) {
  console.error("A checked-out Git branch is required before pushing.");
  process.exit(1);
}

git(["fetch", "origin"]);
const remoteRef = `refs/remotes/origin/${branch}`;
const remoteHead = readGit(["rev-parse", "--verify", remoteRef], true);
let ahead = 0;
if (remoteHead) {
  const [behind, localAhead] = readGit([
    "rev-list",
    "--left-right",
    "--count",
    `${remoteRef}...HEAD`,
  ])
    .split(/\s+/)
    .map(Number);
  if (behind > 0) {
    console.error(
      `origin/${branch} contains ${behind} new commits. Integrate them before pushing.`,
    );
    process.exit(1);
  }
  ahead = localAhead;
}

const status = readGit(["status", "--porcelain"]);
if (!status && remoteHead && ahead === 0) {
  console.log("Working tree is clean and origin is up to date.");
  process.exit(0);
}

if (status) {
  console.log(`Checking changes on ${branch}:\n${status}`);
  run(process.execPath, ["./node_modules/eslint/bin/eslint.js", "."]);
  const message =
    process.argv.slice(2).join(" ").trim() ||
    `chore: update session work [${new Date().toISOString().slice(0, 10)}]`;
  git(["add", "-A"]);
  git(["commit", "-m", message]);
}

git(["push", "origin", `HEAD:refs/heads/${branch}`]);
const localHead = readGit(["rev-parse", "HEAD"]);
const publishedHead = readGit([
  "ls-remote",
  "--exit-code",
  "origin",
  `refs/heads/${branch}`,
]).split(/\s+/)[0];
if (publishedHead !== localHead) {
  console.error(
    "The remote branch changed after pushing; verify its new head before deploying.",
  );
  process.exit(1);
}
console.log(
  `Push verified: origin/${branch} at ${localHead}. Deployment status is checked separately.`,
);
