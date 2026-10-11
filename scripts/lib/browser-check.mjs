import { spawn } from "node:child_process";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";

export async function warmLocalRoute(baseUrl, route) {
  const url = new URL(route, baseUrl);
  if (!["localhost", "127.0.0.1"].includes(url.hostname))
    throw Error("Browser fixtures require a local server");
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
    await response.text();
    if (response.ok) return;
    if (response.status !== 404)
      throw Error(`Fixture compilation failed: ${response.status}`);
    // The development route watcher may not have discovered a new fixture yet.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw Error(`Fixture route was not discovered: ${url.pathname}`);
}

export async function openBrowser(output) {
  await mkdir(output, { recursive: true });
  const outputRoot = resolve(output);
  const profile = await mkdtemp(join(outputRoot, "chrome-"));
  if (
    dirname(profile) !== outputRoot ||
    !basename(profile).startsWith("chrome-")
  )
    throw Error("Unexpected browser profile path");
  let chrome, ws;
  const cleanProfile = async () => {
    ws?.close();
    chrome?.kill();
    if (chrome?.pid && chrome.exitCode === null && chrome.signalCode === null)
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 3000);
        chrome.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    // Cache deletion must never interrupt the caller's database-fixture cleanup.
    try {
      await rm(profile, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 200,
      });
    } catch (error) {
      console.warn(
        `Browser profile retained after cleanup failure: ${profile} (${error.code})`,
      );
    }
  };
  try {
    chrome = spawn(
      process.env.CHROME_PATH ||
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      [
        "--headless=new",
        "--no-sandbox",
        "--remote-debugging-port=0",
        "--remote-allow-origins=*",
        `--user-data-dir=${profile}`,
        "--no-first-run",
        "--no-default-browser-check",
        "about:blank",
      ],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    const endpoint = await new Promise((ok, bad) => {
      const timer = setTimeout(
        () => bad(Error("Chrome startup timeout")),
        30000,
      );
      chrome.once("error", (error) => {
        clearTimeout(timer);
        bad(error);
      });
      chrome.stderr.on("data", (b) => {
        const m = b.toString().match(/DevTools listening on (ws:\/\/\S+)/);
        if (m) {
          clearTimeout(timer);
          ok(m[1]);
        }
      });
    });
    ws = new WebSocket(endpoint);
    await new Promise((ok, bad) => {
      ws.onopen = ok;
      ws.onerror = bad;
    });
    let n = 0;
    const pending = new Map(),
      errors = [],
      listeners = new Map();
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.method === "Runtime.exceptionThrown")
        errors.push(m.params.exceptionDetails);
      for (const fn of listeners.get(m.method) || [])
        Promise.resolve()
          .then(() => fn(m.params))
          .catch((error) =>
            errors.push({ event: m.method, message: error.message }),
          );
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      clearTimeout(p.timer);
      if (m.error) p.bad(Error(JSON.stringify(m.error)));
      else p.ok(m.result);
    };
    ws.onclose = () => {
      for (const p of pending.values()) {
        clearTimeout(p.timer);
        p.bad(Error("Browser connection closed"));
      }
      pending.clear();
    };
    const send = (method, params = {}, sessionId) => {
      if (ws.readyState !== WebSocket.OPEN)
        return Promise.reject(Error("Browser connection closed"));
      return new Promise((ok, bad) => {
        const id = ++n,
          timer = setTimeout(() => {
            pending.delete(id);
            bad(Error(`${method} timed out`));
          }, 60000);
        pending.set(id, { ok, bad, timer });
        try {
          ws.send(JSON.stringify({ id, method, params, sessionId }));
        } catch (error) {
          clearTimeout(timer);
          pending.delete(id);
          bad(error);
        }
      });
    };
    const { targetId } = await send("Target.createTarget", {
      url: "about:blank",
    });
    const { sessionId } = await send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    const call = (method, params = {}) => send(method, params, sessionId);
    const evaluate = async (expression) => {
      const r = await call("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    const delay = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const wait = async (expression, label, timeout = 30000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        try {
          if (await evaluate(expression)) return;
        } catch {}
        await delay(150);
      }
      throw Error(`Timeout: ${label}`);
    };
    const click = async (selector) => {
      await evaluate(
        `(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control');e.scrollIntoView({block:'center',behavior:'instant'});})()`,
      );
      // Global smooth scrolling can move the target between measuring and clicking.
      await evaluate(
        "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",
      );
      const p = await evaluate(
        `(()=>{const e=document.querySelector(${JSON.stringify(selector)});const r=e.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;const hit=document.elementFromPoint(x,y);if(!hit||!e.contains(hit))throw Error('Control is covered or outside the viewport: '+${JSON.stringify(selector)}+' '+JSON.stringify({x,y,height:innerHeight,hit:hit?.tagName,hitClass:hit?.className}));return{x,y};})()`,
      );
      for (const type of ["mousePressed", "mouseReleased"])
        await call("Input.dispatchMouseEvent", {
          type,
          button: "left",
          clickCount: 1,
          ...p,
        });
    };
    const textClick = async (text, scope = "body") => {
      await evaluate(
        `(()=>{document.querySelector('[data-test-click]')?.removeAttribute('data-test-click');const e=[...document.querySelectorAll(${JSON.stringify(scope + " button")})].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!e)throw Error('Missing button: '+${JSON.stringify(text)});e.setAttribute('data-test-click','');})()`,
      );
      await click("[data-test-click]");
    };
    const input = async (selector, value) => {
      await evaluate(
        `(()=>{const e=document.querySelector(${JSON.stringify(selector)});const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
      );
    };
    const shot = async (name) => {
      const r = await call("Page.captureScreenshot", { format: "png" });
      await writeFile(
        join(output, `${name}.png`),
        Buffer.from(r.data, "base64"),
      );
    };
    await call("Page.enable");
    await call("Runtime.enable");
    await call("Network.enable");
    await call("Network.setBypassServiceWorker", { bypass: true });
    return {
      call,
      send,
      evaluate,
      wait,
      click,
      textClick,
      input,
      shot,
      errors,
      delay,
      on: (event, fn) => {
        listeners.set(event, [...(listeners.get(event) || []), fn]);
      },
      close: async () => {
        try {
          await send("Browser.close");
        } catch {}
        // Reports/screenshots survive; generated test profiles are disposable.
        await cleanProfile();
      },
    };
  } catch (error) {
    await cleanProfile();
    throw error;
  }
}
