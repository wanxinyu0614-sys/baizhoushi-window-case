const project = '.';
const local = './assets';
const media = source => `${source}?v=20261021-hqpreload1`;
const seriesMode = new URLSearchParams(location.search).get('series') === '1';
const demoMode = new URLSearchParams(location.search).get('series') === 'demo';
if (seriesMode || demoMode) document.title = '奶奶侦探 · 第二关｜手机自己去赶集';
const seriesKey = 'grandma-detective-series-v1';
function markSeriesComplete() {
  if (!seriesMode) return;
  try { const prior = JSON.parse(localStorage.getItem(seriesKey)) || {}; if (prior.level1 === true) localStorage.setItem(seriesKey, JSON.stringify({ ...prior, level2: true })); } catch {}
}
function returnToSeries() { location.assign('../index.html'); }
const video = document.querySelector('#clip');
const still = document.querySelector('#still');
const insert = document.querySelector('#stop-insert');
const game = document.querySelector('#game');
const ui = document.querySelector('#ui');
const image = {
  v2: `${project}/视频/逐帧检查/v2/frame-3800.jpg`,
  v5: `${project}/视频/逐帧检查/v5/frame-3800.jpg`,
  v8: `${project}/视频/逐帧检查/v8/frame-4600.jpg`,
  v9: `${project}/视频/逐帧检查/v9/frame-4600.jpg`,
  k08: `${local}/K08-v2-陈阿姨接回手机-近景.jpg`,
  k10: `${local}/K10-v2-证据手账缺失格-大特写.jpg`,
  k12: `${local}/K12-验证码最后一道门-大特写.jpg`,
};
const scenes = [
  { type: 'clip', label: '手机异动', source: media(`${local}/V01-修复版.mp4`), progress: '1/4' },
  { type: 'clip', label: '先别碰', source: media(`${local}/V02-新台词成片.mp4`), progress: '1/4', cue: '周姐！我要不要点停它？', replyCue: '别碰。', replyAt: 2.58, cueEnd: 3.65 },
  { type: 'question', id: 'first' },
  { type: 'clip', label: '追问', source: media(`${project}/视频/v3.mp4`), progress: '2/4' },
  { type: 'clip', label: '半小时前', source: media(`${project}/视频/v4.mp4`), progress: '2/4', context: '半小时前 · 免费贴膜摊' },
  { type: 'clip', label: '贴膜摊', source: media(`${project}/视频/v5.mp4`), progress: '2/4' },
  { type: 'question', id: 'permission' },
  { type: 'clip', label: '推理手账', source: media(`${project}/视频/v6.mp4`), progress: '3/4' },
  { type: 'still', label: '手账特写', source: image.k10, duration: 950, progress: '3/4' },
  { type: 'question', id: 'deduce' },
  { type: 'clip', label: '验证码危机', source: media(`${project}/视频/v7.mp4`), progress: '4/4', context: '断网前 · 陈阿姨的回忆', stopInsert: true },
  { type: 'question', id: 'code' },
  { type: 'clip', label: '官方核实', source: media(`${project}/视频/v8.mp4`), progress: '4/4' },
  { type: 'outcome' },
  { type: 'clip', label: '摊主不见了', source: media(`${project}/视频/v9.mp4`), progress: '4/4', context: '核实后 · 折返贴膜摊', contextKind: '现在' },
  { type: 'end' },
];
const prefetchedClips = new Set();
const clipSources = new Map();
function primeVideo(source) {
  return CaseMedia.url(source).then(url => { clipSources.set(source, url); return url; });
}
function prefetchNextClip(fromIndex) {
  if (navigator.connection?.saveData) return;
  const nextClip = scenes.find((step, sceneIndex) => sceneIndex > fromIndex && step.type === 'clip');
  if (!nextClip || prefetchedClips.has(nextClip.source)) return;
  prefetchedClips.add(nextClip.source);
  primeVideo(nextClip.source)
    .catch(() => prefetchedClips.delete(nextClip.source));
}
const questions = {
  first: { title: '第一关 · 处置', progress: '1/4', tag: '现场', kicker: '手已拦住 · 选择下一步', heading: '手机还在自己点', picture: image.v2, note: '陈阿姨想点停手机，奶奶已经拦住她的手。', question: '接下来怎么处理？', options: ['继续在手机上点停', '断开网络', '回拨陌生客服'], answer: 1, feedback: '已断网。先阻断异常点击，再查原因。' },
  permission: { title: '第二关 · 判断', progress: '2/4', tag: '贴膜', heading: '贴膜摊哪里不对劲？', picture: image.k08, note: '陈阿姨只去贴膜，手机却被拿走，还多了陌生软件和控制权限。', question: '最该警惕哪一步？', options: ['贴膜用了几分钟', '送了一张优惠券', '擅自装软件、开控制权限'], answer: 2, feedback: '贴膜不需要装陌生软件，更不需要控制手机。', autoAdvance: true },
  deduce: { title: '第三关 · 推理', progress: '3/4', tag: '推理', heading: '补上最后一格', picture: image.k10, note: '手机交给摊主 → 装了陌生软件 → 打开控制权限。', question: '陈阿姨没碰，谁在点？', options: ['手机坏了', '自动更新', '另一端有人远程控制'], answer: 2, feedback: '证据指向另一端有人远程控制手机。' },
  code: { title: '第四关 · 截停', progress: '4/4', tag: '截停', heading: '验证码最后一道门', picture: image.k12, note: '陌生客服让陈阿姨念出验证码，声称能“撤回”。', question: '奶奶拦下后，该选哪一步？', options: ['报给对方，好撤回', '在原手机回拨客服', '拒绝报出，换设备核实'], answer: 2, feedback: '一个数字都不说，换设备找银行官方渠道核实。', autoAdvance: true },
};
let index = -1;
let muted = false;
let menuOpen = false;
let pausePosition = 0;
let stillTimer = 0;
let playRequest = 0;

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
function topbar(title, progress = '1/4') {
  const displayTitle = seriesMode || demoMode ? title.replace(/^(第一关|第二关|第三关|第四关|第二期)/, '第二关') : title;
  return CaseChrome.header({title:displayTitle,progress,sound:!muted});
}
function timelinePill(step) {
  if (!step.context) return '';
  return `<div class="timeline-pill" role="note" aria-label="时间切换：${escapeHtml(step.context)}">
    <span class="timeline-label">${escapeHtml(step.contextKind || '回忆')}</span>
    <span class="timeline-main">${escapeHtml(step.context)}</span>
  </div>`;
}
function bindHeader() {
  ui.querySelector('#pause-control')?.addEventListener('click', () => {
    if (menuOpen) { resumeFromPause(); return; }
    pausePosition = video.currentTime; video.pause(); clearTimeout(stillTimer); menuOpen = true; playRequest++;
    ui.innerHTML = `${topbar('暂停', '—')}<div class="spacer"></div><section class="panel dialogue"><div class="speaker">奶奶侦探</div><p>当前画面已暂停。</p><button class="primary" id="resume" type="button">继续</button><button class="minor" id="restart" type="button">从头开始</button>${seriesMode || demoMode ? '<button class="minor" id="series-map" type="button">返回关卡地图</button>' : ''}</section>`;
    bindHeader();
    ui.querySelector('#resume').onclick = resumeFromPause;
    ui.querySelector('#restart').onclick = () => { menuOpen = false; index = -1; next(); };
    if (seriesMode || demoMode) ui.querySelector('#series-map').onclick = returnToSeries;
  });
  ui.querySelector('#sound-control')?.addEventListener('click', () => { muted = !muted; video.muted = muted; const b = ui.querySelector('#sound-control'); b.innerHTML = CaseChrome.icon(muted ? 'muted' : 'sound'); b.setAttribute('aria-label', muted ? '开启声音' : '关闭声音'); b.setAttribute('aria-pressed',String(!muted)); });
  ui.querySelector('#help-control')?.addEventListener('click', () => showToast('答题时画面会暂停；贴膜和验证码判断答对后自动继续。'));
}
function resumeFromPause() {
  menuOpen = false;
  const clipStep = scenes[index]?.type === 'clip';
  renderStep();
  if (clipStep) {
    const seek = () => { video.currentTime = pausePosition; };
    if (video.readyState >= 1) seek(); else video.addEventListener('loadedmetadata', seek, { once: true });
  }
}
function showToast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(el._timer); el._timer = setTimeout(() => el.classList.remove('show'), 2500); }
function backdrop(src) { playRequest++; video.pause(); video.hidden = true; still.src = src; still.hidden = false; insert.hidden = true; }
function next() { clearTimeout(stillTimer); video.pause(); insert.hidden = true; index += 1; renderStep(); }
function renderStep() {
  const step = scenes[index];
  if (!step) return;
  if (step.type !== 'clip') prefetchNextClip(index);
  game.dataset.stage = step.type;
  game.classList.toggle('has-evidence', ['question', 'outcome', 'end'].includes(step.type));
  if (step.type === 'clip') return playClip(step);
  if (step.type === 'still') return showStill(step);
  if (step.type === 'question') return showQuestion(step.id);
  if (step.type === 'outcome') return showOutcome();
  if (step.type === 'end') return showEnd();
}
async function playClip(step) {
  const sceneIndex=index;
  const request=++playRequest, active=()=>request===playRequest&&sceneIndex===index&&!menuOpen;
  video.pause();video.muted = muted;
  ui.innerHTML = `${topbar(`第二期 · ${step.label}`, step.progress)}${timelinePill(step)}${step.cue ? `<div class="scene-help opening-cue" id="clip-cue" role="note">${escapeHtml(step.cue)}</div>` : ''}<div class="spacer"></div>`;
  bindHeader();
  let source=clipSources.get(step.source);
  if(!source){
    ui.insertAdjacentHTML('beforeend','<section class="media-loading"><span class="media-status">正在准备剧情…</span><progress max="1"></progress><small>准备好后会自动播放</small></section>');
    try{source=await CaseMedia.url(step.source,value=>{if(!active())return;const label=ui.querySelector('.media-status'),bar=ui.querySelector('.media-loading progress');if(label)label.textContent=CaseMedia.progressText(value);if(bar&&value!=null)bar.value=value});clipSources.set(step.source,source)}
    catch{if(active()){ui.querySelector('.media-loading').innerHTML='<p>网络暂时没连上，点一下重试。</p><button class="primary" id="retry-download">重新准备剧情</button>';ui.querySelector('#retry-download').onclick=()=>playClip(step)}return}
  }
  if(!active())return;
  ui.querySelector('.media-loading')?.remove();still.hidden = true; video.hidden = false;
  if(video.getAttribute('src')!==source){video.src=source;video.load()}else if(video.ended)video.currentTime=0;
  video.play().catch(() => {
    if(!active())return;
    ui.insertAdjacentHTML('beforeend', '<section class="panel dialogue"><p>点一下继续播放剧情。</p><button class="primary" id="play-again" type="button">继续播放</button></section>');
    ui.querySelector('#play-again').onclick = () => { ui.querySelector('.dialogue')?.remove(); video.play(); };
  });
}
function showStill(step) {
  backdrop(step.source);
  ui.innerHTML = `${topbar(`第二期 · ${step.label}`, step.progress)}${timelinePill(step)}<div class="spacer"></div>`;
  bindHeader(); stillTimer = setTimeout(next, step.duration);
}
function showQuestion(id) {
  const q = questions[id]; backdrop(q.picture);
  const opts = q.options.map((value, i) => `<button class="option" data-answer="${i}" type="button"><b>${'ABC'[i]}</b>${escapeHtml(value)}</button>`).join('');
  ui.innerHTML = `${topbar(q.title, q.progress)}<section class="panel evidence">
    <div class="evidence-title"><span class="tag">${q.tag}</span><div><small>${escapeHtml(q.kicker || '发现线索 · 直接判断')}</small><h2>${q.heading}</h2></div></div>
    <div class="evidence-visual"><img src="${q.picture}" alt="${q.heading}"><div class="inset-note">${q.note}</div></div>
    <p class="question">${q.question}</p><div class="choice-wrap">${opts}</div>
    <div id="feedback" aria-live="polite"></div><button class="primary" id="advance" type="button" hidden>继续剧情</button>
  </section>`;
  bindHeader();
  ui.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
    const pick = Number(button.dataset.answer); const ok = pick === q.answer;
    button.classList.add(ok ? 'selected-right' : 'selected-wrong');
    ui.querySelector('#feedback').innerHTML = `<div class="feedback ${ok ? 'correct' : ''}">${ok ? `判断正确 · ${q.feedback}` : '再想想，回到刚才的线索。'}</div>`;
    if (ok) {
      ui.querySelectorAll('[data-answer]').forEach(b => b.disabled = true);
      if (q.autoAdvance) stillTimer = setTimeout(next, 1700);
      else { const advance = ui.querySelector('#advance'); advance.hidden = false; advance.onclick = next; }
    }
  }));
}
function showOutcome() {
  backdrop(image.v8);
  ui.innerHTML = `${topbar('第四关 · 官方核实', '4/4')}<div class="spacer"></div>
    <section class="panel official-letter" role="status" aria-label="银行官方渠道账户核实回函">
      <div class="letterhead"><span class="letter-monogram" aria-hidden="true">银</span><div><div class="letter-sender">银行官方服务渠道</div><div class="letter-type">账户核实回函</div></div></div>
      <div class="letter-rule"></div>
      <p class="letter-recipient">陈女士：</p>
      <p class="letter-conclusion">经核实，您当前账户暂未查到异常转出。</p>
      <p class="letter-body">“报出验证码帮您撤回”并非银行办理方式。请按官方指引处理账户，旧手机暂勿用于银行操作。</p>
      <div class="letter-signature"><span>银行官方服务渠道</span><span class="letter-seal">已核实</span></div>
      <button class="letter-next" id="official-continue" type="button">读完回函，返回贴膜摊 <span aria-hidden="true">→</span></button>
    </section>`;
  bindHeader(); ui.querySelector('#official-continue').onclick = next;
}
function showEnd() {
  backdrop(image.v9);
  markSeriesComplete();
  ui.innerHTML = `${topbar('第二期 · 结案', '4/4')}<div class="spacer"></div><section class="panel result-panel"><div class="seal">✓</div><h2>案件告破</h2><p>官方核实：这次未查到异常转出。<br>陌生软件别装，验证码别说出口。</p>${seriesMode ? '<div class="series-conclusion">两关全部通关</div><button class="primary" id="series-finish" type="button">查看闯关结果</button>' : demoMode ? '<button class="primary" id="series-finish" type="button">返回关卡地图</button>' : '<button class="primary" id="restart" type="button">再看一次</button>'}</section>`;
  bindHeader();
  if (seriesMode || demoMode) ui.querySelector('#series-finish').onclick = returnToSeries;
  else ui.querySelector('#restart').onclick = () => { index = -1; next(); };
}
video.addEventListener('ended', () => {
  if (scenes[index]?.type === 'clip') next();
});
video.addEventListener('playing', () => prefetchNextClip(index));
video.addEventListener('timeupdate', () => {
  const step = scenes[index]; insert.hidden = !(step?.stopInsert && video.currentTime >= 3.05 && video.currentTime < 3.95);
  const cue = ui.querySelector('#clip-cue');
  if (cue && step?.replyCue) {
    cue.hidden = video.currentTime >= step.cueEnd;
    cue.textContent = video.currentTime >= step.replyAt ? step.replyCue : step.cue;
  }
});
video.addEventListener('error', () => {
  if (ui.querySelector('#clip-retry')) return;
  ui.insertAdjacentHTML('beforeend', '<section class="panel dialogue clip-recovery"><p>网络有点慢，这段剧情暂时没加载出来。</p><button class="primary" id="clip-retry" type="button">重新加载</button><button class="minor" id="clip-skip" type="button">跳过这段，继续调查</button></section>');
  ui.querySelector('#clip-retry').onclick = () => {
    ui.querySelector('.clip-recovery')?.remove();
    video.load();
    video.play().catch(() => showToast('请再点一次播放'));
  };
  ui.querySelector('#clip-skip').onclick = () => {
    ui.querySelector('.clip-recovery')?.remove();
    next();
  };
});
insert.src = image.k12;
const preview = new URLSearchParams(location.search).get('preview');
if (preview === 'official') {
  index = scenes.findIndex(step => step.type === 'outcome');
  renderStep();
} else {
  backdrop(image.v2);
  ui.innerHTML = `${topbar('第二期 · 开始', '1/4')}<div class="spacer"></div><section class="panel start-panel"><div class="speaker">奶奶侦探 · ${seriesMode || demoMode ? '第二关' : '第二期'}</div><h2>手机自己去赶集</h2><p>在街道上帮周奶奶查清：陈阿姨的手机为什么会自己点击？</p><button class="primary" id="start" type="button">${preview === 'v02' ? '试听 V02 新配音' : '开始调查'}</button><div class="helper">${demoMode ? '独立预览，不记录通关 · ' : ''}四次关键判断；剧情会在选项处暂停</div></section>`;
  const openingSource=preview === 'v02' ? scenes[1].source : scenes[0].source;
  const start=ui.querySelector('#start');start.disabled=true;const label=start.textContent;start.textContent='正在准备剧情…';
  CaseMedia.url(openingSource,value=>{if(index===-1&&ui.querySelector('#start'))ui.querySelector('.helper').textContent=CaseMedia.progressText(value)}).then(source=>{clipSources.set(openingSource,source);if(ui.querySelector('#start')){start.disabled=false;start.textContent=label;ui.querySelector('.helper').textContent='剧情已准备好 · 四次关键判断时暂停'}}).catch(()=>{start.disabled=false;start.textContent='重试并开始调查'});
  bindHeader(); ui.querySelector('#start').onclick = () => { index = preview === 'v02' ? 0 : -1; next(); };
}
