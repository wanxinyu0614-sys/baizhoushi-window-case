/* 本预览把镜头运动与业务状态分开；跳过动画只结束画面插值。 */
const F=CaseFlow, game=document.querySelector('#game'), scene=document.querySelector('#scene'), ui=document.querySelector('#ui'), effects=document.querySelector('#effects'), cover=document.querySelector('#transition'), skip=document.querySelector('#skip');
const KEY='window-case-motion-v4',SERIES_KEY='grandma-detective-series-v1',seriesMode=new URLSearchParams(location.search).get('series')==='1';let state,savedCase=null;
if(seriesMode)document.querySelector('#debug').hidden=true;
if(new URLSearchParams(location.search).get('restart')==='1'){try{localStorage.removeItem(KEY);sessionStorage.removeItem('window-case-prologue-v2')}catch{}}
try{savedCase=JSON.parse(localStorage.getItem(KEY));state=F.restore(savedCase)}catch{state=F.fresh()}
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches, sound=false, currentDetail=null, answer=null, decisionFeedback=null, busy=false, token=0, animations=[], hintTimer=null, autoTimer=null, dragAbort=null, audioContext=null, voiceAudio=null, voiceToken=0;
const voiceCaption=document.querySelector('#voice-caption'),playedVoiceSignatures=new Set();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
function markSeriesComplete(){
 if(!seriesMode||state.stage!=='finish')return;
 try{const prior=JSON.parse(localStorage.getItem(SERIES_KEY))||{};localStorage.setItem(SERIES_KEY,JSON.stringify({...prior,level1:true}))}catch{try{localStorage.setItem(SERIES_KEY,JSON.stringify({level1:true}))}catch{}}
}
const art=id=>'assets/'+id+'.jpg';
const MEDIA_BUILD='20261021-hqpreload1';
const video=id=>'assets/video/'+id+'?v='+MEDIA_BUILD;
let loopVideoWarmup=null;
function warmLoopVideo(){
 if(loopVideoWarmup)return loopVideoWarmup;
 loopVideoWarmup=CaseMedia.warm(video('L01.mp4'));
 return loopVideoWarmup;
}
let secondChapterWarmup=null;
function warmSecondChapter(){
 if(!seriesMode||secondChapterWarmup)return;
 secondChapterWarmup=Promise.resolve(warmLoopVideo()).then(()=>CaseMedia.prefetch(CaseAssets.secondClips,({completed,total})=>{game.dataset.nextChapterCache=completed+'/'+total}));
}
const voiceBuffers=new Map();
function unlockAudio(){
 audioContext??=new(window.AudioContext||window.webkitAudioContext)();
 audioContext.resume().catch(()=>{});
 return audioContext;
}
function prepareVoice(take){
 const path=voiceAsset(take);
 if(!voiceBuffers.has(path))voiceBuffers.set(path,CaseMedia.blob(path).then(blob=>blob.arrayBuffer()).then(bytes=>unlockAudio().decodeAudioData(bytes)).catch(error=>{voiceBuffers.delete(path);throw error}));
 return voiceBuffers.get(path);
}
function warmVoices(){
 const stageIndex=F.stages.indexOf(state.stage),stages=F.stages.slice(Math.max(0,stageIndex),Math.max(0,stageIndex)+3);
 const takes=stages.flatMap(stage=>STORY_VOICES[stage]||[]);
 takes.push({role:'grandma',id:'observe-intro'},{role:'grandma',id:'observe-partial'},{role:'grandma',id:'observe-complete'});
 for(const take of takes)prepareVoice(take).catch(()=>{});
}
const AUDIO_BUILD='20260921l';
const STORY_VOICES={
 intro:[{speaker:'周奶奶',role:'grandma',id:'narration-intro',text:'晚上二十二点十七分，白昼街的小店里，何叔收到一条消息。'}],
 message:[
  {speaker:'陌生人',role:'stranger',id:'message',text:'您的申请需要缴纳一千九百九十九元解冻费。请在十分钟内处理。'},
  {speaker:'何叔',role:'he',id:'message',text:'解冻费？我下午刚提交申请……'}
 ],
 call:[{speaker:'陌生人',role:'stranger',id:'call',text:'何先生，你今天下午十五点二十六分提交的申请，现在需要处理一下。'}],
 reaction:[{speaker:'何叔',role:'he',id:'reaction',text:'时间是对的……可这笔费用，我怎么没见过？'}],
 pressure:[{speaker:'陌生人',role:'stranger',id:'pressure',text:'现在不处理，今晚就影响征信。别回原来的 App，那里查不到。把收款信息记好，去自助银行转。'}],
 raise:[{speaker:'周奶奶',role:'grandma',id:'raise',text:'我看见何叔写了张便签，又提前拉下卷帘门。这个动静，和平时不太一样。我们仔细看看。'}],
 lower:[{speaker:'周奶奶',role:'grandma',id:'rush-safe',text:'何叔突然冲进自助银行，手已经伸向转账键。'}],
 pause:[{speaker:'周奶奶',role:'grandma',id:'intercept-safe',text:'何叔，别转！先挂电话，把手离开确认键。'}],
 cancel:[{speaker:'周奶奶',role:'grandma',id:'secured-safe',text:'电话挂断，转账取消，银行卡也拿回来了。'}],
 verify:[{speaker:'周奶奶',role:'grandma',id:'verify-brief',text:'原记录没有这笔费用，官方客服也确认不会向个人账户收费。'}],
 result:[{speaker:'周奶奶',role:'grandma',id:'pass-reason',text:'三步都做到了：停手、取卡、原入口核实。第一关通过。'}]
};
function voiceAsset(take){return `assets/audio/${take.role}/${take.id}.wav?v=${AUDIO_BUILD}`}
function voiceForScene(){
 if(currentDetail)return null;
 if(state.stage==='verify'&&!state.verified)return null;
 if(state.stage==='observe'){
  const n=state.completed.length;
  if(n===0)return{speaker:'周奶奶',role:'grandma',id:'observe-intro',signature:'observe:0',text:'先陪我看看。何叔今晚，有哪三处和平常不一样？'};
  if(n<3)return{speaker:'周奶奶',role:'grandma',id:'observe-partial',signature:`observe:${n}`,text:'这处记下了。再看看另外几处。'};
  return{speaker:'周奶奶',role:'grandma',id:'observe-complete',signature:'observe:3',text:'三处都对上了。我得跟过去。'};
 }
 const queue=STORY_VOICES[state.stage]||[];
 return queue.map((take,index)=>({...take,signature:`${state.stage}:${index}`})).find(take=>!playedVoiceSignatures.has(take.signature))||null;
}
function stopCharacterVoice(){
 voiceToken++;if(voiceAudio){voiceAudio.onended=null;try{voiceAudio.stop()}catch{}voiceAudio=null}
 game.classList.remove('character-speaking');ui.querySelectorAll('.speaker.voice-active').forEach(el=>el.classList.remove('voice-active'));delete game.dataset.voiceSpeaker;voiceCaption.hidden=true;voiceCaption.textContent='';voiceCaption.removeAttribute('data-role');voiceCaption.removeAttribute('data-speaker');voiceCaption.removeAttribute('aria-label');
}
function playCharacterVoice(){
 const take=voiceForScene();if(!sound||!take||playedVoiceSignatures.has(take.signature))return false;
 stopCharacterVoice();clearTimeout(autoTimer);const my=voiceToken;game.dataset.voiceState='loading';warmVoices();
 const done=()=>{if(my!==voiceToken)return;voiceAudio=null;game.classList.remove('character-speaking');ui.querySelectorAll('.speaker.voice-active').forEach(el=>el.classList.remove('voice-active'));delete game.dataset.voiceSpeaker;voiceCaption.hidden=true;const linger=state.stage==='verify'?1400:state.stage==='result'?1200:450;autoTimer=setTimeout(()=>{if(!playCharacterVoice())scheduleAutoAdvance(linger)},260)};
 prepareVoice(take).then(async buffer=>{
  if(my!==voiceToken||!sound)return;
  const context=unlockAudio();await context.resume();if(my!==voiceToken)return;
  if(context.state!=='running')throw Error('声音需要点一下开启');
  const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.onended=()=>{game.dataset.voiceState='ended';done()};voiceAudio=source;
  voiceCaption.textContent=take.text;voiceCaption.dataset.role=take.role;voiceCaption.dataset.speaker=take.speaker;voiceCaption.setAttribute('aria-label',`${take.speaker}：${take.text}`);voiceCaption.hidden=false;game.classList.add('character-speaking');game.dataset.voiceSpeaker=take.speaker;game.dataset.voiceState='playing';
  source.start();playedVoiceSignatures.add(take.signature);
 }).catch(error=>{
  if(my!==voiceToken)return;game.dataset.voiceState='error';voiceCaption.textContent='配音暂未就绪，点一下继续。';voiceCaption.hidden=false;
  modal('这句配音还没准备好。点一下重新加载，剧情会从当前这句继续。',button('继续播放配音','retry-voice'));
  console.warn('配音准备失败',take.id,error.message);
 });
 return true;
}
const ICONS={back:'<path d="m14 6-6 6 6 6"/>',sound:'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',muted:'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.2 1.6c-1.5 1-1.9 1.2-1.9 2.7"/><path d="M12 16.5h.01"/>',check:'<path d="m5 12 4 4L19 6"/>',target:'<circle cx="12" cy="12" r="6.5"/><path d="M12 1v7m0 8v7M1 12h7m8 0h7"/>'};
function icon(name){return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`}
function grandmaDialogue(text){return `<div class="character-dialogue"><span class="avatar" aria-hidden="true"></span><div><div class="speaker">周奶奶</div><p>${text}</p></div></div>`}
const DATA={
 shutter:{title:'半落的卷帘门',image:'06',x:.55,y:.215,observation:'营业时间还没结束，卷帘门已经落下一半。',question:'对照营业时间，何叔今天有什么反常？',options:['比平时提前关店','正好到正常关店时间'],right:0,wrong:'看看营业时间，再和现在的时间比一比。',reason:'何叔今天提前关店，值得跟进。但仅凭这一点，还不能判断电话是真是假。'},
 account:{title:'收款便签',image:'15',x:.336,y:.635,observation:'收款人写的是个人账户。',question:'这张便签里，哪一点最值得警惕？',options:['金额写在纸上','费用要转给个人账户'],right:1,wrong:'金额写在纸上不代表异常。再看看收款人的身份。',reason:'“官方费用”却要求转给个人账户，是需要立即暂停的风险信号。'},
 phone:{title:'何叔手中的手机',image:'16',x:.531,y:.583,observation:'对方持续催促，还要求何叔不要回原来的 App。',question:'哪句话在阻止何叔自己核实？',options:['不要回原 App','还剩 08:42'],right:0,wrong:'倒计时是在催促。再找找，哪句话不让何叔自己去查？',reason:'持续催促，并阻止回原入口核实。这两个信号需要放在一起看。'}
};
const SHOTS={intro:['01','开场'],message:['02','陌生消息'],call:['02','陌生来电'],reaction:['02','何叔的迟疑'],pressure:['02','来电施压'],raise:['04','开始观察'],observe:['03','场景调查'],lower:['09','倒计时逼近'],pause:['10','拦下转账'],cancel:['20','风险已止'],verify:['11','核实结果'],result:['13','过关判定'],finish:['14','第一关通过']};
const AUTO={intro:['message',3000],message:['call',3400],call:['reaction',3600],reaction:['pressure',3200],pressure:['raise',5000],raise:['observe',3600],pause:['complete-interrupt',1400],cancel:['verify',1400],result:['finish',2600]};
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2300)}
function beep(kind='tap'){if(!sound)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.connect(gain);gain.connect(audioContext.destination);osc.frequency.value=kind==='hangup'?320:kind==='message'?780:540;gain.gain.setValueAtTime(.028,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.15);osc.start();osc.stop(audioContext.currentTime+.16)}catch{}}
function play(el,keyframes,duration=450,options={}){if(!el)return Promise.resolve();const a=el.animate(keyframes,{duration:reduced?0:duration,easing:'cubic-bezier(.22,.7,.28,1)',fill:'forwards',...options});animations.push(a);return a.finished.catch(()=>{})}
function stopAnimations(){for(const a of animations){try{a.finish()}catch{a.cancel()}}animations=[];skip.hidden=true}
function button(text,action){return `<button class="primary" data-action="${action}">${text}</button>`}
function panel(speaker,text,label,action,extra=''){return `<div class="spacer"></div><section class="panel dialogue"><div class="speaker">${speaker}</div><p>${text}</p>${extra}${label?button(label,action):''}</section>`}
/* 自动剧情只使用画面、配音和黑底字幕，不再叠加白色说明卡。 */
const autoCue='';
function autoPanel(){return ''}
function header(title){return CaseChrome.header({title:'第一关 · '+title,progress:state.completed.length+'/3',progressLabel:`已调查 ${state.completed.length} 处，共 3 处`,sound,first:true})}
function visual(id){if(id==='account')return `<div class="evidence-visual wood"><div class="notebook">转账金额：1,999 元<br>收款人：李某（个人账户）<br>备注：贷款解冻费</div></div>`;if(id==='shutter')return `<div class="evidence-visual"><img src="${art('06')}" alt="半落卷帘门"><div class="sign-info">营业时间　18:00—24:00<br>当前时间　22:17</div></div>`;return `<div class="evidence-visual"><img src="${art('16')}" alt="何叔手中的手机"><div class="phone-info">陌生号码 · 消息记录<br><div class="bubble">还剩 08:42，不要挂电话。</div><div class="bubble">不要回原 App，照我说的做。</div></div></div>`}
function detailHTML(){const d=DATA[currentDetail.id],done=state.completed.includes(currentDetail.id),preview=false,correct=answer===d.right;
 return header('证据判断')+`<section class="panel evidence ${done?'evidence-complete':'evidence-judging'}"><div class="evidence-title"><span class="tag ${done?'done':''}">${done?'已调查':currentDetail.id==='account'?'收款便签':currentDetail.id==='shutter'?'卷帘门':'手机消息'}</span><div><small>${done?'线索回看':'发现线索 · 直接判断'}</small><h2>${done?'为什么要暂停？':currentDetail.id==='account'?'看清便签上的信息':currentDetail.id==='shutter'?'对照营业时间':'看看对方说了什么'}</h2></div></div>${visual(currentDetail.id)}${done?`<div class="feedback correct">判断依据<br>${d.reason}</div>${button('返回现场','close-detail',true)}`:`<p class="question">${d.question}</p>${d.options.map((v,i)=>`<button class="option ${answer===i?(correct?'selected-right':'selected-wrong'):''}" data-answer="${i}"${correct?' disabled':''}><b>${String.fromCharCode(65+i)}</b>${v}</button>`).join('')}${answer===null?'':`<div class="feedback ${correct?'correct':''}" role="status">${correct?'判断正确 · 已记下线索':d.wrong}</div>`}${correct?'<div class="auto-return">自动返回现场…</div>':'<button class="minor" data-action="close-detail">返回现场</button>'}`}</section>`;
}
function storyHTML(){switch(state.stage){
 case'intro':return autoPanel('晚上 22:17 · 白昼街','晚上 22:17，白昼街的小店里，何叔收到一条消息。','<button class="minor" data-action="skip-intro">跳过案件开场</button>');
 case'message':return autoPanel('何叔','解冻费？我下午刚提交申请……');
 case'call':return autoPanel('陌生来电','“何先生，你今天下午 15:26 提交的申请，现在需要处理一下。”');
 case'reaction':return autoPanel('何叔','“时间是对的……可这笔费用，我怎么没见过？”');
 case'pressure':return autoPanel('陌生来电','“现在不处理，今晚就影响征信。别回原来的 App，那里查不到。把收款信息记好，去自助银行转。”');
 case'raise':return autoPanel('周奶奶 · 家中窗边','我看见何叔写了张便签，又提前拉下卷帘门。这个动静，和平时不太一样。我们仔细看看。');
 case'observe':return `<div class="observe-touch" aria-label="找出何叔今晚三处不对劲；点击目标，或拖动望远镜"></div><div class="spacer"></div>`;
 case'lower':return `<div class="spacer"></div><section class="panel decision-panel crisis-panel"><div class="decision-status"><span>转账倒计时</span><strong>00:42</strong></div><h2>何叔已经把卡插进去了</h2><p>周奶奶现在该怎么做？</p><div class="decision-options"><button data-action="choose-listen"><b>继续听</b><span>对方也许能解释清楚</span></button><button data-action="choose-stop" class="danger-choice"><b>立即止损</b><span>挂断电话，取消并取回卡</span></button><button data-action="choose-wait"><b>先输金额</b><span>不点确认就不会有事</span></button></div>${decisionFeedback?`<div class="decision-feedback" role="status">${decisionFeedback}</div>`:''}</section>`;
 case'pause':return autoPanel('周奶奶','何叔，别转！先挂电话，把手离开确认键。');
 case'cancel':return autoPanel('风险已止','电话挂断，转账取消，银行卡也拿回来了。');
 case'verify':return state.verified?`<div class="spacer"></div><article class="official-letter" aria-label="原申请平台官方核实回函"><div class="letterhead"><span class="letter-monogram" aria-hidden="true">函</span><div><div class="letter-sender">原申请平台 · 官方客户服务</div><div class="letter-type">申请事项核实回函</div></div></div><div class="letter-rule"></div><p class="letter-recipient">何先生：</p><p class="letter-conclusion">无需缴纳解冻费</p><p class="letter-body">申请记录正常，请勿向个人账户转账。</p><div class="letter-signature"><span>官方客户服务</span><span class="letter-seal">已核实</span></div><button class="letter-next" data-action="official-read">继续结案 <span aria-hidden="true">→</span></button></article>`:`<div class="spacer"></div><section class="panel decision-panel verify-decision"><div class="decision-status"><span>电话已挂断</span><strong>继续核实</strong></div><h2>下一步从哪里查？</h2><p>选错入口，仍可能回到骗子的控制里。</p><div class="decision-options"><button data-action="verify-link"><b>短信里的链接</b><span>打开“客服处理页”</span></button><button data-action="verify-callback"><b>回拨刚才号码</b><span>再问一次解冻费</span></button><button data-action="verify-original" class="safe-choice"><b>原来的 App</b><span>查看申请记录和官方客服</span></button></div>${decisionFeedback?`<div class="decision-feedback" role="status">${decisionFeedback}</div>`:''}</section>`;
 case'result':return `<div class="spacer"></div><section class="panel pass-panel"><div class="pass-kicker">过关判定</div><h2>你做对了两个关键决定</h2><div class="pass-list"><span>✓ 及时止损</span><span>✓ 取回银行卡</span><span>✓ 从原入口核实</span></div><strong>第一关通过</strong></section>`;
 case'finish':return `<div class="spacer"></div><section class="panel finish-panel"><div class="pass-badge" aria-hidden="true">✓</div><div class="speaker">窗外有事 · 第一关</div><h2>成功阻止可疑转账</h2><p>因为你完成了三步：</p><div class="finish-steps"><b>停手</b><span>→</span><b>取卡</b><span>→</span><b>原入口核实</b></div>${seriesMode?'<p class="series-unlocked">第二关「手机自己去赶集」已解锁</p>'+button('进入第二关','next-level')+'<button class="minor" data-action="series-map">返回关卡地图</button>':button('再玩一次','restart')}</section>`;
 }}
function pos(d){const w=game.clientWidth,h=game.clientHeight,scale=Math.max(w/1080,h/1920);return{x:(w-1080*scale)/2+d.x*1080*scale,y:(h-1920*scale)/2+d.y*1920*scale}}
function drawLens(x,y){const w=game.clientWidth,h=game.clientHeight,k=Math.min(1,w/393),r=(state.completed.length===0?92:108)*k;x=Math.max(24,Math.min(w-24,x));y=Math.max(105,Math.min(h-190,y));state.lens={x:x/w,y:y/h};const lens=effects.querySelector('.lens'),mask=effects.querySelector('.lens-backdrop');if(lens){lens.style.width=lens.style.height=2*r+'px';lens.style.left=x-r+'px';lens.style.top=y-r+'px';mask.style.background=`radial-gradient(circle at ${x}px ${y}px, transparent ${r-4}px, rgba(0,0,0,.80) ${r-2}px)`}}
function installObserve(){effects.innerHTML='<div class="lens-backdrop"></div><div class="lens">'+icon('target')+'</div>';const initialTarget=state.completed.length===0?pos(DATA.shutter):null;drawLens(initialTarget?.x??state.lens.x*game.clientWidth,initialTarget?.y??state.lens.y*game.clientHeight);
 const target=ui;
 for(const[id,d]of Object.entries(DATA)){const p=pos(d),b=document.createElement('button');b.className='hotspot'+(state.completed.includes(id)?' done':'');b.dataset.clue=id;if(state.completed.includes(id))b.innerHTML=icon('check');b.setAttribute('aria-label','调查'+d.title);b.style.left=p.x+'px';b.style.top=p.y+'px';ui.appendChild(b)}
 const cue=()=>{ui.querySelectorAll('.hint').forEach(x=>x.classList.remove('hint'));ui.querySelector('.hotspot:not(.done)')?.classList.add('hint')};cue();
 dragAbort=new AbortController();let start=null;
 target.addEventListener('pointerdown',e=>{if(busy||!e.target.closest('.observe-touch,.hotspot'))return;start={x:e.clientX,y:e.clientY,id:e.target.closest('.hotspot')?.dataset.clue};target.setPointerCapture(e.pointerId);if(!start.id)move(e)},{signal:dragAbort.signal});
 function move(e){if(!start)return;const r=game.getBoundingClientRect();drawLens(e.clientX-r.left,e.clientY-r.top)}
 target.addEventListener('pointermove',move,{signal:dragAbort.signal});target.addEventListener('pointerup',async e=>{if(!start)return;const origin=start;const shortClick=Math.hypot(e.clientX-origin.x,e.clientY-origin.y)<6;if(!origin.id||!shortClick)move(e);start=null;save();if(origin.id&&shortClick){busy=true;await moveLensTo(origin.id,false);busy=false;await openDetail(origin.id);return}const x=state.lens.x*game.clientWidth,y=state.lens.y*game.clientHeight;const nearest=Object.entries(DATA).map(([id,d])=>({id,p:pos(d)})).sort((a,b)=>Math.hypot(a.p.x-x,a.p.y-y)-Math.hypot(b.p.x-x,b.p.y-y))[0];if(Math.hypot(nearest.p.x-x,nearest.p.y-y)<=49)openDetail(nearest.id)},{signal:dragAbort.signal});target.addEventListener('pointercancel',()=>{start=null},{signal:dragAbort.signal});
}
async function moveLensTo(id,open=true){const p=pos(DATA[id]),from={x:state.lens.x*game.clientWidth,y:state.lens.y*game.clientHeight};if(reduced)drawLens(p.x,p.y);else{const start=performance.now();await new Promise(resolve=>{function frame(now){const t=Math.min(1,(now-start)/260),v=1-(1-t)**3;drawLens(from.x+(p.x-from.x)*v,from.y+(p.y-from.y)*v);if(t<1)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)})}save();if(open)await openDetail(id)}
function clean(){clearInterval(hintTimer);clearTimeout(autoTimer);clearTimeout(toast.timer);document.querySelector('#toast').classList.remove('show');dragAbort?.abort();effects.innerHTML='';stopCharacterVoice();stopAnimations()}
function scheduleAutoAdvance(delayOverride=null){
 clearTimeout(autoTimer);if(currentDetail||game.classList.contains('opening-active')||document.hidden)return;
 let next=AUTO[state.stage];if(state.stage==='observe'&&state.completed.length===3)next=['lower',1100];if(!next)return;
 const stage=state.stage,delay=delayOverride??(state.stage==='verify'?3000:reduced?Math.min(next[1],900):next[1]);autoTimer=setTimeout(()=>{if(!busy&&!currentDetail&&state.stage===stage&&!game.querySelector('dialog'))action(next[0])},delay);
}
async function render({transition='cut',focus=null}={}){
 const my=++token;busy=true;game.classList.add('busy');clean();
 const imageId=currentDetail?'03':SHOTS[state.stage][0],useLoop=state.stage==='observe'&&!currentDetail;let media,loopFallback=false;
 if(useLoop){
  media=document.createElement('video');media.poster=art('03');media.preload='auto';media.loop=true;media.muted=true;media.playsInline=true;media.setAttribute('aria-label','何叔店内的三条可调查线索循环画面');
  try{media.src=await CaseMedia.url(video('L01.mp4'))}catch{}
  try{await Promise.race([new Promise((resolve,reject)=>{if(media.readyState>=2)return resolve();media.addEventListener('loadeddata',resolve,{once:true});media.addEventListener('error',reject,{once:true});media.load()}),new Promise((_,reject)=>setTimeout(reject,15000))])}catch{media=new Image();media.src=art('03');try{await media.decode()}catch{}loopFallback=true}
 }else{media=new Image();media.src=art(imageId);try{await media.decode()}catch{if(my!==token)return;busy=false;game.classList.remove('busy');modal('这张图片暂时没能读到。进度保留，可以重试当前画面。',button('重新加载图片','retry-image')+'<button class="minor" data-action="restart">从头再玩</button>');return}}
 if(my!==token)return;
 const old=document.createElement('div');old.className='old-frame';if(scene.firstChild){old.innerHTML=scene.innerHTML;const prevPhoto=old.querySelector('.scene-photo'),currentPhoto=scene.querySelector('.scene-photo');if(prevPhoto&&currentPhoto)prevPhoto.style.transform=getComputedStyle(currentPhoto).transform;scene.querySelector('video')?.pause();const oldUI=ui.cloneNode(true);oldUI.removeAttribute('id');Object.assign(oldUI.style,{position:'absolute',inset:'0',display:'flex',flexDirection:'column',padding:'20px 13px 19px',gap:'12px'});old.appendChild(oldUI)}
 cover.replaceChildren(old);media.className='scene-photo'+(useLoop&&!loopFallback?' scene-video':'');if(media instanceof HTMLImageElement)media.alt=currentDetail?'调查现场':SHOTS[state.stage][1];scene.replaceChildren(media);scene.insertAdjacentHTML('beforeend','<div class="shade"></div>');if(media instanceof HTMLVideoElement&&!reduced)media.play().catch(()=>{});game.dataset.stage=state.stage;game.classList.toggle('has-evidence',Boolean(currentDetail)||(state.stage==='verify'&&state.verified));
 game.classList.toggle('indoor',!['intro','message','observe'].includes(state.stage));
 ui.innerHTML=currentDetail?detailHTML():header(SHOTS[state.stage][1])+storyHTML();
 if(state.stage==='observe'&&!currentDetail)installObserve();else if(['intro','message'].includes(state.stage))effects.innerHTML='<div class="rain"></div>';
 document.querySelector('#debug').textContent=currentDetail?`${DATA[currentDetail.id].title} · ${currentDetail.mode}`:useLoop&&!loopFallback?'调查循环 · 5s':SHOTS[state.stage][1];
 const duration=transition==='none'?0:transition==='iris'?650:transition==='travel'?650:transition==='focus'?480:360;
 if(old.childNodes.length){skip.hidden=reduced;const tasks=[play(old,[{opacity:1},{opacity:0}],duration)];
  if(transition==='focus'){const origin=focus?`${focus.x}px ${focus.y}px`:'50% 42%';old.style.transformOrigin=origin;tasks.push(play(old,[{transform:'scale(1)'},{transform:'scale(1.13)'}],duration))}
  if(transition==='iris')tasks.push(play(ui,[{clipPath:'circle(0% at 57% 34%)'},{clipPath:'circle(140% at 57% 34%)'}],duration));
  if(transition==='travel')tasks.push(play(media,[{transform:'scale(1.075) translateX(1.2%)'},{transform:'scale(1.035) translateX(0)'}],duration));
  await Promise.all(tasks);
 }
 if(my!==token)return;cover.replaceChildren();skip.hidden=true;busy=false;game.classList.remove('busy');
 if(!currentDetail&&!['observe','verify','result','finish'].includes(state.stage)){
  const focal={reaction:'56% 35%',pause:'52% 52%',cancel:'57% 55%',intro:'63% 38%'}[state.stage]||'50% 42%';media.style.transformOrigin=focal;play(media,[{transform:'scale(1)'},{transform:'scale(1.045)'}],3000,{easing:'ease-out'});
 }
 if(loopFallback)toast('调查循环未能加载，已切换为静态画面。');
 save();markSeriesComplete();preloadNext();if(!game.classList.contains('opening-active')){warmSecondChapter();if(!playCharacterVoice())scheduleAutoAdvance()}return true;
}
function preloadNext(){const i=F.stages.indexOf(state.stage);for(const s of F.stages.slice(i+1,i+3)){const im=new Image();im.src=art(SHOTS[s][0])}}
async function go(to,transition='cut'){currentDetail=null;answer=null;decisionFeedback=null;state=F.advance(state,to);await render({transition});if(!['intro','message'].includes(to))stopRain()}
async function openDetail(id){if(busy||currentDetail)return;currentDetail={id,mode:state.completed.includes(id)?'done':'judge'};answer=null;beep();await render({transition:'focus',focus:pos(DATA[id])})}
function modal(text,actions='<button class="primary" data-action="close-modal">知道了</button>'){clearTimeout(autoTimer);game.querySelector('dialog')?.remove();const d=document.createElement('dialog');d.innerHTML=`<p>${text}</p>${actions}`;game.appendChild(d);d.showModal()}
async function action(a){
 if(a==='retry-voice'){unlockAudio();game.querySelector('dialog')?.remove();playCharacterVoice();return}
 if(a==='official-read'){stopCharacterVoice();await go('result');return}
 if(a==='close-modal'){game.querySelector('dialog')?.close();game.querySelector('dialog')?.remove();scheduleAutoAdvance();return}
 if(busy)return;
 switch(a){
 case'next-level':location.assign('../second/index.html?series=1&v=20261021-polish1');return;
 case'series-map':location.assign('../index.html?v=20261021-polish1');return;
 case'restart':game.querySelector('dialog')?.remove();state=F.fresh();playedVoiceSignatures.clear();try{localStorage.removeItem(KEY)}catch{}await startPrologue();return;
 case'retry-image':game.querySelector('dialog')?.remove();await render();return;
 case'skip-intro':await go('raise');toast('何叔正准备提前关店去转账。先调查现场三处线索。');return;
 case'choose-listen':state=F.chooseStop(state,'listen');decisionFeedback='对方趁机继续催促：“只剩几十秒，别挂！”——继续听只会让何叔更慌。';beep('message');await render({transition:'none'});return;
 case'choose-wait':state=F.chooseStop(state,'wait');decisionFeedback='危险：金额和账户一旦输完，下一步很容易误触确认。现在就要停下来。';beep('message');await render({transition:'none'});return;
 case'choose-stop':state=F.chooseStop(state,'stop');beep('hangup');await go('pause','travel');return;
 case'complete-interrupt':state=F.secure(state);await go('cancel','focus');return;
 case'verify-link':state=F.verifySource(state,'link');decisionFeedback='这个链接也是陌生人发来的，页面和电话都可能是同一套骗局。';beep('message');await render({transition:'none'});return;
 case'verify-callback':state=F.verifySource(state,'callback');decisionFeedback='回拨仍会接回陌生人，无法形成独立核实。';beep('message');await render({transition:'none'});return;
 case'verify-original':state=F.verifySource(state,'original');beep();await render({transition:'focus'});return;
 case'review-verify':modal('已从原申请入口查看：当前无待缴费用，申请记录正常。陌生来电却要求向李某的个人账户支付 1,999 元。');return;
 case'judge':currentDetail.mode='judge';await render({transition:'focus'});return;
 case'submit':if(currentDetail&&answer===DATA[currentDetail.id].right){const completedId=currentDetail.id;state=F.submit(state,completedId,true);const p=pos(DATA[completedId]);currentDetail=null;answer=null;await render({transition:'focus',focus:p});beep();const next=F.clues.find(id=>!state.completed.includes(id));if(next){await moveLensTo(next,false);ui.querySelector(`[data-clue="${next}"]`)?.classList.add('hint')}}return;
 case'close-detail':currentDetail=null;answer=null;await render();return;
 case'sound':sound=!sound;beep();const b=ui.querySelector('[data-action="sound"]');b.innerHTML=icon(sound?'sound':'muted');b.setAttribute('aria-pressed',String(sound));b.setAttribute('aria-label',(sound?'关闭':'开启')+'声音');if(!sound){stopRain();stopCharacterVoice();scheduleAutoAdvance()}else{unlockAudio();if(['intro','message'].includes(state.stage))syncRain();if(!playCharacterVoice())scheduleAutoAdvance()}toast(sound?'声音已开启':'声音已关闭');return;
 case'help':if(state.stage==='observe'&&!currentDetail){const id=F.clues.find(x=>!state.completed.includes(x));if(id){await moveLensTo(id,false);toast('点击镜片中心附近的目标，即可查看。')}else toast('三处都已调查，剧情会自动继续。')}else if(state.stage==='lower')modal('此刻要先切断骗子的持续施压，并让何叔停止操作、取回银行卡。');else if(state.stage==='verify'&&!state.verified)modal('核实要与陌生来电完全隔离。回到原来的申请入口，或主动查找官方客服。');else modal('前半段剧情自动播放；调查线索和两个关键决定由你完成。');return;
 case'back':if(currentDetail){await action('close-detail');return}modal('进度已保存在此浏览器。你可以继续体验，或从开场重新开始。',button('继续体验','close-modal',true)+'<button class="minor" data-action="restart">从头再玩</button>'+(seriesMode?'<button class="minor" data-action="series-map">返回关卡地图</button>':''));return;
 default:if(F.stages.includes(a))await go(a,a==='observe'?'iris':['lower','pause'].includes(a)?'travel':a==='reaction'?'focus':'cut');
 }}
game.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='skip'){stopAnimations();return}try{if(b.dataset.action)await action(b.dataset.action);else if(b.dataset.clue&&!busy){busy=true;await moveLensTo(b.dataset.clue,false);busy=false;await openDetail(b.dataset.clue)}else if(b.dataset.answer!==undefined&&!busy&&currentDetail){const clueId=currentDetail.id;answer=Number(b.dataset.answer);const correct=answer===DATA[clueId].right;await render();if(correct&&currentDetail?.id===clueId){busy=true;game.classList.add('busy');await new Promise(resolve=>setTimeout(resolve,650));busy=false;game.classList.remove('busy');await action('submit')}}}catch(error){console.error(error);toast(error.message);busy=false;game.classList.remove('busy')}});
document.querySelector('#restart').onclick=()=>{if(!busy)action('restart')};
document.querySelector('#to-observe').onclick=async()=>{if(busy)return;sound=true;prologue.cancel();prologue.remember(false);ui.hidden=false;game.classList.remove('opening-active');stopRain();state=F.fresh();await go('observe','iris')};
function setReduced(){game.classList.toggle('reduced',reduced);document.querySelector('#motion').textContent='减弱动画：'+(reduced?'开':'关');document.querySelector('#motion').setAttribute('aria-pressed',String(reduced));const loop=scene.querySelector('.scene-video');if(reduced){stopAnimations();loop?.pause()}else loop?.play().catch(()=>{})}
document.querySelector('#motion').onclick=()=>{reduced=!reduced;setReduced()};setReduced();
window.addEventListener('resize',()=>{if(state.stage==='observe'&&!currentDetail&&!busy)render()});
document.addEventListener('visibilitychange',()=>{const loop=scene.querySelector('.scene-video');if(document.hidden){clearTimeout(autoTimer);stopAnimations();loop?.pause();if(!prologue.active)save();audioContext?.suspend()}else{if(sound)audioContext?.resume();if(!reduced)loop?.play().catch(()=>{});if(!prologue.active&&!voiceAudio&&!playCharacterVoice())scheduleAutoAdvance()}});
let rainSource=null,rainGain=null;
function stopRain(){if(rainSource){try{rainSource.stop()}catch{}rainSource.disconnect();rainSource=null;rainGain?.disconnect();rainGain=null}}
function syncRain(){if(!sound){stopRain();return}if(rainSource)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const buffer=audioContext.createBuffer(1,audioContext.sampleRate*2,audioContext.sampleRate),data=buffer.getChannelData(0);let previous=0;for(let i=0;i<data.length;i++){previous=(previous+.03*(Math.random()*2-1))/1.03;data[i]=previous*2.8}rainSource=audioContext.createBufferSource();rainSource.buffer=buffer;rainSource.loop=true;rainGain=audioContext.createGain();rainGain.gain.value=.12;rainSource.connect(rainGain);rainGain.connect(audioContext.destination);rainSource.start()}catch{}}
const prologue=new CasePrologue({host:document.querySelector('#prologue'),isReduced:()=>reduced,icons:icon,
 enterCase:async()=>{currentDetail=null;answer=null;state=F.fresh();return await render({transition:'none'})},
 revealCase:()=>{ui.hidden=false;game.classList.remove('opening-active');syncRain();document.querySelector('#debug').textContent=SHOTS[state.stage][1];if(!voiceAudio&&!playCharacterVoice())scheduleAutoAdvance();warmSecondChapter()},
 onShopVisible:()=>beep('message'),
 toggleSound:()=>{sound=!sound;return sound},
 ensureSound:()=>{sound=true;unlockAudio();warmVoices();return sound},
 onPhase:phase=>{if(phase==='playing')warmLoopVideo();if(phase!=='idle')document.querySelector('#debug').textContent=({loading:'开场 · 准备视频',ready:'V01 · 等待播放',playing:'V01 · 周奶奶自我介绍',complete:'V01 · 播放完成',entering:'进入第一关',chapter:'第一关 · 窗外有事',error:'开场 · 静帧回退'})[phase]||phase}
});
async function startPrologue(){token++;clean();stopRain();busy=false;game.classList.remove('busy');game.classList.add('opening-active');ui.hidden=true;currentDetail=null;answer=null;await prologue.start({sound})}
let introPending=false;try{introPending=sessionStorage.getItem('window-case-prologue-v2')==='pending'}catch{}
const initialEntry=F.entry(savedCase,introPending);if(initialEntry==='case')render();else startPrologue();
