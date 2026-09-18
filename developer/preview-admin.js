(()=>{
  const root=window.PREMIER_PREVIEW?.ROOT||new URL('../',location.href).href.replace(/\/$/,'');
  const key=window.PREMIER_PREVIEW?.DEMO_KEY||'PREVIEW-DEMO-ACCESS';
  const url=document.querySelector('#apiBase'),k=document.querySelector('#adminKey');
  if(url)url.value=root;if(k){k.type='text';k.value=key;k.readOnly=true}
  const reset=document.querySelector('#resetDemo');
  if(reset)reset.addEventListener('click',()=>{if(confirm('Reset all browser-only preview edits and sample requests?'))window.PREMIER_PREVIEW.reset()});
  const note=document.querySelector('#status');
  setTimeout(()=>{if(note&&!note.classList.contains('error'))note.textContent='Preview connected. Try anything — changes are saved only in this browser and can be reset at any time.'},250);
})();
