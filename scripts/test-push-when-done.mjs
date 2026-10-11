import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { loadModule } from "./lib/notification-test-runtime.mjs";

async function simulate({
  status = " M file.ts",
  counts = "0\t0",
  fail,
  message = "fix: update",
  published = "abc123",
} = {}) {
  const calls = [],
    errors = [];
  const exit = (code) => {
    throw Object.assign(new Error("script exited"), { exitCode: code });
  };
  let failure;
  try {
    await loadModule(
      "scripts/push-when-done.mjs",
      {
        console: { log() {}, error: (...args) => errors.push(args.join(" ")) },
      },
      {
        "node:process": {
          default: {
            execPath: "node",
            argv: ["node", "script", message],
            exit,
          },
        },
        "node:child_process": {
          execFileSync(command, args, options) {
            calls.push({ command, args: [...args], options });
            if (args[0] === fail)
              throw Object.assign(new Error("command failed"), {
                stderr: "simulated failure",
              });
            if (args[0] === "symbolic-ref") return "main";
            if (args[0] === "rev-parse") return "abc123";
            if (args[0] === "rev-list") return counts;
            if (args[0] === "status") return status;
            if (args[0] === "ls-remote") return `${published}\trefs/heads/main`;
            return "";
          },
        },
      },
    );
  } catch (error) {
    failure = error;
  }
  return { calls, errors, failure };
}

test("commit messages remain a single literal argument, with no shell", async () => {
  const message = 'fix: "quoted" `literal` $(literal) & literal\nsecond line';
  const result = await simulate({ message });
  assert.equal(result.failure, undefined);
  assert.deepEqual(result.calls.find(({ args }) => args[0] === "commit").args, [
    "commit",
    "-m",
    message,
  ]);
  assert.ok(result.calls.every(({ options }) => !options.shell));
  assert.ok(
    result.calls.some(
      ({ command, args }) => command === "node" && args[1] === ".",
    ),
  );
  assert.ok(result.calls.some(({ args }) => args[0] === "ls-remote"));
});

test("failed push reports command failure without a ReferenceError", async () => {
  const result = await simulate({ fail: "push" });
  assert.equal(result.failure?.exitCode, 1);
  assert.match(
    result.errors.join("\n"),
    /Command failed: git push[\s\S]*simulated failure/,
  );
  assert.equal(
    result.calls.some(({ args }) => args[0] === "ls-remote"),
    false,
  );
});

test("failed fetch stops before staging", async () => {
  const result = await simulate({ fail: "fetch" });
  assert.equal(result.failure?.exitCode, 1);
  assert.equal(
    result.calls.some(({ args }) => args[0] === "add"),
    false,
  );
});

test("remote commits stop staging and pushing until integrated", async () => {
  const result = await simulate({ counts: "2\t1" });
  assert.equal(result.failure?.exitCode, 1);
  assert.equal(
    result.calls.some(({ args }) => ["add", "push"].includes(args[0])),
    false,
  );
});

test("clean and current branch refreshes origin and exits without a push", async () => {
  const result = await simulate({ status: "" });
  assert.equal(result.failure?.exitCode, 0);
  assert.ok(result.calls.some(({ args }) => args[0] === "fetch"));
  assert.equal(
    result.calls.some(({ args }) => args[0] === "push"),
    false,
  );
});

test("clean branch with unpublished commits still pushes", async () => {
  const result = await simulate({ status: "", counts: "0\t1" });
  assert.equal(result.failure, undefined);
  assert.ok(result.calls.some(({ args }) => args[0] === "push"));
  assert.equal(
    result.calls.some(({ args }) => args[0] === "commit"),
    false,
  );
});

test("remote verification detects a different published commit", async () => {
  const result = await simulate({ published: "different" });
  assert.equal(result.failure?.exitCode, 1);
  assert.match(result.errors.join("\n"), /remote branch changed/);
});

test("legacy HTTP stress predicates consume each response body without undefined names", async () => {
  const source = await readFile("scripts/web-stress-test.mjs", "utf8");
  const ast = ts.createSourceFile(
    "stress.mjs",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const predicates = [];
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === "expected")
      predicates.push(node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.equal(predicates.length, 20);
  for (const predicate of predicates) {
    const evaluate = vm.runInNewContext(`(${predicate.getText(ast)})`);
    for (const text of [
      "",
      "__next-page-redirect /dashboard",
      "__next-page-redirect /auth/login",
    ]) {
      assert.equal(typeof evaluate({ status: 200 }, text), "boolean");
    }
  }
});
