const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let key=localStorage.getItem('premierAdminKey')||'';
let apiBase=(localStorage.getItem('premierApiBase')||'http://localhost:8080').replace(/\/$/,'');
let pageDoc=null,currentPage='',pageDirty=false,rawDirty=false;
$('#adminKey').value=key;$('#apiBase').value=apiBase;
function status(t,error=false){const el=$('#status');el.textContent=t;el.classList.toggle('error',error)}
function setOnline(on){$('#connectionPill').textContent=on?'Connected':'Not connected';$('#connectionPill').classList.toggle('online',on);$('#connectionCard')?.classList.toggle('connected',on);if($('#connectBtn'))$('#connectBtn').textContent=on?'Reconnect':'Connect'}
function endpoint(p){return apiBase+p}
async function copyText(value){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(value);return true}}catch{}try{const ta=document.createElement('textarea');ta.value=value;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok}catch{return false}}
async function api(p,opt={}){const headers={...(opt.headers||{}),'X-Admin-Key':key};if(opt.body&&typeof opt.body==='string')headers['Content-Type']='application/json';const r=await fetch(endpoint(p),{...opt,headers});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`Request failed (${r.status})`);return j}

async function uploadImage(file){const fd=new FormData();fd.append('file',file);const r=await fetch(endpoint('/api/admin/media'),{method:'POST',headers:{'X-Admin-Key':key},body:fd});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`Upload failed (${r.status})`);return j.url}

async function openAdminAttachment(storedName){
  const popup=window.open('about:blank','_blank');
  try{
    const r=await fetch(endpoint('/api/admin/uploads/'+encodeURIComponent(storedName)),{headers:{'X-Admin-Key':key},cache:'no-store'});
    if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||`Attachment failed (${r.status})`)}
    const blob=await r.blob(),url=URL.createObjectURL(blob);
    if(popup)popup.location.href=url;else window.open(url,'_blank');
    setTimeout(()=>URL.revokeObjectURL(url),120000);
  }catch(e){if(popup)popup.close();status('Could not open attachment: '+e.message,true)}
}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function attr(s=''){return esc(s)}function displayUrl(u=''){u=String(u);return u.startsWith('/')?apiBase+u:u}
const titles={dashboard:'Overview',pages:'Page Editor',requests:'Requests',appearance:'Appearance',branding:'Branding',media:'Media Library',blog:'Blog',contact:'Contact',tools:'Site Tools',health:'Health & Backup'};
function show(name){$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$$('.view').forEach(v=>v.classList.toggle('active',v.id===name+'View'));$('#viewTitle').textContent=titles[name]||name;if(!key)return;if(name==='dashboard')loadDashboard();if(name==='pages')loadPageList();if(name==='requests')loadRequests();if(name==='appearance')loadAppearance();if(name==='branding')loadBranding();if(name==='media')loadMedia();if(name==='blog')loadBlog();if(name==='contact')loadSettings();if(name==='health')loadHealth()}
function hasUnsavedPage(){return pageDirty||rawDirty}
function okayToLeavePage(){return !hasUnsavedPage()||confirm('You have unsaved page changes. Leave without saving them?')}
$$('[data-view]').forEach(b=>b.onclick=()=>{if($('.view.active')?.id==='pagesView'&&b.dataset.view!=='pages'&&!okayToLeavePage())return;show(b.dataset.view)});$$('[data-jump]').forEach(b=>b.onclick=()=>{if($('.view.active')?.id==='pagesView'&&b.dataset.jump!=='pages'&&!okayToLeavePage())return;show(b.dataset.jump)});
$('#openSite').onclick=()=>window.open(apiBase||'http://localhost:8080','_blank');
$('#useLocalSite')?.addEventListener('click',()=>{$('#apiBase').value='http://localhost:8080';status('Local website address filled in. Open the admin key file, paste the key, then click Connect.')});
$('#connectBtn').onclick=async()=>{apiBase=$('#apiBase').value.trim().replace(/\/$/,'');key=$('#adminKey').value.trim();localStorage.setItem('premierApiBase',apiBase);localStorage.setItem('premierAdminKey',key);try{await api('/api/admin/ping');setOnline(true);status(`Connected to ${apiBase}.`);show('dashboard')}catch(e){setOnline(false);status(`Could not connect: ${e.message}. Check the website URL, admin key, and server.`,true)}};
async function loadDashboard(){try{const d=await api('/api/admin/health');$('#dashboardStats').innerHTML=cards([{n:d.requests,l:'Saved requests'},{n:d.pages,l:'Site pages'},{n:d.blogPosts,l:'Tracked blog posts'},{n:(d.brokenLinks||0)+(d.brokenLocalFiles||0),l:'Broken local items'}])}catch(e){status(e.message,true)}}
function cards(items){return items.map(x=>`<div class="stat-card"><strong>${esc(x.n)}</strong><span>${esc(x.l)}</span></div>`).join('')}

