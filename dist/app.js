const ASSET_ROOT = "./assets/";
const ASSET_VERSION = "story-9-fit2";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const game = $("#game");
const sceneBackdrop = $("#scene-backdrop");
const sceneShade = $(".scene-shade");
let sceneImage = $("#scene-image");
const sceneUi = $("#scene-ui");
const introBed = $("#intro-bed");
const skipButton = $("#skip-button");
const progress = $("#case-progress");
const soundToggle = $("#sound-toggle");
const liveRegion = $("#live-region");
const soundGate = $("#sound-gate");
const soundStart = $("#sound-start");
const silentStart = $("#silent-start");

const previewViewport = new URLSearchParams(window.location?.search || "").get("viewport");
if (["375x812", "320x568"].includes(previewViewport) && document.documentElement && document.body) {
  const [previewWidth, previewHeight] = previewViewport.split("x");
  document.documentElement.style.setProperty("--preview-width", `${previewWidth}px`);
  document.documentElement.style.setProperty("--preview-height", `${previewHeight}px`);
  document.body.classList.add("fixed-preview-viewport");
  document.body.classList.add(`preview-${previewViewport}`);
}

const FLOW_STATES = [
  "opening",
  "observe-note",
  "observe-phone",
  "transition-to-bank",
  "atm-stop",
  "private-chat",
  "official-check",
  "evidence-summary",
  "ending",
];

const state = {
  phase: "gate",
  found: new Set(),
  locked: false,
  imageToken: 0,
  audioEnabled: false,
  introStarted: false,
  openingFrame: 0,
  currentLine: null,
  timers: new Set(),
  resumeOpening: false,
};

const PACE = {
  short: 1300,
  line: 2200,
  long: 3000,
  dialogueExit: 220,
};

const openingFrames = [
  { image: "02-store-closing-broken-freezer.webp", duration: 3000, speaker: "旁白", text: "雨落白昼街，何叔正准备提前关店。", stamp: true },
  { image: "02a-broken-freezer-closeup.webp", duration: 3300, speaker: "旁白", text: "坏冰柜还在漏水，接水盆就放在一旁。" },
  { image: "03-card-note-phone-closeup.webp", duration: 2600, speaker: "旁白", text: "手机一震，他拿起了手机和银行卡。", transition: "cut" },
  { image: "04-message-over-shoulder.webp", duration: 3300, speaker: "旁白", text: "陌生人催他在九点前转一笔钱。", transition: "cut" },
  { image: "05-grandma-observes-through-window.webp", duration: 3600, speaker: "旁白", text: "路过店门口的周奶奶看见，他盯着手机，又把银行卡攥紧了。" },
];

const bankTransitionFrames = [
  { image: "09-uncle-leaves-store-in-rain.webp", speaker: "旁白", text: "何叔看了眼时间，拿着卡就往外走。", duration: 1250 },
  { image: "10-grandma-follows-to-atm.webp", speaker: "旁白", text: "周奶奶放心不下，跟了上去。", duration: 1250 },
  { image: "16-atm-action-choice-v2.webp", speaker: "周奶奶", text: "何叔，先别按。", duration: 1250 },
];

const speakerProfiles = {
  "旁白": { key: "narrator", label: "旁白" },
  "何叔": { key: "he", label: "何叔" },
  "周奶奶": { key: "grandma", label: "周奶奶" },
  "官方客服": { key: "service", label: "官方客服" },
};

let sharedVoice = null;

function asset(name) {
  return `${ASSET_ROOT}${name}?v=${ASSET_VERSION}`;
}

function schedule(fn, ms) {
  const id = window.setTimeout(() => {
    state.timers.delete(id);
    fn();
  }, ms);
  state.timers.add(id);
  return id;
}

function clearTimers() {
  state.timers.forEach((id) => window.clearTimeout(id));
  state.timers.clear();
}

function announce(text) {
  liveRegion.textContent = text;
}

