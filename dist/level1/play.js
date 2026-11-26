const $ = id => document.getElementById(id);
const frame = name => `play-assets/stills/${name}${/\.(png|webp)$/.test(name) ? '' : '.webp'}`;
const videoFile = name => ({
  intro:'play-assets/video-composed/intro-user-1122-opening-name-fixed-mobile.mp4',
  outro:'play-assets/video-composed/outro-memory-mobile.mp4',
  phone:'play-assets/video-composed/original-app-phone-loop.mp4'
}[name]) + '?v=20261125-mobile-2';
const ATM_BEFORE = '关键特写/C01-确认前-手悬停与ATM-何叔修正版';
const ATM_AFTER = '关键特写/C01B-取消结果-ATM屏幕-何叔修正版';
const voiceNames = ['bridge_narration','verify_official','safety_intro','tip1','tip2','tip3'];
// Character dialogue comes from the MP4 audio. Only the time bridge and
// notebook are narrated separately because neither has speaking mouths.
const voiceFiles = {
  bridge_narration: 'play-assets/audio/bridge-narration-grandma.wav?v=20261123-question-2',
  verify_official: 'play-assets/audio/verify_official-chen-aunt-v2.wav?v=20261124-official-copy-1',
  safety_intro: 'assets/audio/safety-intro-grandma.wav?v=20261125'
};
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioContext.createGain();
masterGain.connect(audioContext.destination);
let soundEnabled = true, pendingAutoplayResolve = null, helpWasPlaying = false;
const voiceBuffers = new Map();
const activeSources = new Set();
const voiceLoads = new Map();
// Keep the official reply as ordinary media so it also plays from a local
// file preview, where fetch() cannot load the audio through Web Audio.
const officialAudio = new Audio(voiceFiles.verify_official);
officialAudio.preload = 'auto';
function ensureVoices(names = voiceNames) {
  return Promise.all(names.map(name => {
    if (!voiceLoads.has(name)) voiceLoads.set(name,(async () => {
      const response = await fetch(voiceFiles[name] || `assets/audio/${name}.wav`)
        .catch(error => { throw new Error(`配音请求失败：${name}（${error.message}）`); });
      if (!response.ok) throw new Error(`配音加载失败：${name}`);
      voiceBuffers.set(name, await audioContext.decodeAudioData(await response.arrayBuffer()));
    })().catch(error => { voiceLoads.delete(name); throw error; }));
    return voiceLoads.get(name);
  }));
}
const I = {
  atm: ['','<small>自助银行 · 转账确认</small><strong>¥1,999.00</strong><div class="row"><span>收款人</span><b>李某（个人账户）</b></div><div class="row"><span>卡号</span><b>尾号 6382</b></div><div class="action">确认转账</div>'],
  atmScreen: ['screen-atm','<div class="screen-card"><small>转账确认</small><strong>¥1,999.00</strong><div class="row"><span>收款人</span><b>李某（个人）</b></div><div class="row"><span>尾号</span><b>6382</b></div></div><div class="action">确认转账</div>'],
  cancelling: ['','<small>自助银行 · 转账</small><strong>何叔按下“取消转账”</strong><div class="action secondary">取消转账</div>'],
  cancellingScreen: ['screen-atm','<div class="screen-card"><small>转账确认</small><strong>取消这笔转账</strong></div><div class="action secondary">取消转账</div>'],
  cancelled: ['cancelled','<strong>✓ 交易已取消</strong><small>钱未转出 · 银行卡已退出</small>'],
  cancelledScreen: ['screen-atm cancelled','<div class="screen-card"><strong>✓ 交易已取消</strong><small>钱未转出</small></div>'],
  call: ['call-badge','<small>何叔回忆 · 半小时前</small><strong>陌生号码来电</strong><small>身份未核实</small>'],
  sms: ['screen-phone sms-screen','<div class="phone-nav">‹ <span>陌生号码</span> ···</div><div class="message-bubble"><small>陌生短信</small><strong>请尽快转入 ¥1,999</strong><div class="row"><span>收款人</span><b>李某</b></div><div class="row"><span>账户</span><b>个人 · 6382</b></div></div><div class="phone-foot">对方身份未核实</div>'],
  notePaper: ['note-paper','<small>收款人</small><strong>李某 · 个人账户</strong><small>尾号 6382　¥1,999</small>'],
  application: ['screen-phone app-screen','<div class="phone-nav"><span>原申请 App</span></div><div class="application-card"><small>我的申请</small><strong>申请处理中</strong><small>从原申请入口查看进度</small></div><div class="action">联系官方客服</div>'],
  connecting: ['screen-phone app-screen','<div class="phone-nav"><span>原申请 App</span></div><div class="application-card"><small>我的申请</small><strong>申请处理中</strong></div><div class="action">正在联系官方客服…</div>'],
  official: ['screen-phone app-screen','<div class="phone-nav"><span>原申请 App</span></div><div class="application-card"><small>我的申请</small><strong>申请处理中</strong></div><div class="action connected">官方客服已接通</div>']
};
const frameTime = seconds => Math.round(seconds * 24) / 24;
const S = (name, seconds, info = '', tag = '') => ({kind:'still',name,seconds:frameTime(seconds),info,tag});
const V = (name, seconds, poster, info = '', start = 0) => ({kind:'video',name,seconds:frameTime(seconds),poster,info,start});
const nativeCaptionLengths = {
  walk_g: 1.16, walk_h: 1.76, atm_g: 1.34, atm_h: 1.67,
  why_g: 1.8, why_h: 2.22,
  call_a1: 2.5, call_a2: 2.46, sms_he: 2.36,
  clue_g: 2.88, verify_g: 3.16
};
const scenes = [
  {name:'赶去银行',cues:[[.46,'walk_g','奶奶','何叔，去哪儿？'],[1.62,'walk_h','何叔','去银行转钱。'],[6.14,'atm_g','奶奶','何叔，先别按！'],[7.48,'atm_h','何叔','就差这一下，钱就能下来了！']],parts:[
    V('user-01-03',9.33,'首尾帧/S01-用户合成首帧-mobile.webp')
  ]},
  {name:'差一按',cues:[],parts:[]},
  {name:'问清原因',cues:[[.27,'why_g','奶奶','你急着转这钱干吗？'],[2.53,'why_h','何叔','说是解冻费，不交不放款。']],parts:[
    {...V('s03',.75,'首尾帧/S05-新片首帧.png'),tag:'已拦下 · 钱未转出'},
    V('s03',103/24,'首尾帧/S05-新片首帧.png')
  ]},
  {name:'半小时前的电话',cues:[[1.39,'call_a1','陌生来电','何先生，您下午申请的贷款批了。'],[4.23,'call_a2','陌生来电','先交一千九百九解冻费，就能放款。']],parts:[
    V('memory-a',7,'首尾帧/S04-A-半小时前来电')
  ]},
  {name:'那条信息',cues:[[7.09,'sms_he','何叔','他又发来账号，催我赶快转。']],parts:[
    V('memory-b',4,'首尾帧/S04-A-半小时前来电'),
    V('memory-c',8,'首尾帧/S05-B-抄下账号拿卡')
  ]},
  {name:'看出破绽',cues:[[0,'clue_g','奶奶','平台要收费，怎么收进李某个人卡？']],parts:[
    {...V('s06',98/24,'首尾帧/S06-A-回到现在字条'),tag:'回到现在'}
  ]},
  {name:'从原 App 核实',cues:[[0,'verify_g','奶奶','从你原来申请的 App 找客服，问清楚。']],parts:[
    V('s07',76/24,'首尾帧/S07-A-打开原申请App')
  ]}
];