// PAGE EDITOR -----------------------------------------------------------
async function loadPageList(){try{const d=await api('/api/admin/pages'),sel=$('#pageSelect'),old=sel.value;sel.innerHTML=d.pages.map(p=>`<option value="${attr(p.file)}">${esc(p.title)} — ${esc(p.file)}</option>`).join('');if(old&&d.pages.some(p=>p.file===old))sel.value=old;else if(d.pages.some(p=>p.file==='index.html'))sel.value='index.html';if(!currentPage&&sel.value)await loadSelectedPage()}catch(e){status(e.message,true)}}
$('#loadPage').onclick=()=>{if(!hasUnsavedPage()||confirm('Discard unsaved changes and reload this page?'))loadSelectedPage()};$('#pageSelect').onchange=()=>{if(!hasUnsavedPage()||confirm('Discard unsaved changes and load another page?'))loadSelectedPage();else $('#pageSelect').value=currentPage};
async function loadSelectedPage(){try{const file=$('#pageSelect').value;if(!file)return;const d=await api('/api/admin/page?file='+encodeURIComponent(file));currentPage=d.file;pageDoc=new DOMParser().parseFromString(d.source,'text/html');pageDirty=false;rawDirty=false;renderPageEditor();updatePageSaveUI();$('#pageEditor').hidden=false;$('#pageEditorEmpty').hidden=true;status(`Loaded ${file}.`)}catch(e){status(e.message,true)}}
function updatePageSaveUI(){const state=$('#pageSaveState'),bar=$('#pageSaveBar');if(!state)return;if(!currentPage){state.textContent='No page loaded';state.className='save-state';if(bar)bar.hidden=true;return}if(rawDirty){state.textContent='Advanced HTML changed';state.className='save-state dirty';if(bar){bar.hidden=false;bar.querySelector('span').textContent='Advanced HTML has unsaved changes. Use Save Advanced HTML below.'}return}if(pageDirty){state.textContent='Unsaved changes';state.className='save-state dirty';if(bar){bar.hidden=false;bar.querySelector('span').textContent='You have unsaved changes.'}return}state.textContent='Saved';state.className='save-state saved';if(bar)bar.hidden=true}
function markDirty(){pageDirty=true;rawDirty=false;if(pageDoc&&$('#rawSource'))$('#rawSource').value=serializePage();updatePageSaveUI()}
function setNodeLabelText(el,value){let n=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.nodeValue.trim());if(n)n.nodeValue=value+' ';else el.insertBefore(pageDoc.createTextNode(value+' '),el.firstChild);markDirty()}
function leafLink(el){return !el.querySelector('h1,h2,h3,h4,p,article,div,figure,img,section')}
function fieldCard(label,meta,controlHtml){const d=document.createElement('div');d.className='editor-card';d.innerHTML=`<div class="field-meta"><strong>${esc(label)}</strong><span>${esc(meta)}</span></div>${controlHtml}`;return d}
function shortLabel(value,max=52){const t=String(value||'').replace(/\s+/g,' ').trim();return t.length>max?t.slice(0,max-1)+'…':t}
function friendlyFieldLabel(el,i,value){const tag=el.tagName.toLowerCase(),sample=shortLabel(value);if(tag==='h1')return `Main heading — ${sample||'Untitled'}`;if(/^h[2-4]$/.test(tag))return `Heading — ${sample||('Heading '+(i+1))}`;if(tag==='p')return `Paragraph — ${sample||('Paragraph '+(i+1))}`;if(tag==='blockquote')return `Quote — ${sample||('Quote '+(i+1))}`;if(tag==='cite')return `Citation — ${sample||('Citation '+(i+1))}`;if(tag==='a')return `Link / button — ${sample||('Link '+(i+1))}`;if(tag==='button')return `Button — ${sample||('Button '+(i+1))}`;return `${tag.toUpperCase()} ${i+1}`}
function renderPageEditor(){
  $('#seoFields').innerHTML='';$('#textFields').innerHTML='';$('#imageFields').innerHTML='';$('#formFields').innerHTML='';
  const title=pageDoc.querySelector('title');if(title){const c=fieldCard('Browser title','SEO',`<input value="${attr(title.textContent)}">`);c.querySelector('input').oninput=e=>{title.textContent=e.target.value;markDirty()};$('#seoFields').append(c)}
  let desc=pageDoc.querySelector('meta[name="description"]');if(desc){const c=fieldCard('Search description','SEO',`<textarea rows="3">${esc(desc.content||'')}</textarea>`);c.querySelector('textarea').oninput=e=>{desc.content=e.target.value;markDirty()};$('#seoFields').append(c)}
  const selectors='h1,h2,h3,h4,p,.kicker,blockquote,cite,button,a.btn,a.text-link';
  [...pageDoc.querySelectorAll(selectors)].forEach((el,i)=>{if((el.matches('a')||el.matches('button'))&&!leafLink(el))return;if(el.closest('script,style,header,footer'))return;const tag=el.tagName.toLowerCase(),meta=(el.className&&typeof el.className==='string'?el.className.split(/\s+/).slice(0,2).join('.'):'')||tag;const hasElements=el.children.length>0;let c;const simpleValue=el.matches('a,button')?[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.nodeValue).join(' ').trim():el.textContent.trim();const friendly=friendlyFieldLabel(el,i,simpleValue);if(hasElements&&!(el.matches('a,button')&&el.querySelector('.btn-arrow'))){c=fieldCard(friendly,meta,`<label>Formatted content<textarea rows="3">${esc(el.innerHTML)}</textarea></label>`);c.querySelector('textarea').oninput=e=>{el.innerHTML=e.target.value;markDirty()}}else{const value=simpleValue;c=fieldCard(friendly,meta,`<label>Text<textarea rows="${tag==='p'||tag==='blockquote'?3:2}">${esc(value)}</textarea></label>${el.matches('a')?`<label>Link<input class="href" value="${attr(el.getAttribute('href')||'')}"></label>`:''}`);c.querySelector('textarea').oninput=e=>{if(el.matches('a,button'))setNodeLabelText(el,e.target.value);else{el.textContent=e.target.value;markDirty()}};const href=c.querySelector('.href');if(href)href.oninput=e=>{el.setAttribute('href',e.target.value);markDirty()}}$('#textFields').append(c)});
  [...pageDoc.querySelectorAll('img')].filter(img=>!img.closest('header,footer')).forEach((img,i)=>{const altLabel=img.getAttribute('alt')||'Page image';const c=fieldCard(`Image — ${shortLabel(altLabel,44)}`,`Image ${i+1}`,`<img src="${attr(displayUrl(img.getAttribute('src')||''))}" alt=""><label>Image URL<input class="src" value="${attr(img.getAttribute('src')||'')}"></label><label>Description (alt text)<input class="alt" value="${attr(img.getAttribute('alt')||'')}"></label><label>Upload replacement<input class="upload" type="file" accept="image/*"></label>`);const preview=c.querySelector('img'),src=c.querySelector('.src'),alt=c.querySelector('.alt'),up=c.querySelector('.upload');src.oninput=e=>{img.setAttribute('src',e.target.value);preview.src=displayUrl(e.target.value);markDirty()};alt.oninput=e=>{img.setAttribute('alt',e.target.value);markDirty()};up.onchange=async e=>{const file=e.target.files[0];if(!file)return;try{status('Uploading image…');const url=await uploadImage(file);src.value=url;img.setAttribute('src',url);preview.src=displayUrl(url);markDirty();status('Image uploaded. Click Save Page to publish it.')}catch(err){status(err.message,true)}};$('#imageFields').append(c)});
  [...pageDoc.querySelectorAll('label')].filter(label=>!label.closest('header,footer')).forEach((label,i)=>{const formChild=label.querySelector('input,textarea,select');if(!formChild)return;const textNode=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.nodeValue.trim());if(!textNode)return;const c=fieldCard(`Form label ${i+1}`,formChild.getAttribute('name')||formChild.tagName.toLowerCase(),`<input value="${attr(textNode.nodeValue.trim())}">`);c.querySelector('input').oninput=e=>{textNode.nodeValue=e.target.value+' ';markDirty()};$('#formFields').append(c)});
  [...pageDoc.querySelectorAll('input[placeholder],textarea[placeholder]')].filter(el=>!el.closest('header,footer')).forEach((el,i)=>{const c=fieldCard(`Placeholder ${i+1}`,el.getAttribute('name')||el.tagName.toLowerCase(),`<input value="${attr(el.getAttribute('placeholder')||'')}">`);c.querySelector('input').oninput=e=>{el.setAttribute('placeholder',e.target.value);markDirty()};$('#formFields').append(c)});
  [...pageDoc.querySelectorAll('option')].filter(el=>!el.closest('header,footer')).forEach((el,i)=>{const c=fieldCard(`Dropdown choice ${i+1}`,'option',`<input value="${attr(el.textContent)}">`);c.querySelector('input').oninput=e=>{el.textContent=e.target.value;markDirty()};$('#formFields').append(c)});
  $('#rawSource').value=serializePage();
}
function serializePage(){return '<!doctype html>\n'+pageDoc.documentElement.outerHTML}
async function saveStructured(){if(!pageDoc||!currentPage)return;if(rawDirty){status('Advanced HTML has unsaved edits. Use Save Advanced HTML, or discard those edits first.',true);return}try{await api('/api/admin/page',{method:'POST',body:JSON.stringify({file:currentPage,source:serializePage()})});pageDirty=false;rawDirty=false;$('#rawSource').value=serializePage();updatePageSaveUI();status(`${currentPage} saved. A backup copy was created.`)}catch(e){status(e.message,true)}}
$('#savePage').onclick=saveStructured;$('#savePageBottom')?.addEventListener('click',saveStructured);$('#rawSource')?.addEventListener('input',()=>{rawDirty=true;updatePageSaveUI()});$('#saveRawPage').onclick=async()=>{try{const source=$('#rawSource').value;if(!currentPage)return status('Load a page first.',true);await api('/api/admin/page',{method:'POST',body:JSON.stringify({file:currentPage,source})});pageDoc=new DOMParser().parseFromString(source,'text/html');pageDirty=false;rawDirty=false;renderPageEditor();updatePageSaveUI();status(`${currentPage} advanced HTML saved. A backup copy was created.`)}catch(e){status(e.message,true)}};
$('#previewPage').onclick=()=>{if(!currentPage)return status('Load a page first.',true);if(hasUnsavedPage())return status('Save your changes first so Preview shows the current version.',true);window.open(endpoint('/'+currentPage),'_blank')};
addEventListener('beforeunload',e=>{if(hasUnsavedPage()){e.preventDefault();e.returnValue=''}});