function setPhase(phase) {
  if (phase !== "gate" && !FLOW_STATES.includes(phase)) {
    throw new Error(`Unknown story state: ${phase}`);
  }
  state.phase = phase;
  game.dataset.state = phase;
  game.classList.toggle("observation-mode", phase === "observe-note" || phase === "observe-phone");
  game.classList.toggle("phone-scene", phase.startsWith("official-") || phase === "private-chat");
}

function chooseSharedVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const chinese = voices.filter((voice) => /^zh/i.test(voice.lang));
  const pool = chinese.length ? chinese : voices;
  const preferred = ["Ting-Ting", "Tingting", "Meijia", "Google 普通话", "Xiaoxiao", "Huihui", "Chinese China"];
  sharedVoice = preferred
    .map((name) => pool.find((voice) => voice.name.includes(name)))
    .find(Boolean) || pool[0] || null;
}

function stopNarration() {
  window.speechSynthesis?.cancel?.();
}

function speakLine(speaker, text) {
  state.currentLine = { speaker, text };
  if (!state.audioEnabled || document.hidden || !window.speechSynthesis) return;
  stopNarration();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.voice = sharedVoice;
  utterance.volume = 1;
  utterance.rate = 0.92;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function stopOpeningAudio({ reset = false } = {}) {
  introBed.pause();
  if (reset) introBed.currentTime = 0;
  stopNarration();
}

function syncSoundToggle() {
  soundToggle.textContent = state.audioEnabled ? "🔊" : "🔇";
  soundToggle.setAttribute("aria-label", state.audioEnabled ? "关闭声音" : "打开声音");
  soundToggle.setAttribute("aria-pressed", String(state.audioEnabled));
}

function setImage(name, alt = "剧情场景", transition = "soft") {
  const token = ++state.imageToken;
  game.dataset.background = name;
  const previous = sceneImage;
  const next = new Image();
  next.className = `scene-image scene-transition-${transition}`;
  next.alt = alt;
  next.addEventListener("load", () => {
    if (token !== state.imageToken) return;
    if (sceneBackdrop) sceneBackdrop.style.backgroundImage = `url("${asset(name)}")`;
    game.insertBefore(next, sceneShade);
    window.requestAnimationFrame(() => {
      next.classList.add("is-active");
      previous?.classList.add("is-leaving");
      sceneImage = next;
      schedule(() => previous?.remove(), transition === "cut" ? 80 : 520);
    });
  }, { once: true });
  next.src = asset(name);
}

function setHeader(label, { canSkip = false } = {}) {
  skipButton.hidden = !canSkip;
  progress.hidden = canSkip || !label;
  progress.textContent = label || "";
}

function speakerMarkup(speaker) {
  const profile = speakerProfiles[speaker] || speakerProfiles["旁白"];
  return `
    <span class="dialogue-avatar avatar-${profile.key}" aria-hidden="true"></span>
    <span class="speaker-name">${profile.label}</span>
  `;
}

function dialogue(speaker, text, extra = "") {
  announce(`${speaker}：${text}`);
  speakLine(speaker, text);
  return `
    ${extra}
    <section class="dialogue">
      <div class="speaker">${speakerMarkup(speaker)}</div>
      <p>${text}</p>
    </section>
  `;
}

function afterDialogue(ms, fn) {
  schedule(() => {
    $$(".dialogue", sceneUi).forEach((panel) => panel.classList.add("is-exiting"));
    schedule(fn, PACE.dialogueExit);
  }, Math.max(0, ms - PACE.dialogueExit));
}

function playOpening(index = 0) {
  clearTimers();
  setPhase("opening");
  state.openingFrame = index;
  state.currentLine = null;
  setHeader("", { canSkip: true });

  if (index === 0 && state.audioEnabled) {
    introBed.currentTime = 0;
    introBed.volume = 0.68;
    introBed.play().catch(() => {});
  }

  if (index >= openingFrames.length) {
    beginObservation();
    return;
  }

  const frame = openingFrames[index];
  setImage(frame.image, frame.text, frame.transition || "soft");
  const stamp = frame.stamp
    ? `<div class="chapter-stamp"><small>白昼市侦探社 · 案件一</small><h1>窗外有事</h1></div>`
    : "";
  sceneUi.innerHTML = dialogue(frame.speaker, frame.text, stamp);
  afterDialogue(frame.duration, () => playOpening(index + 1));
}

function armEvidenceReminder(expectedPhase) {
  schedule(() => {
    if (state.phase !== expectedPhase) return;
    $("[data-evidence]", sceneUi)?.classList.add("is-reminder");
  }, 4000);
}

function beginObservation() {
  clearTimers();
  stopOpeningAudio({ reset: true });
  setPhase("observe-note");
  state.locked = false;
  state.currentLine = null;
  setHeader("观察 0/2");
  setImage("05-grandma-observes-through-window.webp", "周奶奶从街面路过便利店门口，隔着玻璃观察店内的何叔、手机、银行卡和柜台便签");
  sceneUi.innerHTML = `
    <div class="mission-card">
      <strong>帮周奶奶看清情况</strong>
      <span>看看何叔为什么这么着急</span>
    </div>
    <div class="art-stage" aria-hidden="false">
      <button class="evidence-target hotspot-note" type="button" data-evidence="note" aria-label="放大查看柜台区域">
        <span class="magnifier-mark" aria-hidden="true"></span>
      </button>
    </div>
    ${dialogue("周奶奶", "他走得这么急，柜台上是不是落了什么？")}
  `;
  $("[data-evidence]", sceneUi).addEventListener("click", renderNoteJudgment);
  armEvidenceReminder("observe-note");
}

function renderNoteJudgment() {
  clearTimers();
  setPhase("observe-note");
  state.locked = false;
  state.currentLine = null;
  setHeader("观察 0/2");
  setImage("07-personal-payee-note-closeup.webp", "放大的发黄横纹转账便签和深蓝银行卡", "cut");
  sceneUi.innerHTML = `
    <div class="art-stage" aria-hidden="true">
      <div class="note-evidence-copy">
        <small>转账金额</small>
        <strong>1,999 元</strong>
        <span>收款人：个人账户</span>
      </div>
    </div>
    <section class="judgment-panel judgment-note" aria-labelledby="judgment-title">
      <div class="choice-kicker">放大证据 · 转账便签</div>
      <h2 id="judgment-title">这张便签哪里不对劲？</h2>
      <div class="judgment-options">
        <button class="judgment-option" type="button" data-note-answer="wrong">便签纸看起来有些旧</button>
        <button class="judgment-option" type="button" data-note-answer="correct">对方要求转到个人账户</button>
      </div>
      <p id="judgment-feedback" class="judgment-feedback" aria-live="polite" hidden></p>
    </section>
  `;
  $$("[data-note-answer]", sceneUi).forEach((button) => {
    button.addEventListener("click", () => handleNoteAnswer(button.dataset.noteAnswer));
  });
}

function handleNoteAnswer(answer) {
  if (state.locked) return;
  const feedback = $("#judgment-feedback", sceneUi);
  feedback.hidden = false;
  if (answer !== "correct") {
    feedback.className = "judgment-feedback is-wrong";
    feedback.textContent = "纸张新旧不是风险。正规机构通常不会让你把费用转进个人账户，请重新判断。";
    announce(feedback.textContent);
    return;
  }

  state.locked = true;
  state.found.add("note");
  $$("[data-note-answer]", sceneUi).forEach((button) => { button.disabled = true; });
  setHeader("观察 1/2");
  feedback.className = "judgment-feedback is-correct";
  feedback.textContent = "判断正确：要求把机构费用转进个人账户，是第一个风险信号。";
  announce(feedback.textContent);
  schedule(renderPhoneCue, 1300);
}

function playPhoneBuzz() {
  navigator.vibrate?.(160);
  if (!state.audioEnabled || document.hidden) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = 118;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.23);
  oscillator.addEventListener("ended", () => context.close());
}