const stillCache = new Map();
const videoCache = new Map();
const videoLoads = new Map();
let mediaLoad, activeVideo = $('video'), stillAnimation;
function playbackDeadline(promise, milliseconds = 12000) {
  let timer;
  return Promise.race([promise,new Promise((_,reject) => {
    timer = setTimeout(() => reject(new Error('视频加载超时')),milliseconds);
  })]).finally(() => clearTimeout(timer));
}
function seekVideo(video, seconds) {
  if (Math.abs(video.currentTime-seconds) < .02) return Promise.resolve();
  return new Promise((resolve,reject) => {
    const timer = setTimeout(() => reject(new Error('视频定位超时')),5000);
    video.addEventListener('seeked',() => { clearTimeout(timer); resolve(); },{once:true});
    video.currentTime = seconds;
  });
}
function ensureMedia() {
  if (mediaLoad) return mediaLoad;
  const openingPoster = '首尾帧/S01-用户合成首帧-mobile.webp';
  const img = new Image(); img.src = frame(openingPoster); stillCache.set(openingPoster,img);
  const posterReady = img.decode().catch(() => { throw new Error(`图片加载失败：${openingPoster}`); });
  ['intro','outro','phone'].forEach(name => {
    const video = document.createElement('video');
    video.className = 'media'; video.muted = name === 'phone' || !soundEnabled; video.playsInline = true;
    video.setAttribute('webkit-playsinline','');
    video.loop = name === 'phone';
    video.dataset.segment = name;
    video.preload = name === 'intro' ? 'auto' : 'none'; video.style.display = 'none';
    video.addEventListener('timeupdate',() => {
      if (video !== activeVideo || !['scene','paused'].includes(phase)) return;
      const base = name === 'intro' ? 0 : name === 'outro' ? 9 : 14;
      const elapsed = base + video.currentTime;
      $('progressBar').style.width = `${Math.min(100,elapsed / 48 * 100)}%`;
    });
    $('still').parentElement.insertBefore(video,$('still'));
    videoCache.set(name,video);
    const ready = new Promise((resolve,reject) => {
      video.addEventListener('loadeddata',resolve,{once:true});
      video.addEventListener('error',() => reject(new Error(`视频加载失败：${name}`)),{once:true});
      video.src = videoFile(name);
      if (name === 'intro') video.load();
    });
    videoLoads.set(name,ready);
    ready.catch(() => {});
  });
  // The bank scene, time bridge and memory share one audible video element.
  videoCache.set('memory',videoCache.get('outro'));
  videoLoads.set('memory',videoLoads.get('outro'));
  // Do not gate play() on loadeddata: iOS may wait for play() before loading media.
  mediaLoad = posterReady;
  return mediaLoad;
}

