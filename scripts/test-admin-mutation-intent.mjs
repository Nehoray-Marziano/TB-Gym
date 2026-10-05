import test from 'node:test';
import assert from 'node:assert/strict';
const entries=new Map();
globalThis.sessionStorage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
const {getAdminMutationRequestId:getId,completeAdminMutationIntent:complete}=await import('../src/lib/adminMutationIntent.ts');

test('An unresolved grant survives retries and a module reload',async()=>{
 const payload={p_user_id:'member',p_quantity:4};
 const id=await getId('grant','actor-a',payload);
 assert.equal(await getId('grant','actor-a',payload),id);
 const reloaded=await import('../src/lib/adminMutationIntent.ts?reload');
 assert.equal(await reloaded.getAdminMutationRequestId('grant','actor-a',payload),id);
 assert(![...entries.values()].some(v=>v.includes('member')||v.includes('p_quantity')));
});
test('Acknowledgment permits a second intentional identical action',async()=>{
 const payload={p_quantity:8},id=await getId('grant','actor-b',payload);
 complete('grant','actor-b',id);
 assert.notEqual(await getId('grant','actor-b',payload),id);
});
test('Changing form data, actor, or operation creates a new intent',async()=>{
 const id=await getId('grant','actor-c',{quantity:4});
 assert.notEqual(await getId('grant','actor-c',{quantity:8}),id);
 assert.notEqual(await getId('grant','actor-d',{quantity:4}),id);
 assert.notEqual(await getId('create','actor-c',{quantity:4}),id);
});
test('An old acknowledgment cannot clear a newer edited intent',async()=>{
 const old=await getId('grant','actor-e',{quantity:4}),next=await getId('grant','actor-e',{quantity:8});
 complete('grant','actor-e',old);
 assert.equal(await getId('grant','actor-e',{quantity:8}),next);
});
test('Blocked or corrupt storage preserves safe in-memory retries',async()=>{
 entries.set('tb-gym:admin-mutation:actor-f:grant','invalid json');
 const id=await getId('grant','actor-f',{quantity:4});
 assert.equal(await getId('grant','actor-f',{quantity:4}),id);
 const storage=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');},removeItem:()=>{throw Error('blocked');}};
 try {
  const blocked=await getId('create','actor-g',{title:'lesson'});
  assert.equal(await getId('create','actor-g',{title:'lesson'}),blocked);
  complete('create','actor-g',blocked);
  assert.notEqual(await getId('create','actor-g',{title:'lesson'}),blocked);
 } finally {globalThis.sessionStorage=storage;}
});