function renderPhoneCue() {
  clearTimers();
  setPhase("observe-phone");
  state.locked = false;
  setHeader("观察 1/2");
  setImage("05-grandma-observes-through-window.webp", "何叔手里的手机轻震，站在街面店门外的周奶奶继续观察", "cut");
  sceneUi.innerHTML = `
    <div class="mission-card">
      <strong>手机还在催他</strong>
      <span>看看对方说了什么</span>
    </div>
    <div class="art-stage" aria-hidden="false">
      <button class="evidence-target hotspot-phone is-vibrating" type="button" data-evidence="phone" aria-label="放大查看何叔的手机和上半身区域">
        <span class="magnifier-mark" aria-hidden="true"></span>
      </button>
    </div>
    ${dialogue("周奶奶", "手机还在催他，看看对方说了什么。")}
  `;
  playPhoneBuzz();
  $("[data-evidence]", sceneUi).addEventListener("click", renderPhoneJudgment);
  armEvidenceReminder("observe-phone");
}

function renderPhoneJudgment() {
  clearTimers();
  setPhase("observe-phone");
  state.locked = false;
  state.currentLine = null;
  setHeader("观察 1/2");
  setImage("08-pressure-message-closeup.webp", "放大的棕色旧皮套手机和陌生催款聊天", "cut");
  sceneUi.innerHTML = `
    <section class="phone-focus phone-private evidence-phone" aria-label="陌生私聊放大画面">
      <div class="phone-notch" aria-hidden="true"></div>
      <div class="phone-screen private-screen">
        <div class="private-head">
          <span class="stranger-avatar" aria-hidden="true">陌</span>
          <div><strong>业务处理专员</strong><small>普通联系人 · 未认证</small></div>
        </div>
        <div class="chat-thread">
          <p>请在九点前完成解冻</p>
          <p class="risk-message">这是专属处理通道，请勿联系平台客服</p>
        </div>
      </div>
    </section>
    <section class="judgment-panel judgment-phone" aria-labelledby="judgment-title">
      <div class="choice-kicker">阅读聊天 · 陌生催款</div>
      <h2 id="judgment-title">哪句话在阻止何叔去官方核实？</h2>
      <div class="judgment-options">
        <button class="judgment-option" type="button" data-phone-answer="wrong">请在九点前完成解冻</button>
        <button class="judgment-option" type="button" data-phone-answer="correct">请勿联系平台客服</button>
      </div>
      <p id="judgment-feedback" class="judgment-feedback" aria-live="polite" hidden></p>
    </section>
  `;
  $$("[data-phone-answer]", sceneUi).forEach((button) => {
    button.addEventListener("click", () => handlePhoneAnswer(button.dataset.phoneAnswer));
  });
}

