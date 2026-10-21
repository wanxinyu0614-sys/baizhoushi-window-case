(function(root){
 const clues=['shutter','account','phone'];
 const stages=['intro','message','call','reaction','pressure','raise','observe','lower','pause','cancel','verify','result','finish'];
 const fresh=()=>({version:3,stage:'intro',completed:[],callEnded:false,verified:false,stopped:false,serviceConfirmed:false,cardRetrieved:false,lens:{x:.55,y:.215}});
 function restore(raw){
  const base=fresh();if(!raw||raw.version!==3||!stages.includes(raw.stage))return base;
  const s={...base,...raw,completed:[...new Set((Array.isArray(raw.completed)?raw.completed:[]).filter(v=>clues.includes(v)))]};
  if(!Number.isFinite(s.lens?.x)||!Number.isFinite(s.lens?.y))s.lens=base.lens;
  if(stages.indexOf(s.stage)>=stages.indexOf('lower')&&s.completed.length!==3)return base;
  if(stages.indexOf(s.stage)>=stages.indexOf('cancel')&&(!s.callEnded||!s.stopped||!s.cardRetrieved))return base;
  if(stages.indexOf(s.stage)>=stages.indexOf('verify')&&(!s.stopped||!s.cardRetrieved))return base;
  if(stages.indexOf(s.stage)>=stages.indexOf('result')&&(!s.verified||!s.serviceConfirmed))return base;
  return s;
 }
 function submit(s,id,correct){if(!correct||!clues.includes(id))return s;return {...s,completed:[...new Set([...s.completed,id])]};}
 function chooseStop(s,choice){return choice==='stop'?{...s,stopped:true}:s;}
 function secure(s){if(!s.stopped)throw Error('尚未停止转账');return {...s,callEnded:true,cardRetrieved:true};}
 function verifySource(s,source){if(source!=='original')return s;if(!s.stopped||!s.cardRetrieved)throw Error('请先停止操作并取回银行卡');return {...s,verified:true,serviceConfirmed:true};}
 function advance(s,to){
  if(!stages.includes(to))throw Error('未知阶段');
  if(to==='lower'&&s.completed.length!==3)throw Error('尚未完成调查');
  if(to==='cancel'&&(!s.callEnded||!s.stopped||!s.cardRetrieved))throw Error('请先挂断、取消转账并取回银行卡');
  if(to==='verify'&&(!s.stopped||!s.cardRetrieved))throw Error('请先取消转账并取回银行卡');
  if(to==='result'&&(!s.verified||!s.serviceConfirmed))throw Error('请先完成原入口和官方客服核实');
  return {...s,stage:to};
 }
 function entry(raw,pending=false){const valid=raw&&raw.version===3&&stages.includes(raw.stage)&&restore(raw).stage===raw.stage;return valid?'case':pending?'P01':'P00'}
 const api={clues,stages,fresh,restore,submit,chooseStop,secure,verifySource,advance,entry};if(typeof module!=='undefined')module.exports=api;else root.CaseFlow=api;
})(typeof window!=='undefined'?window:globalThis);
