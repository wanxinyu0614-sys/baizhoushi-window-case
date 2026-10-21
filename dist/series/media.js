/* Complete-file preparation: playback uses a local blob, never a second streaming request. */
window.CaseMedia = (() => {
  const pending = new Map(), ready = new Map(), listeners = new Map();
  const cacheName = 'grandma-complete-media-v1';
  function report(key, progress) { for (const fn of listeners.get(key) || []) fn(progress); }
  async function blob(source, onProgress) {
    const key = new URL(source, location.href).href;
    if (onProgress) { if (!listeners.has(key)) listeners.set(key, new Set()); listeners.get(key).add(onProgress); }
    try {
      if (ready.has(key)) { onProgress?.(1); return ready.get(key).blob; }
      if (!pending.has(key)) pending.set(key, (async () => {
        let cache; try { cache = await caches.open(cacheName); } catch {}
        let response = await cache?.match(key);
        const cached = Boolean(response);
        const controller = new AbortController();
        let timer;
        const refreshTimeout = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), 30000); };
        if (!response) { refreshTimeout(); response = await fetch(key, { cache: 'default', signal: controller.signal }).catch(error => { clearTimeout(timer); throw error; }); }
        if (!response.ok || response.status === 206) { clearTimeout(timer); throw Error('素材未完整下载'); }
        const length = Number(response.headers.get('content-length'));
        let data;
        if (response.body?.getReader) {
          const reader = response.body.getReader(), chunks = []; let received = 0;
          while (true) {
            let chunk;
            try { chunk = await reader.read(); } catch (error) { clearTimeout(timer); throw error; }
            const { done, value } = chunk; if (done) break;
            if (!cached) refreshTimeout();
            chunks.push(value); received += value.byteLength;
            report(key, length ? Math.min(.99, received / length) : null);
          }
          clearTimeout(timer);
          data = new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
          if (length && data.size !== length) throw Error('素材下载不完整，请重试');
        } else { try { data = await response.blob(); } finally { clearTimeout(timer); } }
        if (!data.size) throw Error('素材为空');
        ready.set(key, { blob: data, url: URL.createObjectURL(data) });
        report(key, 1);
        if (!cached && cache) await cache.put(key, new Response(data, { headers: { 'Content-Type': data.type, 'Content-Length': String(data.size) } })).catch(() => {});
        return data;
      })().finally(() => pending.delete(key)));
      return await pending.get(key);
    } finally { if (onProgress) listeners.get(key)?.delete(onProgress); }
  }
  async function url(source, onProgress) { await blob(source, onProgress); return ready.get(new URL(source, location.href).href).url; }
  function warm(source) { return blob(source).catch(() => null); }
  async function prefetch(sources, onProgress) {
    const unique=[...new Set(sources)],failed=[];let completed=0;
    for(const source of unique){try{await blob(source);completed++}catch{failed.push(source)}onProgress?.({completed,total:unique.length,failed:failed.length});}
    return {completed,total:unique.length,failed};
  }
  function progressText(value) { return value == null ? '正在准备剧情…' : value >= 1 ? '剧情已准备好' : `正在准备剧情 ${Math.round(value * 100)}%`; }
  return { blob, url, warm, prefetch, progressText };
})();