function handlePhoneAnswer(answer) {
  if (state.locked) return;
  const feedback = $("#judgment-feedback", sceneUi);
  feedback.hidden = false;
  if (answer !== "correct") {
    feedback.className = "judgment-feedback is-wrong";
    feedback.textContent = "限时催促也很可疑，但它没有直接阻止官方核实。再看看另一句话。";
    announce(feedback.textContent);
    return;
  }

  state.locked = true;
  state.found.add("phone");
  $$("[data-phone-answer]", sceneUi).forEach((button) => { button.disabled = true; });
  setHeader("观察 2/2");
  feedback.className = "judgment-feedback is-correct";
  feedback.textContent = "判断正确：阻止联系平台客服，是在切断官方核实渠道。";
  announce(feedback.textContent);
  schedule(renderRiskSummary, 1300);
}

function renderRiskSummary() {
  clearTimers();
  setPhase("observe-phone");
  state.locked = false;
  setHeader("观察 2/2");
  setImage("05-grandma-observes-through-window.webp", "站在街面店门外的周奶奶汇总两个诈骗风险信号", "cut");
  speakLine("周奶奶", "两件事连在一起，风险就很高了。");
  announce("个人账户，加上阻止官方核实，等于高风险。");
  sceneUi.innerHTML = `
    <section class="risk-summary-card">
      <div class="speaker">${speakerMarkup("周奶奶")}</div>
      <h2>两条线索连起来了</h2>
      <div class="risk-equation" aria-label="个人账户加阻止官方核实等于高风险">
        <strong>个人账户</strong><span>＋</span><strong>阻止官方核实</strong><span>＝</span><b>高风险</b>
      </div>
      <p>先叫住何叔，把还没完成的转账停下来。</p>
      <button class="primary-action" id="follow-uncle" type="button">赶紧跟上</button>
    </section>
  `;
  $("#follow-uncle", sceneUi).addEventListener("click", () => playBankTransition(0));
}

