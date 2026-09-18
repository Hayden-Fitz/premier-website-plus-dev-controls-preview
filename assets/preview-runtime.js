(()=>{
  'use strict';
  const P='premierPreview:';
  const read=(k,fb)=>{try{const v=localStorage.getItem(P+k);return v==null?fb:JSON.parse(v)}catch{return fb}};
  const write=(k,v)=>localStorage.setItem(P+k,JSON.stringify(v));
  const file=(()=>{let n=location.pathname.split('/').pop();return n&&n.includes('.html')?n:'index.html'})();

  // Apply any page source saved from the preview Site Manager.
  const saved=read('page:'+file,'');
  if(saved){
    try{
      const d=new DOMParser().parseFromString(saved,'text/html');
      const sm=d.querySelector('main'),cm=document.querySelector('main');
      if(sm&&cm)cm.innerHTML=sm.innerHTML;
      const st=d.querySelector('title'); if(st)document.title=st.textContent;
      const sd=d.querySelector('meta[name="description"]'),cd=document.querySelector('meta[name="description"]');
      if(sd&&cd)cd.setAttribute('content',sd.getAttribute('content')||'');
    }catch{}
  }

  const appearance=read('appearance',null);
  if(appearance){
    const a=appearance;
    const css=`:root{--navy:${a.navy};--sage:${a.sage};--paper:${a.paper};--ink:${a.ink};--cream:${a.cream};--brand-logo-height:${a.logoSize}px!important}.site-header:not(.inner){background:rgba(7,24,39,${a.headerTint})!important}.site-header.inner,.site-header.scrolled{background:${a.headerScrolled}!important}.btn{border-radius:${a.buttonRadius}px!important}.card,.project-card,.portfolio-item,.blog-card,.article-photo,.service-panel,.areas-feature,.recognition-strip{border-radius:${a.imageRadius}px!important}.section{padding-top:${a.sectionSpacing}px!important;padding-bottom:${a.sectionSpacing}px!important}`;
    const st=document.createElement('style');st.id='previewAppearance';st.textContent=css;document.head.appendChild(st);
  }

  const branding=read('branding',null);
  if(branding){
    document.querySelectorAll('.brand img').forEach(x=>x.src=branding.headerLogo||x.src);
    document.querySelectorAll('.footer-official-logo').forEach(x=>x.src=branding.footerLogo||x.src);
    if(branding.favicon){document.querySelectorAll('link[rel~="icon"]').forEach(x=>x.href=branding.favicon)}
  }

  // Show browser-only preview status.
  if(!document.querySelector('.preview-demo-badge')){
    const b=document.createElement('div');b.className='preview-demo-badge';b.innerHTML='<span></span>Interactive preview — edits stay in this browser';document.body.appendChild(b);
  }

  // Static GitHub Pages cannot run Node. Emulate just the public contact endpoints so
  // a test inquiry really appears in Developer Controls on this same browser.
  const realFetch=window.fetch.bind(window);
  function apiPath(input){try{const u=new URL(typeof input==='string'?input:input.url,location.href);const i=u.pathname.indexOf('/api/');return i>=0?u.pathname.slice(i)+u.search:''}catch{return ''}}
  function json(data,status=200){return Promise.resolve(new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}))}
  window.fetch=async function(input,opt={}){
    const path=apiPath(input);
    if(path.startsWith('/api/site-config')){
      const s=read('settings',{businessEmail:'',contactEndpoint:'/api/contact'});
      return json({businessEmail:s.businessEmail||'',contactEndpoint:s.contactEndpoint||'/api/contact',builtInAvailable:true});
    }
    if(path==='/api/contact' && String(opt.method||'GET').toUpperCase()==='POST'){
      let fd=opt.body instanceof FormData?opt.body:new FormData();
      if(String(fd.get('_companyWebsite')||'').trim())return json({ok:true,id:'accepted'});
      const jobs=fd.getAll('jobType').filter(Boolean).map(String);
      const id='preview-'+Date.now().toString(36);
      const fields={};
      for(const [k,v] of fd.entries()){
        if(v instanceof File)continue;
        if(k==='jobType')continue;
        fields[k]=String(v);
      }
      fields.jobType=jobs;
      const list=read('requests',[]);
      list.push({id,createdAt:new Date().toISOString(),status:'new',fields,files:[]});
      write('requests',list);
      return json({ok:true,id});
    }
    return realFetch(input,opt);
  };
})();
