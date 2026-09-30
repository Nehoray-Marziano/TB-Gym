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

class FakeServiceWorkers extends EventTarget {
  controller = null;

  claim(worker) {
    this.controller = worker;
    this.dispatchEvent(new Event('controllerchange'));
  }
}

test('asks the waiting worker to activate and waits until it controls the page', async () => {
  const worker = new FakeWorker();
  const serviceWorkers = new FakeServiceWorkers();
  const promise = activatePWAUpdate(worker, serviceWorkers, new AbortController().signal, 100);
  let completed = false;
  void promise.then(() => { completed = true; });
  assert.deepEqual(worker.messages, [{ type: 'SKIP_WAITING' }]);
  worker.transition('activating');
  worker.transition('activated');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(completed, false, 'activation alone must not reload the page');
  serviceWorkers.claim(worker);
  await promise;
  assert.equal(completed, true);
});

test('reports activation failure so the UI can offer a retry', async () => {
  const worker = new FakeWorker();
  await assert.rejects(
    activatePWAUpdate(worker, new FakeServiceWorkers(), new AbortController().signal, 5),
    /timed out/,
  );
});

test('rejects a worker superseded by another update', async () => {
  const worker = new FakeWorker();
  const promise = activatePWAUpdate(worker, new FakeServiceWorkers(), new AbortController().signal, 100);
  worker.transition('redundant');
  await assert.rejects(promise, /redundant/);
});

test('ignores an activation that was cancelled on unmount', async () => {
  const worker = new FakeWorker();
  const abort = new AbortController();
  const promise = activatePWAUpdate(worker, new FakeServiceWorkers(), abort.signal, 100);
  abort.abort();
  await assert.rejects(promise, /cancelled/);
});