function playBankTransition(index = 0) {
  clearTimers();
  setPhase("transition-to-bank");
  setHeader("去叫住何叔");
  if (index >= bankTransitionFrames.length) {
    renderAtmStop();
    return;
  }
  const frame = bankTransitionFrames[index];
  setImage(frame.image, frame.text, index === 0 ? "soft" : "cut");
  sceneUi.innerHTML = dialogue(frame.speaker, frame.text);
  afterDialogue(frame.duration, () => playBankTransition(index + 1));
}

function renderAtmStop() {
  clearTimers();
  setPhase("atm-stop");
  state.locked = false;
  state.currentLine = null;
  setHeader("先把转账停下来");
  setImage("16-atm-action-choice-v2.webp", "银行内周奶奶叫住何叔，深蓝银行卡已插入 ATM", "cut");
  sceneUi.innerHTML = `
    <section class="choice-wrap atm-choice-wrap">
      <div class="choice-kicker">先停止危险操作</div>
      <h2>卡已经插入，但转账还没有完成。</h2>
      <div class="choices">
        <button class="choice-button" type="button" data-atm="wrong">继续按对方说的转账</button>
        <button class="choice-button" type="button" data-atm="correct">取消操作，先把银行卡取回来</button>
      </div>
    </section>
  `;
  $$("[data-atm]", sceneUi).forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.atm === "correct") playAtmCancel();
      else showWrongAtm();
    });
  });
}

function showWrongAtm() {
  if (state.locked) return;
  state.locked = true;
  sceneUi.innerHTML = `
    <article class="feedback-note" role="alertdialog" aria-modal="true">
      <div class="choice-kicker">先别继续</div>
      <h2>这一步不会真的转账</h2>
      <p>陌生人要求限时转账，又阻止联系平台客服，这是明显风险信号。</p>
      <button class="primary-action" id="judge-again" type="button">重新判断</button>
    </article>
  `;
  announce("选择不会扣分，也不会推进剧情。请重新判断。");
  $("#judge-again", sceneUi).focus();
  $("#judge-again", sceneUi).addEventListener("click", renderAtmStop);
}

function playAtmCancel() {
  clearTimers();
  setPhase("atm-stop");
  state.locked = true;
  setHeader("操作已取消");
  setImage("17b-cancel-and-take-card.webp", "同一张深蓝银行卡从 ATM 卡槽退出", "cut");
  sceneUi.innerHTML = dialogue("旁白", "操作已取消。银行卡已经退回。", `
    <div class="art-stage"><div class="atm-screen-copy"><strong>操作已取消</strong><span>请取回银行卡</span></div></div>
  `);
  afterDialogue(PACE.line, playCardSecured);
}

function playCardSecured() {
  clearTimers();
  setPhase("atm-stop");
  setHeader("银行卡已收好");
  setImage("20a-card-safe-closeup.webp", "何叔把同一张深蓝银行卡放进棕色钱包", "cut");
  sceneUi.innerHTML = dialogue("周奶奶", "钱先别动。现在从原申请入口查清楚。");
  afterDialogue(PACE.long, renderPrivateChat);
}