// REQUESTS --------------------------------------------------------------
let requestFilter='all',requestSearch='',requestSort='newest',requestCache=[];
const requestStatusLabel={new:'New',contacted:'Contacted',finished:'Finished'};
function normalizedRequestStatus(value){return value==='closed'?'finished':(['new','contacted','finished'].includes(value)?value:'new')}
function fmtRequestDate(value){try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return value||''}}
function requestActionButton(label,statusName,kind=''){return `<button class="request-action ${kind}" data-status="${statusName}">${label}</button>`}
function requestCard(r){
  const f=r.fields||{},st=normalizedRequestStatus(r.status),name=((f.firstName||'')+' '+(f.lastName||'')).trim()||'Unnamed inquiry';
  const email=f.email||'',phone=f.phone||'',job=Array.isArray(f.jobType)?f.jobType.join(', '):(f.jobType||'Not specified');
  const actions=st==='new'
    ? requestActionButton('Mark Contacted','contacted','primary-action')+requestActionButton('Mark Finished','finished')
    : st==='contacted'
      ? requestActionButton('Mark Finished','finished','primary-action')+requestActionButton('Move to New','new')
      : requestActionButton('Reopen as Contacted','contacted','primary-action')+requestActionButton('Move to New','new');
  const files=r.files?.length?`<div class="request-files"><strong>Attachments</strong>${r.files.map(x=>`<button class="file-chip" data-attachment="${attr(x.storedName)}" type="button">${esc(x.originalName)}</button>`).join('')}</div>`:'';
  const el=document.createElement('article');el.className=`request-card request-${st}`;el.dataset.requestStatus=st;
  el.innerHTML=`<header><div><div class="request-title-row"><h3>${esc(name)}</h3><span class="request-status request-status-${st}">${requestStatusLabel[st]}</span></div><p class="request-date">${esc(fmtRequestDate(r.createdAt))}</p></div></header>
  <div class="request-contact">${phone?`<a href="tel:${attr(phone)}">${esc(phone)}</a>`:'<span>No phone</span>'}${email?`<a href="mailto:${attr(email)}">${esc(email)}</a>`:'<span>No email</span>'}</div>
  <div class="request-details"><p><strong>Project</strong><span>${esc(job)}</span></p>${f.address?`<p><strong>Address</strong><span>${esc(f.address)}</span></p>`:''}${f.yearBuilt?`<p><strong>Year built</strong><span>${esc(f.yearBuilt)}</span></p>`:''}</div>
  ${f.message?`<div class="request-message"><strong>Message</strong><p>${esc(f.message)}</p></div>`:''}${files}
  <div class="request-actions">${actions}<button class="request-action danger" data-delete>Delete</button></div>`;
  el.querySelectorAll('[data-attachment]').forEach(b=>b.onclick=()=>openAdminAttachment(b.dataset.attachment));
  el.querySelectorAll('[data-status]').forEach(b=>b.onclick=async()=>{try{b.disabled=true;await api('/api/admin/requests/'+encodeURIComponent(r.id),{method:'PATCH',body:JSON.stringify({status:b.dataset.status})});status(`Request moved to ${requestStatusLabel[b.dataset.status]}.`);await loadRequests()}catch(e){status(e.message,true)}finally{b.disabled=false}});
  el.querySelector('[data-delete]').onclick=async()=>{if(!confirm('Delete this inquiry and its uploaded files?'))return;try{await api('/api/admin/requests/'+encodeURIComponent(r.id),{method:'DELETE'});status('Inquiry deleted.');await loadRequests();loadHealth()}catch(e){status(e.message,true)}};
  return el
}
function renderRequests(){
  const box=$('#requestsList');if(!box)return;box.innerHTML='';
  const counts={all:requestCache.length,new:0,contacted:0,finished:0};requestCache.forEach(r=>counts[normalizedRequestStatus(r.status)]++);
  $('#requestCountAll').textContent=counts.all;$('#requestCountNew').textContent=counts.new;$('#requestCountContacted').textContent=counts.contacted;$('#requestCountFinished').textContent=counts.finished;
  $$('#requestTabs [data-request-filter]').forEach(b=>b.classList.toggle('active',b.dataset.requestFilter===requestFilter));
  let shown=requestCache.filter(r=>requestFilter==='all'||normalizedRequestStatus(r.status)===requestFilter);if(requestSearch){const q=requestSearch.toLowerCase();shown=shown.filter(r=>JSON.stringify(r.fields||{}).toLowerCase().includes(q))}shown=shown.slice().sort((a,b)=>{const av=Date.parse(a.createdAt)||0,bv=Date.parse(b.createdAt)||0;return requestSort==='oldest'?av-bv:bv-av});
  if(!shown.length){const msg=requestSearch?'No requests match your search.':(requestFilter==='all'?'No project requests yet.':`No ${requestStatusLabel[requestFilter].toLowerCase()} requests.`);box.innerHTML=`<div class="empty-state request-empty">${msg}</div>`;return}
  shown.forEach(r=>box.append(requestCard(r)))
}
async function loadRequests(){try{const d=await api('/api/admin/requests');requestCache=d.requests||[];renderRequests()}catch(e){status(e.message,true)}}
$('#refreshRequests').onclick=loadRequests;
$('#requestTabs')?.addEventListener('click',e=>{const b=e.target.closest('[data-request-filter]');if(!b)return;requestFilter=b.dataset.requestFilter;renderRequests()});
$('#requestSearch')?.addEventListener('input',e=>{requestSearch=e.target.value.trim();renderRequests()});
$('#requestSort')?.addEventListener('change',e=>{requestSort=e.target.value;renderRequests()});

