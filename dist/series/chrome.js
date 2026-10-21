window.CaseChrome = (() => {
  const paths = {
    back: '<path d="m14 6-6 6 6 6"/>',
    sound: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    muted: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.2 1.6c-1.5 1-1.9 1.2-1.9 2.7"/><path d="M12 16.5h.01"/>'
  };
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const icon = name => `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  function header({title, progress, sound, first = false, progressLabel = ''}) {
    const attr = action => first ? `data-action="${action}"` : `id="${{back:'pause-control',sound:'sound-control',help:'help-control'}[action]}"`;
    return `<header class="topbar"><button class="icon-button" ${attr('back')} aria-label="打开暂停菜单">${icon('back')}</button><div class="header-chip"><span>${escape(title)}</span><span class="progress" aria-label="${escape(progressLabel || progress)}">${escape(progress)}</span></div><button class="icon-button" ${attr('sound')} aria-pressed="${sound}" aria-label="${sound?'关闭':'开启'}声音">${icon(sound?'sound':'muted')}</button><button class="icon-button" ${attr('help')} aria-label="帮助">${icon('help')}</button></header>`;
  }
  return { header, icon };
})();