function phoneShell(kind, body, footer = "") {
  return `
    <section class="phone-focus phone-${kind}" aria-label="${kind === "private" ? "陌生私聊" : "官方 App"}">
      <div class="phone-notch" aria-hidden="true"></div>
      <div class="phone-screen ${kind}-screen">${body}</div>
    </section>
    ${footer}
  `;
}

function renderPrivateChat() {
  clearTimers();
  setPhase("private-chat");
  state.locked = false;
  state.currentLine = null;
  setHeader("查看对方说法");
  setImage("18-official-customer-service.webp", "银行背景下，何叔拿着同一部棕色旧皮套手机", "cut");
  sceneUi.innerHTML = phoneShell("private", `
    <div class="private-head">
      <span class="stranger-avatar" aria-hidden="true">陌</span>
      <div><strong>业务处理专员</strong><small>普通联系人 · 未认证</small></div>
    </div>
    <div class="chat-thread">
      <p>请在九点前完成解冻，需支付 1,999 元</p>
      <p class="risk-message">这是专属处理通道，请勿联系平台客服</p>
    </div>
  `, `
    <div class="phone-action-bar">
      <p><strong>何叔：</strong>对方说九点前要交 1,999 元，还让我别问平台客服。</p>
      <button class="primary-action" id="open-official" type="button">从原申请入口核实</button>
    </div>
  `);
  announce("何叔：对方说九点前要交一千九百九十九元，还让我别问平台客服。");
  $("#open-official", sceneUi).addEventListener("click", renderOfficialCheck);
}

function renderOfficialCheck() {
  clearTimers();
  setPhase("official-check");
  state.locked = false;
  state.currentLine = null;
  setHeader("官方核实结果");
  if (game.dataset.background !== "18-official-customer-service.webp") {
    setImage("18-official-customer-service.webp", "银行背景下用同一部手机查看官方 App", "cut");
  }
  speakLine("官方客服", "本次申请没有待缴费用，请勿向个人账户转账。");
  sceneUi.innerHTML = phoneShell("official", `
    <div class="official-head"><strong>原申请入口 · 核实结果</strong><span>剧情示意</span></div>
    <div class="official-check-stack">
      <div class="official-check-row">
        <span><small>申请记录</small><strong>本次申请处理中</strong></span>
        <b>已核对</b>
      </div>
      <div class="fee-zero compact-fee"><small>费用状态</small><strong>当前无待缴费用</strong></div>
      <div class="service-thread compact-service"><small>官方客服回复</small><p>本次申请没有待缴费用，请勿向个人账户转账。</p></div>
    </div>
  `, `
    <div class="phone-action-bar service-action-bar">
      <p>记录、费用和客服回复已经合并核实。</p>
      <button class="primary-action" id="compare-evidence" type="button">对照两边说法</button>
    </div>
  `);
  $(".phone-focus", sceneUi).classList.add("phone-slide");
  announce("官方客服：本次申请没有待缴费用，请勿向个人账户转账。");
  $("#compare-evidence", sceneUi).addEventListener("click", renderEvidenceSummary);
}

function renderEvidenceSummary() {
  clearTimers();
  setPhase("evidence-summary");
  state.locked = false;
  state.currentLine = null;
  setHeader("证据对照");
  setImage("15a-reaction-after-verification.webp", "何叔和周奶奶对照陌生私聊与官方核实结果", "cut");
  sceneUi.innerHTML = `
    <section class="compare-wrap">
      <div class="choice-kicker">两边说法完全相反</div>
      <h2>陌生私聊要求交钱，官方确认没有待缴费用。</h2>
      <div class="compare-cards">
        <div class="compare-card"><span class="source-icon">聊</span><span><small>陌生私聊</small><strong>要求交 1,999 元</strong></span></div>
        <div class="compare-card official"><span class="source-icon">官</span><span><small>官方记录与客服</small><strong>当前无待缴费用</strong></span></div>
      </div>
      <button class="primary-action" id="close-case" type="button">查看结案</button>
    </section>
  `;
  $("#close-case", sceneUi).addEventListener("click", renderEnding);
}