// APPEARANCE ------------------------------------------------------------
async function loadAppearance(){try{const d=await api('/api/admin/appearance'),f=$('#appearanceForm');for(const n of ['navy','sage','paper','ink','cream','headerScrolled','headerTint','buttonRadius','imageRadius','sectionSpacing','logoSize'])if(f[n])f[n].value=d[n];updatePreview()}catch(e){status(e.message,true)}}
function updatePreview(){const f=$('#appearanceForm'),v=Number(f.headerTint.value||.34);$('#tintValue').textContent=Math.round(v*100)+'%';$('#buttonRadiusValue').textContent=Math.round(Number(f.buttonRadius.value||999))+' px';$('#imageRadiusValue').textContent=Math.round(Number(f.imageRadius.value||22))+' px';$('#sectionSpacingValue').textContent=Math.round(Number(f.sectionSpacing.value||92))+' px';$('#logoSizeValue').textContent=Math.round(Number(f.logoSize.value||62))+' px';const p=$('.header-preview');p.style.background=`rgba(7,24,39,${v})`;p.querySelector('b').style.background=f.sage.value;document.documentElement.style.setProperty('--navy',f.navy.value);document.documentElement.style.setProperty('--sage',f.sage.value)}
$('#appearanceForm').addEventListener('input',updatePreview);$('#appearanceForm').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));for(const n of ['headerTint','buttonRadius','imageRadius','sectionSpacing','logoSize'])d[n]=Number(d[n]);try{await api('/api/admin/appearance',{method:'POST',body:JSON.stringify(d)});status('Appearance saved to the live site.')}catch(err){status(err.message,true)}};



