/* One canonical list is shared by first-chapter warming and second-chapter playback. */
window.CaseAssets = (() => {
  const base = new URL('./', document.currentScript.src);
  const media = path => new URL(path + '?v=20261021-hqpreload1', base).href;
  const secondClips = [
    'second/assets/V01-修复版.mp4', 'second/assets/V02-新台词成片.mp4',
    ...[3,4,5,6,7,8,9].map(n => `second/视频/v${n}.mp4`)
  ].map(media);
  return { secondClips };
})();