function renderEnding() {
  clearTimers();
  setPhase("ending");
  state.locked = false;
  setHeader("案件归档");
  setImage("20-case-closed-background.webp", "雨势变小，便利店重新亮灯，坏冰柜和接水盆仍保留", "soft");
  sceneUi.innerHTML = `
    <section class="ending-card">
      <article class="ending-paper">
        <small>第一关 · 调查结论</small>
        <h1>这笔钱，没有转出去</h1>
        <p>何叔先取消了操作，再从原申请入口核实：当前没有这笔待缴费用。</p>
        <div class="ending-reminder"><strong>三个风险信号</strong><span>限时转账 · 个人收款账户 · 阻止联系官方客服</span></div>
        <button class="primary-action" type="button" id="replay">再看一遍</button>
      </article>
    </section>`;
  announce("案件结束。这笔钱没有转出去。");
  $("#replay", sceneUi).addEventListener("click", resetGame);
}

function resetGame() {
  clearTimers();
  stopOpeningAudio({ reset: true });
  setPhase("gate");
  state.found = new Set();
  state.locked = false;
  state.audioEnabled = false;
  state.introStarted = false;
  state.openingFrame = 0;
  state.currentLine = null;
  state.resumeOpening = false;
  syncSoundToggle();
  soundToggle.hidden = true;
  setHeader("");
  sceneUi.innerHTML = "";
  setImage("02-store-closing-broken-freezer.webp", "雨夜街面的便利店，何叔准备提前关店", "cut");
  soundGate.hidden = false;
  soundGate.classList.remove("is-leaving");
  announce("《窗外有事》已准备好。选择带声音进入或静音观看。");
}

function startCase(withAudio) {
  if (state.introStarted) return;
  state.introStarted = true;
  state.audioEnabled = withAudio;
  syncSoundToggle();
  soundToggle.hidden = false;
  soundGate.classList.add("is-leaving");
  schedule(() => {
    soundGate.hidden = true;
    soundGate.classList.remove("is-leaving");
    playOpening(0);
  }, 200);
}

skipButton.addEventListener("click", () => {
  state.found = new Set();
  beginObservation();
});

soundToggle.addEventListener("click", () => {
  state.audioEnabled = !state.audioEnabled;
  syncSoundToggle();
  if (!state.audioEnabled) {
    introBed.pause();
    stopNarration();
    return;
  }
  if (state.phase === "opening") introBed.play().catch(() => {});
  if (state.currentLine) speakLine(state.currentLine.speaker, state.currentLine.text);
});

window.speechSynthesis?.addEventListener?.("voiceschanged", chooseSharedVoice);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    state.resumeOpening = state.phase === "opening";
    if (state.resumeOpening) clearTimers();
    introBed.pause();
    stopNarration();
    return;
  }
  if (state.resumeOpening && state.phase === "opening") {
    state.resumeOpening = false;
    if (state.audioEnabled) introBed.play().catch(() => {});
    playOpening(state.openingFrame);
  } else if (state.audioEnabled && state.currentLine) {
    speakLine(state.currentLine.speaker, state.currentLine.text);
  }
});

soundStart.addEventListener("click", () => startCase(true));
silentStart.addEventListener("click", () => startCase(false));

window.__windowCase = {
  getSnapshot: () => ({
    state: state.phase,
    background: game.dataset.background || "",
    buttons: $$("button", sceneUi).filter((button) => !button.hidden).map((button) => button.textContent.trim()),
  }),
};

chooseSharedVoice();
syncSoundToggle();
setPhase("gate");
setHeader("");
setImage("02-store-closing-broken-freezer.webp", "雨夜街面的便利店，何叔准备提前关店", "cut");
announce("《窗外有事》已准备好。选择带声音进入或静音观看。");
