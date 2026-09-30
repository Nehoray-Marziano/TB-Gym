import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/activatePWAUpdate.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { activatePWAUpdate } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);

class FakeWorker extends EventTarget {
  state = 'installed';
  messages = [];

  postMessage(message) {
    this.messages.push(message);
  }

  transition(state) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

test('asks the waiting worker to activate and waits before completing', async () => {
  const worker = new FakeWorker();
  const registration = { active: null };
  const promise = activatePWAUpdate(worker, registration, new AbortController().signal, 100);
  assert.deepEqual(worker.messages, [{ type: 'SKIP_WAITING' }]);
  worker.transition('activating');
  worker.transition('activated');
  await promise;
});

test('reports activation failure so the UI can offer a retry', async () => {
  const worker = new FakeWorker();
  await assert.rejects(
    activatePWAUpdate(worker, { active: null }, new AbortController().signal, 5),
    /timed out/,
  );
});

test('rejects a worker superseded by another update', async () => {
  const worker = new FakeWorker();
  const promise = activatePWAUpdate(worker, { active: null }, new AbortController().signal, 100);
  worker.transition('redundant');
  await assert.rejects(promise, /redundant/);
});

test('ignores an activation that was cancelled on unmount', async () => {
  const worker = new FakeWorker();
  const abort = new AbortController();
  const promise = activatePWAUpdate(worker, { active: null }, abort.signal, 100);
  abort.abort();
  await assert.rejects(promise, /cancelled/);
});
