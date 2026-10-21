/* Both chapters share one bottom inset; controls reserve the measured speech height. */
(() => {
  const game=document.querySelector('#game'),caption=document.querySelector('#voice-caption');
  if(!game||!caption)return;
  const update=()=>{
    const visible=!caption.hidden&&caption.getClientRects().length>0;
    game.classList.toggle('caption-visible',visible);
    game.style.setProperty('--caption-height',`${visible?Math.max(80,Math.ceil(caption.getBoundingClientRect().height)):80}px`);
  };
  new MutationObserver(update).observe(caption,{attributes:true,attributeFilter:['hidden','data-speaker'],childList:true,characterData:true,subtree:true});
  new ResizeObserver(update).observe(caption);
  update();
})();
