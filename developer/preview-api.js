(()=>{
  'use strict';
  const DEMO_KEY='PREVIEW-DEMO-ACCESS';
  const P='premierPreview:';
  const SITE_ROOT=new URL('../',location.href);
  const ROOT=SITE_ROOT.href.replace(/\/$/,'');
  const nativeFetch=window.fetch.bind(window);
  const pages=[
    ['index.html','Premier Remodeling | Northern Utah Remodeling'],
    ['services.html','Services'],['projects.html','Projects'],['process.html','Process'],['areas.html','Areas'],
    ['blog.html','Blog'],['blog-open-concept-kitchen.html','Open Concept Kitchen'],['blog-kitchen-laundry-remodel.html','Kitchen / Laundry Remodel'],
    ['about.html','About'],['why-premier.html','Why Premier'],['reviews.html','Reviews'],['faq.html','FAQ'],['contact.html','Contact']
  ];
  const defaults={navy:'#0e2944',sage:'#637f69',paper:'#fbfaf6',ink:'#182229',cream:'#f1eee6',headerTint:0.34,headerScrolled:'#f1f0eb',buttonRadius:999,imageRadius:22,sectionSpacing:92,logoSize:62};
  const brandDefaults={headerLogo:'https://www.remodelbypremier.com/wp-content/uploads/2019/03/Premier-Remodeling-Logo-Header-1.png',footerLogo:'https://www.remodelbypremier.com/wp-content/uploads/2019/03/Premier-Remodeling-Footer-Logo-286x300.png',favicon:'assets/premier-favicon.png'};
  const read=(k,fb)=>{try{const v=localStorage.getItem(P+k);return v==null?fb:JSON.parse(v)}catch{return fb}};
  const write=(k,v)=>localStorage.setItem(P+k,JSON.stringify(v));
  const del=k=>localStorage.removeItem(P+k);
  const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const apiPath=input=>{try{const u=new URL(typeof input==='string'?input:input.url,location.href);const i=u.pathname.indexOf('/api/');return i>=0?u.pathname.slice(i)+u.search:''}catch{return ''}};
  const parseBody=opt=>{try{return JSON.parse(typeof opt.body==='string'?opt.body:'{}')}catch{return {}}};
  const titleFrom=src=>{try{return new DOMParser().parseFromString(src,'text/html').title||'Untitled'}catch{return 'Untitled'}};
  const baseText=async file=>{const r=await nativeFetch(new URL('../'+file,location.href),{cache:'no-store'});if(!r.ok)throw new Error('Could not load '+file);return r.text()};
  const pageText=async file=>read('page:'+file,null)??await baseText(file);
  const fileToDataURL=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(file)});
  function seed(force=false){
    if(!force&&read('seeded',false))return;
    const now=Date.now();
    write('requests',[
      {id:'demo-new',createdAt:new Date(now-42*60*1000).toISOString(),status:'new',fields:{firstName:'Jordan',lastName:'Miller',email:'jordan@example.com',phone:'801-555-0142',address:'Layton, UT',yearBuilt:'1998',jobType:['Kitchen Remodel','Home Renovation'],message:'We are considering opening up our kitchen and living area and would like to discuss what is possible.'},files:[]},
      {id:'demo-contacted',createdAt:new Date(now-26*60*60*1000).toISOString(),status:'contacted',fields:{firstName:'Morgan',lastName:'Lee',email:'morgan@example.com',phone:'801-555-0188',address:'Ogden Valley, UT',yearBuilt:'2007',jobType:['Home Addition'],message:'Looking at adding a larger primary suite and would like to talk through the process.'},files:[]},
      {id:'demo-finished',createdAt:new Date(now-5*86400000).toISOString(),status:'finished',fields:{firstName:'Taylor',lastName:'Reed',email:'taylor@example.com',phone:'801-555-0119',address:'Davis County, UT',yearBuilt:'1986',jobType:['Basement Finishing'],message:'Initial consultation completed. Keeping this sample here to show the Finished category.'},files:[]}
    ]);
    write('appearance',defaults);write('branding',brandDefaults);write('settings',{businessEmail:'',contactEndpoint:'/api/contact'});write('media',[]);write('managedBlogs',[]);write('seeded',true);
    pages.forEach(([f])=>del('page:'+f));
  }
  seed();
  localStorage.setItem('premierAdminKey',DEMO_KEY);
  localStorage.setItem('premierApiBase',ROOT);
  window.PREMIER_PREVIEW={DEMO_KEY,ROOT,reset:()=>{Object.keys(localStorage).filter(k=>k.startsWith(P)).forEach(k=>localStorage.removeItem(k));seed(true);localStorage.setItem('premierAdminKey',DEMO_KEY);localStorage.setItem('premierApiBase',ROOT);location.reload();}};

  async function handle(input,opt={}){
    const path=apiPath(input); if(!path)return null;
    const method=String(opt.method||'GET').toUpperCase();
    const clean=path.split('?')[0];
    const headers=new Headers(opt.headers||{});
    if(clean.startsWith('/api/admin/')&&headers.get('X-Admin-Key')!==DEMO_KEY)return json({error:'Invalid preview key'},401);

    if(clean==='/api/site-config'){
      const s=read('settings',{businessEmail:'',contactEndpoint:'/api/contact'});return json({...s,builtInAvailable:true});
    }
    if(clean==='/api/contact'&&method==='POST'){
      const fd=opt.body instanceof FormData?opt.body:new FormData();
      const id='preview-'+Date.now().toString(36),fields={},jobs=fd.getAll('jobType').filter(Boolean).map(String);
      for(const [k,v] of fd.entries()){if(v instanceof File||k==='jobType')continue;fields[k]=String(v)}fields.jobType=jobs;
      const rs=read('requests',[]);rs.push({id,createdAt:new Date().toISOString(),status:'new',fields,files:[]});write('requests',rs);return json({ok:true,id});
    }
    if(clean==='/api/admin/ping')return json({ok:true,site:'Premier Remodeling Preview'});
    if(clean==='/api/admin/health')return json({pages:pages.length,brokenLinks:0,brokenLocalFiles:0,remoteImages:38,requests:read('requests',[]).length,configured:true,blogPosts:2+read('managedBlogs',[]).length,appearance:read('appearance',defaults),branding:read('branding',brandDefaults)});
    if(clean==='/api/admin/requests'&&method==='GET')return json({requests:read('requests',[])});
    let m=/^\/api\/admin\/requests\/([^/]+)$/.exec(clean);
    if(m&&method==='PATCH'){const id=decodeURIComponent(m[1]),d=parseBody(opt),rs=read('requests',[]),r=rs.find(x=>x.id===id);if(!r)return json({error:'Request not found'},404);r.status=['new','contacted','finished'].includes(d.status)?d.status:r.status;write('requests',rs);return json({ok:true});}
    if(m&&method==='DELETE'){const id=decodeURIComponent(m[1]),rs=read('requests',[]).filter(x=>x.id!==id);write('requests',rs);return json({ok:true});}
    if(clean.startsWith('/api/admin/uploads/'))return new Response('Preview attachment',{status:200,headers:{'Content-Type':'text/plain'}});
    if(clean==='/api/admin/pages'){
      const arr=[];for(const [file,fallback] of pages){let src=await pageText(file);arr.push({file,title:titleFrom(src)||fallback})}return json({pages:arr});
    }
    if(clean==='/api/admin/page'&&method==='GET'){const u=new URL(typeof input==='string'?input:input.url,location.href),file=u.searchParams.get('file')||'index.html';if(!pages.some(x=>x[0]===file))return json({error:'Page not found'},404);return json({file,source:await pageText(file)});}
    if(clean==='/api/admin/page'&&method==='POST'){const d=parseBody(opt);if(!pages.some(x=>x[0]===d.file))return json({error:'Page not found'},404);write('page:'+d.file,String(d.source||''));return json({ok:true,file:d.file});}
    if(clean==='/api/admin/replace'&&method==='POST'){
      const d=parseBody(opt),needle=String(d.find||'');if(!needle)return json({error:'Enter text to find'},400);let replacements=0,pagesChanged=0;
      for(const [file] of pages){let src=await pageText(file),next=src;if(d.caseSensitive){const parts=src.split(needle);replacements+=parts.length-1;next=parts.join(String(d.replace||''));}else{const re=new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');const ms=src.match(re)||[];replacements+=ms.length;next=src.replace(re,String(d.replace||''));}if(next!==src){pagesChanged++;write('page:'+file,next)}}
      return json({replacements,pagesChanged});
    }
    if(clean==='/api/admin/appearance'&&method==='GET')return json(read('appearance',defaults));
    if(clean==='/api/admin/appearance'&&method==='POST'){const d={...defaults,...parseBody(opt)};write('appearance',d);return json(d);}
    if(clean==='/api/admin/branding'&&method==='GET')return json(read('branding',brandDefaults));
    if(clean==='/api/admin/branding'&&method==='POST'){const d={...brandDefaults,...parseBody(opt)};write('branding',d);return json(d);}
    if(clean==='/api/admin/media-list')return json({files:read('media',[])});
    if(clean==='/api/admin/media'&&method==='POST'){
      const fd=opt.body instanceof FormData?opt.body:null,file=fd&&[...fd.values()].find(v=>v instanceof File);
      if(!file)return json({error:'Choose an image file'},400);if(file.size>1500000)return json({error:'Preview uploads are limited to 1.5 MB. The purchased version supports larger images.'},400);
      const url=await fileToDataURL(file),name='preview-'+Date.now()+'-'+String(file.name||'image').replace(/[^a-z0-9._-]/gi,'_');const ms=read('media',[]);ms.push({name,url});write('media',ms);return json({ok:true,url});
    }
    m=/^\/api\/admin\/media\/([^/]+)$/.exec(clean);if(m&&method==='DELETE'){const name=decodeURIComponent(m[1]);write('media',read('media',[]).filter(x=>x.name!==name));return json({ok:true});}
    if(clean==='/api/admin/settings'&&method==='GET')return json(read('settings',{businessEmail:'',contactEndpoint:'/api/contact'}));
    if(clean==='/api/admin/settings'&&method==='POST'){const d=parseBody(opt),s={businessEmail:String(d.businessEmail||''),contactEndpoint:String(d.contactEndpoint||'/api/contact')||'/api/contact'};write('settings',s);return json({ok:true,...s});}
    if(clean==='/api/admin/blog'&&method==='GET')return json({posts:[{slug:'open-concept-kitchen',title:'Open Concept Kitchen',file:'blog-open-concept-kitchen.html',managed:false},{slug:'kitchen-laundry-remodel',title:'Kitchen / Laundry Remodel',file:'blog-kitchen-laundry-remodel.html',managed:false},...read('managedBlogs',[])]});
    if(clean==='/api/admin/blog'&&method==='POST'){const d=parseBody(opt),slug=String(d.title||'preview-post').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'preview-post';const b=read('managedBlogs',[]);b.push({slug,title:d.title||'Preview post',file:'preview-'+slug+'.html',managed:true,...d});write('managedBlogs',b);return json({slug,file:'preview-'+slug+'.html'});}
    m=/^\/api\/admin\/blog\/([^/]+)$/.exec(clean);if(m&&method==='DELETE'){const slug=decodeURIComponent(m[1]);write('managedBlogs',read('managedBlogs',[]).filter(x=>x.slug!==slug));return json({ok:true});}
    if(clean==='/api/admin/backup')return json({preview:true,exportedAt:new Date().toISOString(),appearance:read('appearance',defaults),branding:read('branding',brandDefaults),settings:read('settings',{}),requests:read('requests',[]),blogPosts:read('managedBlogs',[])});
    return json({error:'Preview endpoint not implemented'},404);
  }

  window.fetch=async function(input,opt={}){const r=await handle(input,opt);return r||nativeFetch(input,opt)};
})();