// BRANDING --------------------------------------------------------------
const BRAND_DEFAULTS={
  headerLogo:'https://www.remodelbypremier.com/wp-content/uploads/2019/03/Premier-Remodeling-Logo-Header-1.png',
  footerLogo:'https://www.remodelbypremier.com/wp-content/uploads/2019/03/Premier-Remodeling-Footer-Logo-286x300.png',
  favicon:'assets/premier-favicon.png'
};
function brandDisplayUrl(v){v=String(v||'');if(/^(https?:\/\/|data:|blob:)/i.test(v))return v;return endpoint('/'+v.replace(/^\//,''))}
function updateBrandPreviews(){const f=$('#brandingForm');if(!f)return;$('#headerLogoPreview').src=brandDisplayUrl(f.headerLogo.value);$('#footerLogoPreview').src=brandDisplayUrl(f.footerLogo.value);$('#faviconPreview').src=brandDisplayUrl(f.favicon.value)}
async function loadBranding(){try{const d=await api('/api/admin/branding'),f=$('#brandingForm');for(const n of ['headerLogo','footerLogo','favicon'])f[n].value=d[n]||BRAND_DEFAULTS[n];updateBrandPreviews()}catch(e){status(e.message,true)}}
$('#brandingForm')?.addEventListener('input',updateBrandPreviews);
$('#brandingForm')?.addEventListener('submit',async e=>{e.preventDefault();try{const d=Object.fromEntries(new FormData(e.target));await api('/api/admin/branding',{method:'POST',body:JSON.stringify(d)});status('Branding saved across the live website.');loadBranding()}catch(err){status(err.message,true)}});
async function brandUpload(inputId,field){const input=$(inputId);if(!input)return;input.onchange=async e=>{const file=e.target.files[0];if(!file)return;try{status('Uploading branding image…');const url=await uploadImage(file);$('#brandingForm')[field].value=url;updateBrandPreviews();status('Uploaded. Click Save Branding to apply it everywhere.')}catch(err){status(err.message,true)}finally{input.value=''}}}
brandUpload('#headerLogoUpload','headerLogo');brandUpload('#footerLogoUpload','footerLogo');brandUpload('#faviconUpload','favicon');
$('#restoreBranding')?.addEventListener('click',()=>{const f=$('#brandingForm');for(const [k,v] of Object.entries(BRAND_DEFAULTS))f[k].value=v;updateBrandPreviews();status('Premier logo defaults loaded. Click Save Branding to apply them.')});

// MEDIA -----------------------------------------------------------------
async function loadMedia(){try{const d=await api('/api/admin/media-list'),box=$('#mediaGrid');box.innerHTML='';if(!d.files.length){box.innerHTML='<div class="panel">No uploaded images yet.</div>';return}d.files.forEach(f=>{const el=document.createElement('article');el.className='media-card';el.innerHTML=`<img src="${attr(displayUrl(f.url))}" alt=""><p>${esc(f.url)}</p><div class="media-actions"><button class="copy">Copy URL</button><button class="danger delete">Delete</button></div>`;el.querySelector('.copy').onclick=async()=>{const ok=await copyText(f.url);status(ok?'Image URL copied.':`Could not copy automatically. URL: ${f.url}`,!ok)};el.querySelector('.delete').onclick=async()=>{if(confirm('Delete this uploaded image? Pages already using it could break.')){await api('/api/admin/media/'+encodeURIComponent(f.name),{method:'DELETE'});loadMedia()}};box.append(el)})}catch(e){status(e.message,true)}}
$('#mediaUpload').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{status('Uploading image…');await uploadImage(file);status('Image uploaded.');e.target.value='';loadMedia()}catch(err){status(err.message,true)}};

// BLOG ------------------------------------------------------------------
async function loadBlog(){try{const d=await api('/api/admin/blog'),box=$('#blogList');box.innerHTML='<h2 style="font:400 25px Georgia,serif;margin:26px 0 12px">Current posts</h2>';d.posts.forEach(p=>{const el=document.createElement('article');el.className='post-card';el.innerHTML=`<div><h3>${esc(p.title)}</h3><p>${esc(p.file)}</p></div>${p.managed?'<button>Delete</button>':'<span class="badge">Original</span>'}`;const b=el.querySelector('button');if(b)b.onclick=async()=>{if(confirm(`Delete ${p.title}?`)){await api('/api/admin/blog/'+encodeURIComponent(p.slug),{method:'DELETE'});loadBlog()}};box.append(el)})}catch(e){status(e.message,true)}}
$('#blogUpload').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{status('Uploading cover image…');const url=await uploadImage(file);$('#blogForm').imageUrl.value=url;status('Cover image uploaded.')}catch(err){status(err.message,true)}};$('#blogForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/blog',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});e.target.reset();status('Blog post published.');loadBlog()}catch(err){status(err.message,true)}};