let runId = 0, phase = 'ready', currentSceneIndex = -1, sequenceElapsed = 0, timers = [], activeCaption = '';
const screenRects = {
  '关键特写/C03-回忆-陌生短信手机正面': {source:[1080,1920],rect:[415,660,340,645]},
  '关键特写/C04-回忆-字条银行卡手机': {source:[941,1672],rect:[278,940,360,390]},
  // Draw within the blank glass below the earpiece; its sides lean left.
  '关键特写/C05-核实-原App手机正面': {source:[480,854],rect:[191,285,147,305]},
  '首尾帧/S03-B-取消后展开字条': {source:[941,1672],rect:[648,759,113,82]},
};
let currentInfo = null;
const ART_W = 941, ART_H = 1672;
const INTERACTION_W = 480, INTERACTION_H = 854;
// The two approved full frames are pixel-aligned. The extracted arm cutouts
// lack a complete shoulder joint, so do not rotate them into the torso.
const armTip = {x:423,y:360};
const armDrop = {x:302,y:609};
let interactionArtLoad, interactionArt, interactionProgress = 0, draggingArm = false, dragStart = null, pendingTouchCompletion = false;
function distanceToSegment(x,y,a,b) {
  const dx=b.x-a.x, dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
}
function inArm(x,y) {
  // Include the sleeve, forearm, cuff and hand; avoid the face and receipt.
  return x >= 252 && x <= 478 && y >= 328 && y <= 492 &&
         (distanceToSegment(x,y,{x:282,y:425},{x:424,y:366}) < 88 ||
          distanceToSegment(x,y,{x:310,y:445},{x:399,y:390}) < 70);
}
function loadInteractionArt(retry = false) {
  if (!interactionArtLoad) interactionArtLoad = (async () => {
    const root = 'play-assets/interaction/三帧对位-20261123/';
    const names = {
      raised:'02-伸手帧-ATM斜面统一.jpg',
      lowered:'03-收手帧-ATM斜面统一.jpg'
    };
    const entries = await Promise.all(Object.entries(names).map(async ([key,name]) => {
      const img = await new Promise((resolve,reject) => {
        const image = new Image();
        const timer = setTimeout(() => reject(new Error('互动图片加载超时')),15000);
        image.onload = () => { clearTimeout(timer); resolve(image); };
        image.onerror = () => { clearTimeout(timer); reject(new Error('互动图片加载失败')); };
        image.src = root+name+(retry ? `?retry=${Date.now()}` : '?v=20261126-first-load-1');
      });
      return [key,img];
    }));
    interactionArt = Object.fromEntries(entries);
  })().catch(error => { interactionArtLoad = null; throw error; });
  return interactionArtLoad;
}
const atmArtwork = new Map();
const atmKeys = new Set(['atmScreen','cancellingScreen','cancelledScreen']);
function atmFlatArtwork(key) {
  const flat = document.createElement('canvas');
  flat.width = 420; flat.height = 410;
  const ctx = flat.getContext('2d');
  ctx.fillStyle = '#f8fafb'; ctx.fillRect(24,30,372,226);
  ctx.textBaseline = 'alphabetic';
  if (key === 'cancelledScreen') {
    ctx.fillStyle = '#227451'; ctx.font = 'bold 37px sans-serif';
    ctx.fillText('✓ 交易已取消',42,115);
    ctx.fillStyle = '#536b71'; ctx.font = '24px sans-serif';
    ctx.fillText('钱未转出',42,172);
    return flat;
  }
  ctx.fillStyle = '#526470'; ctx.font = '25px sans-serif';
  ctx.fillText('转账确认',42,69);
  ctx.fillStyle = '#17232d'; ctx.font = 'bold 43px sans-serif';
  ctx.fillText(key === 'cancellingScreen' ? '取消这笔转账' : '¥1,999.00',42,127);
  if (key === 'atmScreen') {
    ctx.strokeStyle = '#cbd9dd'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(42,149); ctx.lineTo(380,149); ctx.stroke();
    ctx.font = '24px sans-serif'; ctx.fillText('收款人',42,194);
    ctx.font = 'bold 24px sans-serif'; ctx.fillText('李某（个人）',210,194);
    ctx.fillStyle = '#667780'; ctx.font = '19px sans-serif';
    ctx.fillText('尾号 6382',42,230);
  }
  ctx.fillStyle = key === 'atmScreen' ? '#2679df' : '#e6f0f3';
  ctx.fillRect(165,299,220,68);
  ctx.fillStyle = key === 'atmScreen' ? '#fff' : '#2a596b';
  ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(key === 'atmScreen' ? '确认转账' : '取消转账',275,344);
  return flat;
}
function atmPerspectiveArtwork(key) {
  if (atmArtwork.has(key)) return atmArtwork.get(key);
  const flat = atmFlatArtwork(key);
  const warped = document.createElement('canvas');
  warped.width = ART_W; warped.height = ART_H;
  const ctx = warped.getContext('2d');
  // Inset quadrilateral measured from the ATM screen in both C01 frames.
  // The top rises toward the right; the bottom stays almost level.
  const point = (u,v) => {
    const topX = 455 + 410*u, topY = 518 - 64*u;
    const bottomX = 430 + 438*u, bottomY = 899 + 2*u;
    return {x:topX+(bottomX-topX)*v,y:topY+(bottomY-topY)*v};
  };
  const strip = 2;
  for (let x=0;x<flat.width;x+=strip) {
    const w = Math.min(strip,flat.width-x);
    const a = point(x/flat.width,0);
    const b = point((x+w)/flat.width,0);
    const c = point(x/flat.width,1);
    ctx.setTransform((b.x-a.x)/w,(b.y-a.y)/w,
                     (c.x-a.x)/flat.height,(c.y-a.y)/flat.height,a.x,a.y);
    ctx.drawImage(flat,x,0,w,flat.height,0,0,w+.1,flat.height);
  }
  ctx.setTransform(1,0,0,1,0,0);
  atmArtwork.set(key,warped);
  return warped;
}
function drawAtmPerspective(ctx,key) { ctx.drawImage(atmPerspectiveArtwork(key),0,0); }
function drawTargetOutline(ctx) {
  // Trace the visible outer sleeve and hand in the approved lowered frame.
  // The inside of the upper arm is covered by the apron, so it has no line.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(253,389);
  ctx.bezierCurveTo(270,405,283,452,294,483);
  ctx.bezierCurveTo(306,516,315,545,321,559);
  ctx.bezierCurveTo(325,570,323,594,322,609);
  ctx.bezierCurveTo(321,623,313,632,301,637);
  ctx.bezierCurveTo(294,639,285,636,284,628);
  ctx.bezierCurveTo(282,622,288,610,289,600);
  ctx.bezierCurveTo(291,588,289,572,289,562);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.setLineDash([8,7]);
  ctx.shadowColor = '#142329';
  ctx.shadowBlur = 3;
  ctx.stroke();
  ctx.restore();
}
function drawInteraction() {
  if (!interactionArt) return;
  const canvas = $('interactionCanvas'), ctx = canvas.getContext('2d');
  const p = interactionProgress;
  ctx.clearRect(0,0,INTERACTION_W,INTERACTION_H);
  const {raised,lowered} = interactionArt;
  ctx.drawImage(p === 1 ? lowered : raised,0,0);
  drawTargetOutline(ctx);
  canvas.setAttribute('aria-valuenow',String(Math.round(p*100)));
}
function pointInArt(event) {
  const rect = $('interactionCanvas').getBoundingClientRect();
  const fit = getComputedStyle($('interactionCanvas')).objectFit;
  const scale = (fit === 'cover' ? Math.max : Math.min)(rect.width/INTERACTION_W,rect.height/INTERACTION_H);
  const cropX = (rect.width-INTERACTION_W*scale)/2;
  const cropY = (rect.height-INTERACTION_H*scale)/2;
  return {x:(event.clientX-rect.left-cropX)/scale,
          y:(event.clientY-rect.top-cropY)/scale};
}
function setInteractionProgress(value) {
  interactionProgress = Math.max(0,Math.min(1,value));
  $('interaction').classList.toggle('is-moving',interactionProgress>.01);
  drawInteraction();
}
const pause = (ms, id) => new Promise(resolve => {
  const timer = setTimeout(() => resolve(id === runId), ms);
  timers.push(timer);
});
function clearTimers() { for (const timer of timers) clearTimeout(timer); timers = []; }
function setCaption(role = '', line = '', key = '') {
  $('speaker').textContent = role; $('line').textContent = line;
  $('caption').dataset.role = role; $('caption').hidden = !line;
  activeCaption = key;
}
function positionInfo() {
  if (!currentInfo) return;
  const spec = screenRects[currentInfo.mediaName];
  if (!spec) return;
  const app = $('info').parentElement;
  const [sourceW,sourceH] = spec.source;
  const [x,y,w,h] = spec.rect;
  const fit = getComputedStyle(activeVideo).objectFit;
  const scale = (fit === 'cover' ? Math.max : Math.min)(app.clientWidth/sourceW,app.clientHeight/sourceH);
  const cropX = (app.clientWidth-sourceW*scale)/2;
  const cropY = (app.clientHeight-sourceH*scale)/2;
  const margin = 12;
  const left = Math.max(margin,cropX+x*scale);
  const top = Math.max(margin,cropY+y*scale);
  const right = Math.min(app.clientWidth-margin,cropX+(x+w)*scale);
  const bottom = Math.min(app.clientHeight-margin,cropY+(y+h)*scale);
  Object.assign($('info').style,{
    left:`${left}px`,top:`${top}px`,
    width:`${Math.max(0,right-left)}px`,height:`${Math.max(0,bottom-top)}px`
  });
}
function setInfo(key = '', mediaName = '') {
  const el = $('info'); el.hidden = !key;
  const atm = $('atmOverlay');
  atm.hidden = !atmKeys.has(key);
  if (atmKeys.has(key)) {
    el.hidden = true;
    const ctx = atm.getContext('2d');
    ctx.clearRect(0,0,ART_W,ART_H);
    drawAtmPerspective(ctx,key);
    currentInfo = null;
    return;
  }
  el.style.cssText = '';
  currentInfo = key ? {key,mediaName} : null;
  if (!key) return;
  el.className = `info ${I[key][0]}`; el.innerHTML = I[key][1];
  positionInfo();
}
function syncMediaLayout() {
  $('phoneStep').querySelector('.phone-top-fill').setAttribute('preserveAspectRatio',
    matchMedia('(max-width: 700px)').matches ? 'xMidYMid slice' : 'xMidYMid meet');
  positionInfo();
}
window.addEventListener('resize',syncMediaLayout);
syncMediaLayout();
function setTag(label = '', bridge = false) {
  const el = $('timeTag'); el.hidden = !label;
  el.textContent = label; el.classList.toggle('bridge',bridge);
}
function playVoice(id, role, line, currentRun, reading = '', showCaption = true, offset = 0) {
  if (currentRun !== runId) return;
  const buffer = voiceBuffers.get(id);
  if (!buffer) throw new Error(`配音未就绪：${id}`);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.voiceId = id;
  source.connect(masterGain);
  activeSources.add(source);
  document.body.dataset.audioState = audioContext.state;
  document.body.dataset.playedVoices = [document.body.dataset.playedVoices,id].filter(Boolean).join(',');
  if (showCaption) setCaption(role,line,id);
  if (reading) $('notice').dataset.reading = reading;
  source.onended = () => {
    activeSources.delete(source);
    if (currentRun !== runId) return;
    if (activeCaption === id) setCaption();
    if (reading) $('notice').dataset.reading = '';
  };
  source.start(0,offset);
  return source;
}
function waitForVideoTime(video, target, currentRun) {
  return new Promise(resolve => {
    let animationFrame, settled = false;
    const finish = valid => {
      if (settled) return;
      settled = true;
      video.removeEventListener('timeupdate',check);
      video.removeEventListener('ended',check);
      cancelAnimationFrame(animationFrame);
      resolve(valid);
    };
    const check = () => {
      if (settled) return;
      if (currentRun !== runId) return finish(false);
      if (video.currentTime >= target - 1/48 || video.ended) return finish(true);
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(check);
    };
    video.addEventListener('timeupdate',check);
    video.addEventListener('ended',check);
    check();
  });
}
function scheduleCues(cues, currentRun, partStart) {
  const video = activeVideo;
  for (const [at,id,role,line] of cues) {
    waitForVideoTime(video,partStart+at,currentRun).then(valid => {
      if (!valid) return;
      if (nativeCaptionLengths[id]) {
        // Dialogue is already in the active MP4. Use its clock for subtitles.
        setCaption(role,line,id);
        waitForVideoTime(video,partStart+at+nativeCaptionLengths[id],currentRun)
          .then(stillCurrent => {
            if (stillCurrent && activeCaption === id) setCaption();
          });
      } else playVoice(id,role,line,currentRun);
    });
  }
}
async function showStill(name, seconds = 0) {
  const el = $('still');
  const src = frame(name);
  const previousVideo = activeVideo;
  previousVideo.pause(); previousVideo.style.display = 'none';
  el.style.display = 'block';
  if (!stillCache.has(name)) {
    const img = new Image(); img.src = src; stillCache.set(name,img);
    await img.decode();
  }
  if (el.getAttribute('src') !== src) el.src = src;
  el.style.display = 'block';
  if (stillAnimation) { stillAnimation.cancel(); stillAnimation = null; }
  if (seconds >= 1.2) stillAnimation = el.animate([
    {transform:'scale(1)'},{transform:'scale(1.018)'}
  ],{duration:seconds*1000,easing:'ease-out',fill:'forwards'});
}
async function beginSequence(name, poster, currentRun, start = 0) {
  const v = videoCache.get(name);
  if (name === 'memory' && v === activeVideo) {
    $('bridge').hidden = true;
    return currentRun === runId;
  }
  const posterReady = name !== 'memory' ? showStill(poster) : Promise.resolve();
  activeVideo = v;
  v.style.transform = '';
  v.style.display = 'block';
  if (start && v.readyState >= 1) v.currentTime = start;
  // This call must occur before the first await when the user taps Start.
  const playback = v.play();
  try { await playbackDeadline(playback); }
  catch (error) {
    v.pause();
    phase = 'autoplay-blocked';
    $('resumePanel').querySelector('p').textContent = error?.message === '视频加载超时' ? '视频加载较慢，点一下重试播放。' : '点一下播放视频。';
    $('resumePanel').hidden = false;
    await new Promise(resolve => { pendingAutoplayResolve = resolve; });
  }
  await Promise.all([posterReady,videoLoads.get(name)]);
  if (currentRun !== runId) return false;
  if (v.requestVideoFrameCallback) await Promise.race([
    new Promise(resolve => v.requestVideoFrameCallback(resolve)),
    new Promise(resolve => setTimeout(resolve,300))
  ]);
  if (currentRun !== runId) return false;
  $('still').style.display = 'none';
  if (name === 'memory') $('bridge').hidden = true;
  return true;
}
async function playPart(part, currentRun, cues) {
  setTag(part.tag || ([3,4].includes(currentSceneIndex) ? '半小时前 · 小店' : ''));
  setInfo(part.info,part.kind === 'video' ? part.poster : part.name);
  scheduleCues(cues,currentRun,sequenceElapsed);
  sequenceElapsed += part.seconds;
  return waitForVideoTime(activeVideo,sequenceElapsed,currentRun);
}
async function playScene(index,currentRun) {
  if (currentRun !== runId) return;
  phase = 'scene';
  currentSceneIndex = index;
  $('topbar').hidden = false;
  $('episode').textContent = `第一关 · ${scenes[index].name}`;
  if (index === 0 || index === 2 || index === 3) {
    sequenceElapsed = index === 3 ? 11.79 : 0;
    const name = index === 0 ? 'intro' : index === 2 ? 'outro' : 'memory';
    const poster = index === 0 ? '首尾帧/S01-用户合成首帧-mobile.webp' :
      index === 2 ? '首尾帧/S05-新片首帧.png' : '首尾帧/S04-A-半小时前来电';
    try {
      if (!(await beginSequence(name,poster,currentRun))) return;
    } catch (error) {
      if (currentRun !== runId) return;
      phase = 'load-error';
      $('topbar').hidden = true;
      $('startPanel').querySelector('p').textContent = error.message || '视频加载失败，请刷新页面重试。';
      $('startButton').textContent = '重试播放';
      $('startPanel').hidden = false;
      return;
    }
  }
  let elapsed = 0;
  for (const part of scenes[index].parts) {
    const cues = scenes[index].cues
      .filter(([at]) => at >= elapsed && at < elapsed + part.seconds)
      .map(([at,...rest]) => [at-elapsed,...rest]);
    if (currentRun !== runId || !(await playPart(part,currentRun,cues))) return;
    elapsed += part.seconds;
  }
  if (index === 1) { beginInteraction(currentRun); return; }
  if (index === 2) {
    await pause(350,currentRun);
    if (currentRun !== runId) return;
    await playBridge(currentRun);
    if (currentRun !== runId) return;
  }
  if (index === 3) { phase = 'flashback'; }
  if (index === 6) { beginPhoneStep(currentRun); return; }
  playScene(index+1,currentRun);
}
async function playBridge(currentRun) {
  phase = 'bridge';
  $('topbar').hidden = true;
  setInfo(''); setTag(''); setCaption();
  $('bridge').hidden = false;
  // Narration and the held bank frame are part of the same video track.
  await waitForVideoTime(activeVideo,11.79,currentRun);
  if (currentRun !== runId) return;
  phase = 'flashback';
}
async function beginInteraction(currentRun) {
  if (currentRun !== runId) return;
  phase = 'interaction-loading';
  const loadingTimer = setTimeout(() => {
    if (currentRun !== runId || phase !== 'interaction-loading') return;
    $('resumePanel').querySelector('p').textContent = '正在准备互动画面…';
    $('resumeButton').hidden = true;
    $('resumePanel').hidden = false;
  },900);
  try {
    try { await loadInteractionArt(); }
    catch { await loadInteractionArt(true); }
  } catch {
    clearTimeout(loadingTimer);
    if (currentRun !== runId) return;
    phase = 'interaction-error';
    $('resumePanel').querySelector('p').textContent = '互动画面加载失败，请重试。';
    $('resumeButton').hidden = false;
    $('resumeButton').textContent = '重试互动';
    $('resumePanel').hidden = false;
    return;
  }
  clearTimeout(loadingTimer);
  if (currentRun !== runId) return;
  $('resumePanel').hidden = true;
  $('resumeButton').hidden = false;
  $('resumeButton').textContent = '继续播放';
  videoCache.get('outro')?.load();
  activeVideo.pause();
  phase = 'interaction';
  $('topbar').hidden = true;
  $('still').style.display = 'none';
  setInfo(''); setTag(''); setCaption();
  $('interaction').hidden = false;
  setInteractionProgress(0);
  activeVideo.style.display = 'none';
}
async function completeInteraction() {
  if (phase !== 'interaction') return;
  phase = 'after-interaction';
  const currentRun = runId;
  setInteractionProgress(1);
  // Start the next audible video inside the release gesture on iPhone.
  // Keep the lowered-hand artwork briefly over its opening hold.
  const nextScene = playScene(2,currentRun);
  await pause(750,currentRun);
  if (currentRun !== runId) return;
  $('interaction').hidden = true;
  await nextScene;
}
async function beginPhoneStep(currentRun) {
  if (currentRun !== runId) return;
  phase = 'phone';
  setInfo(''); setTag(''); setCaption();
  const phone = videoCache.get('phone');
  activeVideo.pause(); activeVideo.style.display = 'none';
  activeVideo = phone;
  $('phonePoster').hidden = false;
  $('still').style.display = 'none';
  $('topbar').hidden = true;
  $('progressBar').style.width = '94%';
  $('phoneCallButton').hidden = false;
  $('phoneGesture').hidden = false;
  $('phoneHint').textContent = '点按「联系官方客服」';
  $('phoneHint').hidden = false;
  $('phoneStep').hidden = false;
  officialAudio.load();
  phone.muted = true;
  phone.style.display = 'block';
  // The still and button are usable even if WeChat delays or refuses the muted loop.
  try {
    await playbackDeadline(phone.play(),8000);
    await videoLoads.get('phone');
    if (currentRun !== runId || !['phone','official-loading','official'].includes(phase)) return;
    if (phone.requestVideoFrameCallback) await Promise.race([
      new Promise(resolve => phone.requestVideoFrameCallback(resolve)),
      new Promise(resolve => setTimeout(resolve,300))
    ]);
    if (currentRun === runId && !$('phoneStep').hidden) $('phonePoster').hidden = true;
  } catch {
    phone.pause(); phone.style.display = 'none';
  }
}
async function contactOfficial() {
  if (phase !== 'phone') return;
  const currentRun = runId;
  phase = 'official-loading';
  $('phoneCallButton').hidden = true;
  $('phoneGesture').hidden = true;
  $('phoneHint').hidden = true;
  setCaption('官方客服','正在连接官方客服…','official-connecting');
  try {
    officialAudio.currentTime = 0;
    officialAudio.muted = !soundEnabled;
    // Start directly inside the tap gesture, as required by iPhone browsers.
    await playbackDeadline(officialAudio.play(),12000);
  } catch {
    if (currentRun !== runId) return;
    officialAudio.pause();
    phase = 'phone';
    setCaption();
    $('phoneHint').textContent = '暂未接通，点按重试';
    $('phoneCallButton').hidden = false;
    $('phoneGesture').hidden = false;
    $('phoneHint').hidden = false;
    return;
  }
  if (currentRun !== runId) return;
  phase = 'official';
  setCaption();
  document.body.dataset.playedVoices = [document.body.dataset.playedVoices,'verify_official'].filter(Boolean).join(',');
  const finished = new Promise(resolve => officialAudio.addEventListener('ended',resolve,{once:true}));
  const lines = [
    [0,'何先生您好。'],
    [1.18,'您的贷款申请正在处理中。'],
    [3.46,'不收取任何解冻费用。'],
    [5.18,'请您切勿向任何人转账。']
  ];
  for (let i=0;i<lines.length;i++) {
    if (i) await pause((lines[i][0]-lines[i-1][0])*1000,currentRun);
    if (currentRun !== runId) return;
    setCaption('官方客服',lines[i][1],`official-${i+1}`);
  }
  await finished;
  if (currentRun !== runId) return;
  setCaption();
  await pause(600,currentRun);
  if (currentRun === runId) beginNotice(currentRun);
}
function beginNotice(currentRun) {
  if (currentRun !== runId) return;
  phase = 'notice'; activeVideo.pause(); activeVideo.style.display = 'none';
  $('topbar').hidden = true; $('phoneStep').hidden = true; $('phonePoster').hidden = true;
  $('progressBar').style.width = '100%';
  setInfo(''); setTag(''); setCaption();
  $('notice').hidden = false;
  const tips = [
    ['tip1','放款前要交解冻费，先别转。'],
    ['tip2','看清收款人，个人账户不要转。'],
    ['tip3','从原申请入口找官方客服核实。']
  ];
  (async () => {
    await ensureVoices(['safety_intro','tip1','tip2','tip3']);
    if (currentRun !== runId) return;
    playVoice('safety_intro','奶奶','',currentRun,'',false);
    await pause((voiceBuffers.get('safety_intro').duration+.2)*1000,currentRun);
    for (let i=0;i<tips.length;i++) {
      if (currentRun !== runId) return;
      playVoice(tips[i][0],'奶奶',tips[i][1],currentRun,String(i+1));
      const length = voiceBuffers.get(tips[i][0]).duration;
      await pause((length+.2)*1000,currentRun);
    }
    if (currentRun === runId) { $('notice').dataset.reading = ''; setCaption(); }
  })();
}
function restart() {
  runId++; clearTimers();
  officialAudio.pause();
  officialAudio.currentTime = 0;
  pendingAutoplayResolve = null;
  const startButton = $('startButton');
  startButton.disabled = true;
  startButton.textContent = '正在加载视频…';
  document.body.dataset.playedVoices = '';
  for (const source of activeSources) { try { source.stop(); } catch {} }
  activeSources.clear();
  activeVideo.pause(); activeVideo.style.display = 'none'; $('still').style.display = 'block';
  $('resumePanel').hidden = true; $('interaction').hidden = true; $('bridge').hidden = true; $('phoneStep').hidden = true; $('phonePoster').hidden = true; $('notice').hidden = true; $('notice').dataset.reading = '';
  $('topbar').hidden = true; $('progress').hidden = false; $('helpPanel').hidden = true;
  $('progressBar').style.width = '0%';
  draggingArm = false; pendingTouchCompletion = false; interactionProgress = 0;
  $('resumeButton').hidden = false; $('resumeButton').textContent = '继续播放';
  setInfo(''); setTag(''); setCaption();
  const currentRun = runId;
  try {
    audioContext.resume().catch(() => {});
    ensureMedia().catch(() => {});
    for (const video of videoCache.values()) {
      video.getAnimations().forEach(animation => animation.cancel());
      video.style.transform = '';
    }
    const intro = videoCache.get('intro');
    if (intro.readyState >= 1) intro.currentTime = 0;
    document.body.dataset.audioState = audioContext.state;
    document.body.dataset.loadedVoices = String(voiceBuffers.size);
  } catch (error) {
    startButton.disabled = false;
    startButton.textContent = '重试播放';
    $('startPanel').hidden = false;
    $('startPanel').querySelector('p').textContent = error.message || '视频或配音加载失败，请重试。';
    return;
  }
  $('startPanel').hidden = true;
  startButton.disabled = false;
  startButton.textContent = '开始调查';
  playScene(0,runId);
}
$('startButton').onclick = restart;
$('replay').onclick = restart;
$('phoneCallButton').onclick = contactOfficial;
function pausePlayback(showPanel = true) {
  if (phase !== 'scene') return false;
  phase = 'paused';
  activeVideo.pause();
  audioContext.suspend();
  if (showPanel) {
    $('resumePanel').querySelector('p').textContent = '已暂停';
    $('resumePanel').hidden = false;
  }
  return true;
}
async function resumePlayback() {
  if (phase === 'interaction-error') {
    $('resumePanel').hidden = true;
    beginInteraction(runId);
    return;
  }
  if (!['paused','autoplay-blocked'].includes(phase)) return;
  try {
    if (phase === 'autoplay-blocked') activeVideo.load();
    const playback = activeVideo.play();
    audioContext.resume().catch(() => {});
    await playbackDeadline(playback);
    phase = 'scene';
    $('resumePanel').hidden = true;
    $('pauseButton').setAttribute('aria-label','暂停播放');
    if (pendingAutoplayResolve) { const resolve = pendingAutoplayResolve; pendingAutoplayResolve = null; resolve(); }
  } catch {
    $('resumePanel').querySelector('p').textContent = '视频仍未能启动，请点下方按钮重试。';
    $('resumePanel').hidden = false;
  }
}
$('pauseButton').onclick = () => pausePlayback();
$('resumeButton').onclick = resumePlayback;
$('soundButton').onclick = () => {
  soundEnabled = !soundEnabled;
  masterGain.gain.value = soundEnabled ? 1 : 0;
  officialAudio.muted = !soundEnabled;
  for (const [name,video] of videoCache) video.muted = name === 'phone' || !soundEnabled;
  $('soundButton').setAttribute('aria-pressed',String(soundEnabled));
  $('soundButton').setAttribute('aria-label',soundEnabled ? '关闭声音' : '开启声音');
  $('soundButton').querySelector('svg').innerHTML = soundEnabled
    ? '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'
    : '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/>';
};
$('helpButton').onclick = () => {
  helpWasPlaying = pausePlayback(false);
  $('helpPanel').hidden = false;
};
$('helpClose').onclick = () => {
  $('helpPanel').hidden = true;
  if (helpWasPlaying) resumePlayback();
  helpWasPlaying = false;
};
$('interactionCanvas').addEventListener('pointerdown', e => {
  if (phase !== 'interaction') return;
  const {x,y} = pointInArt(e);
  if (!inArm(x,y)) return;
  draggingArm = true;
  $('interaction').classList.add('is-dragging');
  dragStart = {x,y};
  e.currentTarget.setPointerCapture(e.pointerId);
  e.currentTarget.classList.add('dragging');
});
$('interactionCanvas').addEventListener('pointermove', e => {
  if (!draggingArm || phase !== 'interaction') return;
  const {x,y} = pointInArt(e);
  const dx=armDrop.x-dragStart.x, dy=armDrop.y-dragStart.y;
  setInteractionProgress(((x-dragStart.x)*dx+(y-dragStart.y)*dy)/(dx*dx+dy*dy));
});
$('interactionCanvas').addEventListener('pointerup', e => {
  if (!draggingArm) return;
  draggingArm = false;
  const {x,y} = pointInArt(e);
  const reachedDrop = dragStart && y-dragStart.y >= 100 &&
    x >= 230 && x <= 385 && y >= 500 && y <= 720;
  dragStart = null;
  $('interaction').classList.remove('is-dragging');
  e.currentTarget.classList.remove('dragging');
  if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  if (interactionProgress >= .78 || reachedDrop) {
    // iOS WebKit recognizes touchend as the gesture that may start audible video.
    // pointerup alone can show the manual "continue playing" dialog in WeChat.
    if (e.pointerType === 'touch') pendingTouchCompletion = true;
    else completeInteraction();
  } else setInteractionProgress(0);
});
$('interactionCanvas').addEventListener('touchend', e => {
  if (phase !== 'interaction') return;
  const touch = e.changedTouches[0];
  const point = touch && pointInArt(touch);
  const reachedDrop = draggingArm && dragStart && point &&
    point.y-dragStart.y >= 100 && point.x >= 230 && point.x <= 385 &&
    point.y >= 500 && point.y <= 720;
  if (pendingTouchCompletion || (draggingArm && (interactionProgress >= .78 || reachedDrop))) {
    e.preventDefault();
    pendingTouchCompletion = false;
    draggingArm = false;
    dragStart = null;
    $('interaction').classList.remove('is-dragging');
    e.currentTarget.classList.remove('dragging');
    completeInteraction();
  }
}, {passive:false});
$('interactionCanvas').addEventListener('pointercancel',e => {
  if (phase !== 'interaction') return;
  pendingTouchCompletion = false;
  draggingArm = false; dragStart = null; $('interaction').classList.remove('is-dragging'); e.currentTarget.classList.remove('dragging'); setInteractionProgress(0);
});
$('interactionCanvas').addEventListener('keydown', e => {
  if (phase !== 'interaction') return;
  if (e.key==='ArrowLeft' || e.key==='ArrowDown') {
    e.preventDefault();
    setInteractionProgress(interactionProgress+.2);
    if (interactionProgress>=.95) completeInteraction();
  }
  if (e.key==='Escape') { e.preventDefault(); setInteractionProgress(0); }
});

// Decode all small stills and warm each video before the user reaches a cut.
ensureMedia().catch(() => {});
loadInteractionArt().catch(() => {});
