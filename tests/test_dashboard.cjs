const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {inflateSync} = require('node:zlib');
const html = fs.readFileSync('index.html', 'utf8');
const script = html.split('<script>').pop().split('</script>')[0];
const elements = {
  'weight-date': {value: '2026-11-14'},
  'weight-period': {value: 'pmWeight'},
  'weight-value': {value: '89.60'},
  'weight-feedback': {},
};
let posts = [];
const ctx = vm.createContext({
  console, Blob, Response, CompressionStream, DecompressionStream, TextEncoder, Uint8Array,
  atob, btoa, Map, Date, setTimeout, clearTimeout,
  localStorage: {getItem: () => null, setItem: () => {}},
  window: {addEventListener: () => {}},
  document: {getElementById: id => elements[id]},
  fetch: async (url, options) => {posts.push({url, options}); return {ok: true};},
});
vm.runInContext(script, ctx);
vm.runInContext(`render = () => {}; showStatus = () => {};`, ctx);
(async () => {
  vm.runInContext(`rows = [{date:'2026-11-14', amWeight:89.6, pmWeight:null}];`, ctx);
  await vm.runInContext(`saveWeightEntry({preventDefault(){}})`, ctx);
  assert.equal(vm.runInContext('rows[0].pmWeight', ctx), 89.6);
  assert.match(elements['weight-feedback'].textContent, /已保存并发送云端/);
  elements['weight-date'].value = '2026-01-01';
  await vm.runInContext(`saveWeightEntry({preventDefault(){}})`, ctx);
  assert.match(elements['weight-feedback'].textContent, /尚未建档/);
  elements['weight-date'].value = '2026-11-14';
  elements['weight-value'].value = '0';
  await vm.runInContext(`saveWeightEntry({preventDefault(){}})`, ctx);
  assert.equal(vm.runInContext('rows[0].pmWeight', ctx), 89.6);
  // Failed writes remain dirty, including when the compact fallback accepts its PUT.
  ctx.fetch = async (url, options) => ({ok: options.method === 'PUT'});
  assert.equal(await vm.runInContext('saveLocal()', ctx), false);
  assert.equal(vm.runInContext('localDirty', ctx), true);
  await vm.runInContext('manualSyncButton()', ctx); // Must not GET or replace unsent edits.
  assert.equal(vm.runInContext('rows[0].pmWeight', ctx), 89.6);
  posts = [];
  ctx.fetch = async (url, options) => {assert.equal(options.method, 'POST'); posts.push(options.body); return {ok:true};};
  const payload = {updatedAt:123, rows:Array.from({length:1000},(_,i)=>({date:String(i),notes:'体重记录'+i}))};
  ctx.payload = payload;
  await vm.runInContext('publishState(payload)', ctx);
  assert(posts.every(x => Buffer.byteLength(x) < 4096));
  const chunks = posts.map(JSON.parse);
  const restored = JSON.parse(inflateSync(Buffer.from(chunks.map(x=>x.data).join(''), 'base64')));
  assert.deepEqual(restored, payload);
  assert(chunks.length > 1);
  console.log('PASS: date-specific weight save, validation, failed-sync retention, bounded compression roundtrip');
})().catch(e => {console.error(e); process.exitCode=1;});