// CONTACT ---------------------------------------------------------------
async function loadSettings(){try{const d=await api('/api/admin/settings'),f=$('#settingsForm');f.businessEmail.value=d.businessEmail||'';f.contactEndpoint.value=d.contactEndpoint==='/api/contact'?'':(d.contactEndpoint||'');f.useBuiltIn.checked=!d.contactEndpoint||d.contactEndpoint==='/api/contact';const note=$('#contactSetupNote');if(note)note.textContent=f.useBuiltIn.checked?'Built-in Requests inbox is active. Email is only a fallback; the included server does not send email notifications by itself.':'External form/CRM routing is selected.'}catch(e){status(e.message,true)}}
$('#settingsForm').onsubmit=async e=>{e.preventDefault();const f=e.target,d={businessEmail:f.businessEmail.value.trim(),contactEndpoint:f.useBuiltIn.checked?'/api/contact':f.contactEndpoint.value.trim()};if(!f.useBuiltIn.checked&&!d.contactEndpoint){d.contactEndpoint='/api/contact';f.useBuiltIn.checked=true}try{const r=await api('/api/admin/settings',{method:'POST',body:JSON.stringify(d)});status(`Contact routing saved: ${r.contactEndpoint==='/api/contact'?'built-in Requests inbox':'external endpoint'}.`);loadSettings();loadHealth()}catch(err){status(err.message,true)}};
$('#testContactSetup')?.addEventListener('click',async()=>{try{const f=$('#settingsForm'),d={businessEmail:f.businessEmail.value.trim(),contactEndpoint:f.useBuiltIn.checked?'/api/contact':f.contactEndpoint.value.trim()};await api('/api/admin/settings',{method:'POST',body:JSON.stringify(d)});const cfg=await fetch(apiBase+'/api/site-config?ts='+Date.now(),{cache:'no-store'});if(!cfg.ok)throw new Error('Public contact configuration could not be loaded');const c=await cfg.json();if(c.contactEndpoint==='/api/contact'){const fd=new FormData();fd.append('message','Developer Console contact-routing test.');fd.append('jobType','Test Inquiry');fd.append('firstName','Website');fd.append('lastName','Test');fd.append('email','test@example.com');fd.append('phone','000-000-0000');fd.append('address','Test only');fd.append('yearBuilt','2000');const r=await fetch(apiBase+'/api/contact',{method:'POST',body:fd});if(!r.ok)throw new Error('Built-in Requests inbox rejected the test');const created=await r.json();const list=await api('/api/admin/requests');if(!list.requests.some(x=>x.id===created.id))throw new Error('Test inquiry was not visible in Requests');await api('/api/admin/requests/'+encodeURIComponent(created.id),{method:'DELETE'});status('Test passed. A test inquiry was created, verified in Requests, and cleaned up automatically.');loadRequests();loadHealth()}else{status('Settings are reachable. External endpoint selected; no test inquiry was sent to the outside service.')}}catch(err){status('Contact test failed: '+err.message,true)}});

