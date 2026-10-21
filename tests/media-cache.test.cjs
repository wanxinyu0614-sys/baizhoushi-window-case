const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../dist/series/media.js'), 'utf8');
function page(fetch, storage = new Map()) {
  const cache = { match: async key => storage.get(key)?.clone(), put: async (key, response) => storage.set(key, response) };
  const scope = {window:{},location:{href:'https://demo.example/series/'},caches:{open:async()=>cache},fetch,URL,Blob,Response,AbortController,setTimeout,clearTimeout};
  vm.runInNewContext(source,scope);
  return scope.window.CaseMedia;
}
test('one complete download supplies concurrent preparation and local playback', async () => {
  let requests = 0;
  const media = page(async () => { requests++; return new Response('full-video-data',{headers:{'Content-Type':'video/mp4','Content-Length':'15'}}); });
  const [data,url] = await Promise.all([media.blob('./clip.mp4'),media.url('./clip.mp4')]);
  assert.equal(await data.text(),'full-video-data');
  assert.ok(url.startsWith('blob:'));
  assert.equal(requests,1);
  assert.equal(await (await fetch(url)).text(),'full-video-data');
  await media.warm('./clip.mp4');assert.equal(requests,1);
});
test('a new page uses the complete persistent cache without redownloading', async () => {
  const storage = new Map(); let requests = 0;
  const load = async () => {requests++;return new Response('saved',{headers:{'Content-Type':'video/mp4'}})};
  await page(load,storage).warm('./clip.mp4');
  const nextPage = page(load,storage);
  assert.equal(await (await nextPage.blob('./clip.mp4')).text(),'saved');
  assert.equal(requests,1);
});
test('a partial response is rejected and can be retried as a full download', async () => {
  let requests=0;
  const media=page(async()=>++requests===1?new Response('partial',{status:206}):new Response('complete'));
  await assert.rejects(media.url('./clip.mp4'));
  assert.equal(await (await media.blob('./clip.mp4')).text(),'complete');
  assert.equal(requests,2);
});
test('a truncated download is never marked as ready', async () => {
  const media=page(async()=>new Response('short',{headers:{'Content-Length':'99'}}));
  await assert.rejects(media.url('./clip.mp4'),/下载不完整/);
});
