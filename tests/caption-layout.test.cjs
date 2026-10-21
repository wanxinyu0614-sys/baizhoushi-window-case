const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'../dist/series');
test('speech height reserves space and clears when speech ends',()=>{
  let mutation,resize,height=104;
  const classes=new Set(),styles={};
  const game={classList:{toggle:(key,value)=>value?classes.add(key):classes.delete(key)},style:{setProperty:(k,v)=>styles[k]=v}};
  const caption={hidden:false,getClientRects:()=>caption.hidden?[]:[{}],getBoundingClientRect:()=>({height})};
  const context={document:{querySelector:s=>s==='#game'?game:caption},MutationObserver:class{constructor(fn){mutation=fn}observe(){}},ResizeObserver:class{constructor(fn){resize=fn}observe(){}}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'caption-layout.js'),'utf8'),context);
  assert.equal(styles['--caption-height'],'104px');assert.ok(classes.has('caption-visible'));
  height=147;resize();assert.equal(styles['--caption-height'],'147px');
  caption.hidden=true;mutation();assert.equal(styles['--caption-height'],'80px');assert.ok(!classes.has('caption-visible'));
});
test('both chapters load the same bottom caption layout without a lower-stage relocation',()=>{
  const css=fs.readFileSync(path.join(root,'captions.css'),'utf8');
  assert.match(css,/bottom:var\(--caption-bottom\)/);
  assert.doesNotMatch(css,/#game\[data-stage="(?:lower|verify)"\] #voice-caption/);
  for(const chapter of ['first','second'])assert.match(fs.readFileSync(path.join(root,chapter,'index.html'),'utf8'),/caption-layout\.js/);
  assert.doesNotMatch(fs.readFileSync(path.join(root,'first/app.js'),'utf8'),/before\(voiceCaption\)/);
});
