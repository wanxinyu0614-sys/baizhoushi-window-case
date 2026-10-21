/* V01 自带周奶奶配音；开场只播放这一条原始音画轨。 */
class CasePrologue {
 constructor({host,isReduced,enterCase,revealCase,onShopVisible,toggleSound,ensureSound,icons,onPhase}){
  Object.assign(this,{host,isReduced,enterCase,revealCase,onShopVisible,toggleSound,ensureSound,icons,onPhase});
  this.active=false;this.phase='idle';this.epoch=0;this.notified=false;this.sound=false;this.videoEnded=false;
  this.host.addEventListener('click',async e=>{
   const action=e.target.closest('[data-opening]')?.dataset.opening;if(!action)return;
   if(action==='start'&&this.phase==='ready')await this.playOpening();
   if(action==='skip'&&['ready','playing','complete','error'].includes(this.phase))await this.enter(false);
   if(action==='look'&&this.phase==='complete')await this.enter(true);
   if(action==='retry'&&this.phase==='error')await this.start({sound:this.sound});
   if(action==='sound')this.setSound(this.toggleSound());
  });
  document.addEventListener('visibilitychange',()=>{
   if(!this.active)return;
   if(document.hidden)this.pauseMedia();
   else if(this.phase==='playing')this.resumeMedia();
  });
 }
 setPhase(phase){this.phase=phase;this.host.dataset.phase=phase;this.onPhase?.(phase)}
 remember(value){try{if(value)sessionStorage.setItem('window-case-prologue-v2','pending');else sessionStorage.removeItem('window-case-prologue-v2')}catch{}}
 renew(){this.abort?.abort();this.abort=new AbortController();return ++this.epoch}
 current(epoch){return this.active&&epoch===this.epoch}
 pauseMedia(){this.video?.pause()}
 resumeMedia(){if(!this.videoEnded)this.video?.play().catch(()=>{})}
 cancel(){this.pauseMedia();this.active=false;this.renew();this.host.hidden=true;this.host.replaceChildren();this.setPhase('idle')}
 setSound(enabled){
  this.sound=Boolean(enabled);const b=this.host.querySelector('[data-opening="sound"]');
  if(b){b.innerHTML=this.icons(this.sound?'sound':'muted');b.setAttribute('aria-label',(this.sound?'关闭':'开启')+'周奶奶配音');b.setAttribute('aria-pressed',String(this.sound))}
  if(this.video)this.video.muted=!this.sound;
  return this.sound;
 }
 setCaption(time){
  const caption=this.host.querySelector('.opening-caption');if(!caption)return;
  caption.textContent=time<2.25?'叫我周奶奶就好。':time<6.65?'街坊们都说，我呀，爱管点闲事。':'来，陪我看看窗外。';
 }
 async start({sound=false}={}){
  this.cancel();this.active=true;this.notified=false;this.sound=Boolean(sound);const epoch=this.renew();this.remember(true);this.host.hidden=false;this.setPhase('loading');
  this.host.innerHTML=`<div class="opening-stage"><div class="opening-cover" aria-hidden="true"><span>第一关</span><strong>窗外有事</strong></div><video class="opening-video" data-src="assets/video/V01.mp4" preload="none" playsinline muted hidden aria-label="周奶奶在家中介绍自己并转身望向窗外"></video><img class="opening-fallback" src="assets/intro-grandma-front-monocular.jpg" alt="面向玩家的周奶奶"></div><div class="opening-shade" aria-hidden="true"></div><div class="opening-tools"><button class="icon-button" data-opening="sound" aria-label="${this.sound?'关闭':'开启'}周奶奶配音" aria-pressed="${this.sound}">${this.icons(this.sound?'sound':'muted')}</button><button class="opening-skip" data-opening="skip">跳过介绍</button></div><section class="panel opening-card opening-start"><h1>窗外有事</h1><p>周奶奶想跟你说几句话。</p><button class="primary" data-opening="start">播放开场视频</button><small>约 8 秒，点播放后再加载</small></section><p class="opening-caption" aria-live="off" hidden></p><section class="opening-complete" hidden></section><div class="opening-loading" role="status" hidden>正在加载视频…</div><section class="opening-error panel" hidden><p>网络有点慢，可以重试，或直接用图文继续。</p><button class="primary" data-opening="retry">重新加载</button><button class="minor" data-opening="skip">用图文继续</button></section><div class="opening-chapter" hidden><span>第一关</span><strong>窗外有事</strong></div>`;
  this.video=this.host.querySelector('.opening-video');
  this.video.dataset.src+='?v=20261021-mobile1';
  this.video.addEventListener('timeupdate',()=>{if(this.phase==='playing')this.setCaption(this.video.currentTime)});
  this.video.addEventListener('ended',()=>{this.videoEnded=true;if(this.phase==='playing')this.complete()});
  if(this.current(epoch))this.setPhase('ready');
 }
 useFallback(){
  this.pauseMedia();this.video.hidden=true;this.host.querySelector('.opening-cover').hidden=true;this.host.querySelector('.opening-fallback').hidden=false;this.host.querySelector('.opening-loading').hidden=true;this.host.querySelector('.opening-error').hidden=false;this.host.querySelector('.opening-start').hidden=true;this.setPhase('error');
 }
 async playOpening(){
  const epoch=this.epoch;this.host.querySelector('.opening-start').hidden=true;this.host.querySelector('.opening-caption').hidden=false;
  this.setSound(this.ensureSound());this.videoEnded=false;this.video.pause();this.video.playbackRate=1;this.video.currentTime=0;this.setCaption(0);
  const loading=this.host.querySelector('.opening-loading');loading.hidden=false;
  if(!this.video.src){this.video.src=this.video.dataset.src;this.video.load()}
  this.setPhase('loading');
  try{
   await Promise.race([this.video.play(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),20000))]);
   if(!this.current(epoch))return;
   loading.hidden=true;this.host.querySelector('.opening-cover').hidden=true;this.host.querySelector('.opening-shade').hidden=true;this.host.querySelector('.opening-fallback').hidden=true;this.video.hidden=false;this.setPhase('playing');
  }catch{if(this.current(epoch))this.useFallback()}
 }
 complete(){
  if(!this.active||this.phase==='complete')return;this.pauseMedia();this.setPhase('complete');
  const caption=this.host.querySelector('.opening-caption');if(caption)caption.hidden=true;
  const epoch=this.epoch;setTimeout(()=>{if(this.current(epoch)&&this.phase==='complete')this.enter(true)},this.isReduced()?0:350);
 }
 async enter(chapter){
  if(!this.active||this.phase==='entering')return;this.pauseMedia();const epoch=this.renew();this.setPhase('entering');
  this.host.querySelector('.opening-tools').hidden=true;this.host.querySelector('.opening-start').hidden=true;this.host.querySelector('.opening-complete').hidden=true;this.host.querySelector('.opening-error').hidden=true;
  const loading=this.host.querySelector('.opening-loading');loading.textContent='正在准备下一幕…';loading.hidden=false;
  try{const ready=await this.enterCase();if(!ready)throw Error('entry')}catch{if(this.current(epoch)){loading.hidden=true;this.useFallback()}return}
  if(!this.current(epoch))return;loading.hidden=true;
  if(chapter){
   const title=this.host.querySelector('.opening-chapter');title.hidden=false;this.setPhase('chapter');await new Promise(resolve=>setTimeout(resolve,this.isReduced()?180:850));
  }
  if(!this.current(epoch))return;this.notifyShop();this.remember(false);this.cancel();this.revealCase();
 }
 notifyShop(){if(this.notified)return;this.notified=true;this.onShopVisible?.()}
}
