const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../dist/series');
const first=fs.readFileSync(path.join(root,'first/app.js'),'utf8');
const second=fs.readFileSync(path.join(root,'second/episode2.js'),'utf8');
function firstHarness(){
  const flowContext={};vm.runInNewContext(fs.readFileSync(path.join(root,'first/flow.js'),'utf8'),flowContext);const F=flowContext.CaseFlow;
  const context=vm.createContext({F,state:F.fresh(),currentDetail:null,answer:null,decisionReady:null,decisionFeedback:null,busy:false,sound:false,seriesMode:false,art:x=>x,CaseChrome:{header:()=>''},render:async()=>{},stopRain:()=>{},beep:()=>{}});
  vm.runInContext(first.slice(first.indexOf('const DATA='),first.indexOf('function pos(')),context);
  vm.runInContext(first.slice(first.indexOf('async function go('),first.indexOf('async function openDetail(')),context);
  vm.runInContext(first.slice(first.indexOf('async function action('),first.indexOf("game.addEventListener('click'")),context);
  return context;
}
for(const [id,right] of [['shutter',0],['account',1],['phone',0]])test(`first clue ${id} waits for explicit continuation`,()=>{
  const c=firstHarness();c.currentDetail={id,mode:'judge'};c.answer=right;
  const html=vm.runInContext('detailHTML()',c);
  assert.match(html,/data-action="submit">继续剧情/);assert.doesNotMatch(html,/自动返回/);
  assert.equal(c.state.completed.length,0);
});
test('first intervention and verification do not advance on the correct answer',async()=>{
  const c=firstHarness();c.state={...c.state,stage:'lower',completed:['shutter','account','phone']};
  await c.action('choose-listen');assert.equal(c.decisionReady,null);assert.equal(c.state.stage,'lower');
  await c.action('choose-stop');assert.equal(c.state.stage,'lower');assert.equal(c.state.stopped,false);
  assert.match(vm.runInContext('storyHTML()',c),/data-action="question-continue">继续剧情/);
  await c.action('question-continue');assert.equal(c.state.stage,'pause');assert.equal(c.state.stopped,true);
  c.state=c.F.advance(c.F.secure(c.state),'verify');
  await c.action('verify-link');assert.equal(c.decisionReady,null);assert.equal(c.state.verified,false);
  await c.action('verify-original');assert.equal(c.state.verified,false);
  assert.match(vm.runInContext('storyHTML()',c),/data-action="question-continue">继续剧情/);
  await c.action('question-continue');assert.equal(c.state.verified,true);
  assert.doesNotMatch(vm.runInContext('storyHTML()',c),/data-action="question-continue"/);
});
for(const [id,correct] of [['first',1],['permission',2],['deduce',2],['code',2]])test(`second ${id} waits after correct answer and allows retry after wrong answer`,()=>{
  let advanced=0,timers=0;const feedback={innerHTML:''},advance={hidden:true};
  const buttons=[0,1,2].map(i=>({dataset:{answer:String(i)},disabled:false,classList:{add(){}},addEventListener:(_,fn)=>buttons[i].click=fn}));
  const ui={innerHTML:'',querySelectorAll:()=>buttons,querySelector:s=>s==='#feedback'?feedback:advance};
  const c=vm.createContext({ui,image:{},backdrop:()=>{},topbar:()=>'',escapeHtml:x=>x,bindHeader:()=>{},next:()=>advanced++,setTimeout:()=>timers++});
  vm.runInContext(second.slice(second.indexOf('const questions ='),second.indexOf('let index =')),c);
  vm.runInContext(second.slice(second.indexOf('function showQuestion('),second.indexOf('function showOutcome(')),c);
  c.showQuestion(id);buttons[(correct+1)%3].click();assert.equal(advance.hidden,true);assert.ok(buttons.every(b=>!b.disabled));
  buttons[correct].click();assert.equal(advanced,0);assert.equal(timers,0);assert.equal(advance.hidden,false);assert.ok(buttons.every(b=>b.disabled));
  advance.onclick();assert.equal(advanced,1);
});
test('clue click handler and second question definitions contain no automatic answer transition',()=>{
  const handler=first.slice(first.indexOf("game.addEventListener('click'"),first.indexOf("document.querySelector('#restart').onclick"));
  assert.doesNotMatch(handler,/setTimeout|action\('submit'\)/);
  assert.doesNotMatch(second,/autoAdvance/);
});
