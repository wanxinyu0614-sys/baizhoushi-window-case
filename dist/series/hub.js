const SERIES_KEY = 'grandma-detective-series-v1';
const secondUrl = './second/index.html?series=1&v=20261021-mobile1';
function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(SERIES_KEY));
    const level1 = value?.level1 === true;
    return { level1, level2: level1 && value?.level2 === true };
  } catch { return { level1: false, level2: false }; }
}
function showProgress() {
  const progress = readProgress();
  const count = Number(progress.level1) + Number(progress.level2);
  document.querySelector('#progress-count').textContent = `${count} / 2 关`;
  document.querySelector('#progress-fill').style.width = `${count * 50}%`;
  document.querySelector('#progress-message').textContent = count === 2
    ? '两件事都查明白了。停手、脱离控制、走原渠道核实。'
    : progress.level1 ? '第一关已结案。第二关已解锁，去查陈阿姨的手机。'
    : '先从第一关开始，帮何叔停下可疑转账。';

  const firstState = document.querySelector('#level-one-state');
  const firstLink = document.querySelector('#level-one-link');
  const secondCard = document.querySelector('#level-two');
  const secondState = document.querySelector('#level-two-state');
  const secondLink = document.querySelector('#level-two-link');
  document.querySelector('#reset-progress').hidden = count === 0;
  if (progress.level1) {
    firstState.textContent = '已通关';
    firstState.classList.add('done');
    firstLink.textContent = '重玩第一关 →';
    firstLink.href = './first/index.html?series=1&restart=1&v=20261021-mobile1';
    secondCard.classList.remove('locked');
    secondState.textContent = progress.level2 ? '已通关' : '已解锁';
    secondState.classList.add('done');
    secondLink.href = secondUrl;
    secondLink.removeAttribute('aria-disabled');
    secondLink.innerHTML = progress.level2 ? '重玩第二关 <span aria-hidden="true">→</span>' : '开始第二关 <span aria-hidden="true">→</span>';
  } else {
    firstState.textContent = '待调查';
    firstState.classList.remove('done');
    firstLink.href = './first/index.html?series=1&restart=1&v=20261021-mobile1';
    firstLink.innerHTML = '开始第一关 <span aria-hidden="true">→</span>';
    secondCard.classList.add('locked');
    secondState.textContent = '待解锁';
    secondState.classList.remove('done');
    secondLink.href = '#level-two';
    secondLink.setAttribute('aria-disabled', 'true');
    secondLink.innerHTML = '通关第一关后解锁 <span aria-hidden="true">⌁</span>';
  }
}
document.querySelector('#reset-progress').addEventListener('click', () => {
  try { localStorage.removeItem(SERIES_KEY); } catch {}
  showProgress();
});
document.querySelector('#level-two-link').addEventListener('click', event => {
  if (event.currentTarget.getAttribute('aria-disabled') === 'true') event.preventDefault();
});
showProgress();
window.addEventListener('pageshow', showProgress);