// GLOBAL TOOLS ----------------------------------------------------------
$('#replaceForm').onsubmit=async e=>{e.preventDefault();const f=e.target,d={find:f.find.value,replace:f.replace.value,caseSensitive:f.caseSensitive.checked};if(!confirm(`Replace all occurrences of “${d.find}” across every page? Automatic backups will be created.`))return;try{const r=await api('/api/admin/replace',{method:'POST',body:JSON.stringify(d)});status(`Finished: ${r.replacements} replacement(s) across ${r.pagesChanged} page(s).`)}catch(err){status(err.message,true)}};

// HEALTH ----------------------------------------------------------------
async function loadHealth(){try{const d=await api('/api/admin/health');$('#healthGrid').innerHTML=cards([{n:d.pages,l:'HTML pages'},{n:d.requests,l:'Saved requests'},{n:d.brokenLinks,l:'Broken page links'},{n:d.brokenLocalFiles||0,l:'Broken local files'},{n:d.remoteImages||0,l:'Remote images'},{n:d.configured?'Yes':'No',l:'Contact configured'},{n:d.blogPosts,l:'Blog posts'}])}catch(e){status(e.message,true)}}$('#refreshHealth').onclick=loadHealth;$('#downloadBackup').onclick=async()=>{try{const data=await api('/api/admin/backup');const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='premier-settings-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);status('Backup downloaded.')}catch(e){status(e.message,true)}};

if(key&&apiBase){api('/api/admin/ping').then(()=>{setOnline(true);status(`Connected to ${apiBase}.`);loadDashboard()}).catch(()=>{setOnline(false);status('Saved connection is offline. Update the URL/key and reconnect.',true)})}

// Mobile Site Manager menu -------------------------------------------------
(function(){
  const sidebar=document.getElementById('managerSidebar');
  const toggle=document.getElementById('managerMenuToggle');
  if(!sidebar||!toggle)return;
  const mobile=()=>window.matchMedia('(max-width: 900px)').matches;
  const setOpen=(open)=>{
    sidebar.classList.toggle('menu-open',!!open);
    toggle.setAttribute('aria-expanded',open?'true':'false');
    toggle.setAttribute('aria-label',open?'Close management menu':'Open management menu');
  };
  toggle.addEventListener('click',()=>setOpen(!sidebar.classList.contains('menu-open')));
  sidebar.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{if(mobile())setOpen(false)}));
  sidebar.querySelectorAll('.site-link').forEach(btn=>btn.addEventListener('click',()=>{if(mobile())setOpen(false)}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sidebar.classList.contains('menu-open'))setOpen(false)});
  document.addEventListener('click',e=>{if(mobile()&&sidebar.classList.contains('menu-open')&&!sidebar.contains(e.target))setOpen(false)});
  window.addEventListener('resize',()=>{if(!mobile())setOpen(false)});
})();
