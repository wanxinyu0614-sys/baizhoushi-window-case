const SERIES_KEY = 'grandma-detective-series-v1';
const MEDIA_BUILD = '20261021-hqpreload1';
const APP_BUILD = '20261021-caption-bottom1';
const secondUrl = './second/index.html?series=1&v=' + APP_BUILD;
const warmedRoutes = new Set();
function warmRouteVideo() {
  if (navigator.connection?.saveData) return;
  const progress = readProgress();
  const source = progress.level1
    ? './second/assets/V01-修复版.mp4?v=' + MEDIA_BUILD
    : './first/assets/video/V01.mp4?v=' + MEDIA_BUILD;
  if (warmedRoutes.has(source)) return;
  warmedRoutes.add(source);
  (progress.level1 ? CaseMedia.prefetch(CaseAssets.secondClips) : CaseMedia.warm(source))
    .catch(() => warmedRoutes.delete(source));
}
function scheduleWarmup() {
  const run = () => warmRouteVideo();
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1200 });
  else setTimeout(run, 500);
}
function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(SERIES_KEY));
    const level1 = value?.level1 === true;
    return { level1, level2: level1 && value?.level2 === true };
  } catch { return { level1: false, level2: false }; }
}
function showProgress() {
  const progress = readProgress();
  const firstState = document.querySelector('#level-one-state');
  const firstLink = document.querySelector('#level-one-link');
  const secondCard = document.querySelector('#level-two');
  const secondState = document.querySelector('#level-two-state');
  const secondLink = document.querySelector('#level-two-link');
  if (progress.level1) {
    firstState.textContent = '已通关';
    firstState.classList.add('done');
    firstLink.textContent = '重玩第一关 →';
    firstLink.href = './first/index.html?series=1&restart=1&v=' + APP_BUILD;
    secondCard.classList.remove('locked');
    secondState.textContent = progress.level2 ? '已通关' : '已解锁';
    secondState.classList.add('done');
    secondLink.href = secondUrl;
    secondLink.removeAttribute('aria-disabled');
    secondLink.innerHTML = progress.level2 ? '重玩第二关 <span aria-hidden="true">→</span>' : '开始第二关 <span aria-hidden="true">→</span>';
  } else {
    firstState.textContent = '待调查';
    firstState.classList.remove('done');
    firstLink.href = './first/index.html?series=1&restart=1&v=' + APP_BUILD;
    firstLink.innerHTML = '开始第一关 <span aria-hidden="true">→</span>';
    secondCard.classList.add('locked');
    secondState.textContent = '待解锁';
    secondState.classList.remove('done');
    secondLink.href = '#level-two';
    secondLink.setAttribute('aria-disabled', 'true');
    secondLink.innerHTML = '通关第一关后解锁 <span aria-hidden="true">⌁</span>';
  }
}
document.querySelector('#level-two-link').addEventListener('click', event => {
  if (event.currentTarget.getAttribute('aria-disabled') === 'true') event.preventDefault();
});
showProgress();
scheduleWarmup();
window.addEventListener('pageshow', () => { showProgress(); scheduleWarmup(); });
