import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export async function openBrowser(output) {
  await mkdir(output, {recursive:true});
  const profile=await mkdtemp(join(resolve(output),'chrome-'));
  const chrome=spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new','--no-sandbox','--remote-debugging-port=0','--remote-allow-origins=*',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','about:blank'], {stdio:['ignore','pipe','pipe'],windowsHide:true});
  const endpoint=await new Promise((ok,bad)=>{
    const timer=setTimeout(()=>bad(Error('Chrome startup timeout')),30000);
    chrome.on('error',bad); chrome.stderr.on('data',b=>{const m=b.toString().match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);ok(m[1]);}});
  });
  const ws=new WebSocket(endpoint); await new Promise((ok,bad)=>{ws.onopen=ok;ws.onerror=bad;});
  let n=0; const pending=new Map(),errors=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);if(m.error)p.bad(Error(JSON.stringify(m.error)));else p.ok(m.result);};
  const send=(method,params={},sessionId)=>new Promise((ok,bad)=>{const id=++n,timer=setTimeout(()=>{pending.delete(id);bad(Error(`${method} timed out`));},60000);pending.set(id,{ok,bad,timer});ws.send(JSON.stringify({id,method,params,sessionId}));});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const call=(method,params={})=>send(method,params,sessionId);
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
  const wait=async(expression,label,timeout=30000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{if(await evaluate(expression))return;}catch{}await delay(150);}throw Error(`Timeout: ${label}`);};
  const click=async selector=>{const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control');e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...p});};
  const textClick=async(text,scope='body')=>{await evaluate(`(()=>{document.querySelector('[data-test-click]')?.removeAttribute('data-test-click');const e=[...document.querySelectorAll(${JSON.stringify(scope+' button')})].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!e)throw Error('Missing button: '+${JSON.stringify(text)});e.setAttribute('data-test-click','');})()`);await click('[data-test-click]');};
  const input=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);};
  const shot=async name=>{const r=await call('Page.captureScreenshot',{format:'png'});await writeFile(join(output,`${name}.png`),Buffer.from(r.data,'base64'));};
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Network.setBypassServiceWorker',{bypass:true});
  return {call,send,evaluate,wait,click,textClick,input,shot,errors,delay,close:async()=>{try{await send('Browser.close');}catch{}ws.close();chrome.kill();}};
}
