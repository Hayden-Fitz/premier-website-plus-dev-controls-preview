(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function applyImageFallback(img){
    if(!img || img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied='1';
    if(img.closest('.brand') || img.classList.contains('footer-official-logo')){
      img.src='assets/premier-favicon.png?v=24';
      img.alt='Premier Remodeling';
    }else{
      img.src='assets/image-fallback.svg?v=24';
      img.alt=img.alt||'Premier Remodeling project image';
      img.classList.add('image-fallback');
    }
  }
  // Capture resource failures even when an image fails before the rest of the page finishes loading.
  addEventListener('error',e=>{if(e.target instanceof HTMLImageElement)applyImageFallback(e.target)},true);

  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  const progress = document.getElementById('progress');
  const heroImg = document.querySelector('.hero-media img');
  const menuBtn = document.querySelector('.menu-btn');
  const mobileNav = document.querySelector('.mobile-nav');
  let y = scrollY, raf = 0, heroY = 0;

  function paint(){
    raf = 0;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if(progress) progress.style.transform = `scaleX(${Math.min(1, y / max)})`;
    if(header && hero && !header.classList.contains('inner')){
      // White header only after the top hero image has completely passed the viewport.
      header.classList.toggle('scrolled', hero.getBoundingClientRect().bottom <= 0);
    }
    if(heroImg && !reduced){
      const target = Math.min(12, y * .009);
      heroY += (target - heroY) * .08;
      heroImg.style.transform = `translate3d(-2%,calc(-2% + ${heroY}px),0) scale(1.018)`;
      if(Math.abs(target - heroY) > .08) raf = requestAnimationFrame(paint);
    }
  }
  addEventListener('scroll',()=>{y=scrollY;if(!raf)raf=requestAnimationFrame(paint)},{passive:true});
  addEventListener('resize',()=>{if(!raf)raf=requestAnimationFrame(paint)},{passive:true});
  paint();

  if(menuBtn && mobileNav){
    const bars=menuBtn.querySelectorAll('span');
    menuBtn.addEventListener('click',()=>{
      const open=mobileNav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded',String(open));
      document.body.classList.toggle('nav-open',open);
      if(bars.length===3){
        bars[0].style.transform=open?'translateY(7px) rotate(45deg)':'';
        bars[1].style.opacity=open?'0':'';
        bars[2].style.transform=open?'translateY(-7px) rotate(-45deg)':'';
      }
    });
    mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mobileNav.classList.remove('open');document.body.classList.remove('nav-open');menuBtn.setAttribute('aria-expanded','false')}));
    addEventListener('keydown',e=>{if(e.key==='Escape'&&mobileNav.classList.contains('open')){mobileNav.classList.remove('open');document.body.classList.remove('nav-open');menuBtn.setAttribute('aria-expanded','false')}});
  }

  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('visible');io.unobserve(entry.target)}
  }),{threshold:.055,rootMargin:'0px 0px -8px 0px'});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  // Useful only on the long Services page on mobile.
  const serviceSelect=document.querySelector('.service-select');
  if(serviceSelect){
    serviceSelect.addEventListener('change',()=>{
      const target=serviceSelect.value && document.querySelector(serviceSelect.value);
      if(target){target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});serviceSelect.value=''}
    });
  }

  // Portfolio filters stay because they materially reduce browsing work across 20+ images.
  const tabs=[...document.querySelectorAll('[data-tab]')];
  tabs.forEach(tab=>tab.addEventListener('click',()=>{
    tabs.forEach(t=>t.classList.toggle('active',t===tab));
    const wanted=tab.dataset.tab;
    document.querySelectorAll('[data-project]').forEach(card=>card.classList.toggle('is-hidden',wanted!=='all'&&card.dataset.project!==wanted));
  }));

  document.querySelectorAll('.faq-question').forEach(btn=>btn.addEventListener('click',()=>{
    const item=btn.closest('.faq-item');
    const open=item.classList.toggle('open');
    btn.setAttribute('aria-expanded',String(open));
  }));

  // Portfolio lightbox.
  const lightbox=document.getElementById('projectLightbox');
  if(lightbox){
    const lbImg=lightbox.querySelector('img');
    const caption=lightbox.querySelector('.lightbox-caption');
    const close=()=>{lightbox.classList.remove('open');lightbox.setAttribute('aria-hidden','true');document.body.style.overflow=''};
    const open=item=>{
      const img=item.querySelector('img'); if(!img) return;
      lbImg.src=img.currentSrc||img.src; lbImg.alt=img.alt||'Premier Remodeling project';
      caption.textContent=(item.querySelector(':scope > span')?.textContent||'Project photo').trim();
      lightbox.classList.add('open'); lightbox.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
    };
    document.querySelectorAll('.portfolio-item').forEach(item=>{
      item.addEventListener('click',()=>open(item));
      item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(item)}});
    });
    lightbox.querySelector('.lightbox-close')?.addEventListener('click',close);
    lightbox.addEventListener('click',e=>{if(e.target===lightbox)close()});
    addEventListener('keydown',e=>{if(e.key==='Escape'&&lightbox.classList.contains('open'))close()});
  }

  const form=document.querySelector('[data-contact-form]');
  if(form){
    const getContactConfig=async()=>{
      const fallback={
        businessEmail:(window.SITE_CONFIG?.businessEmail||'').trim(),
        contactEndpoint:(window.SITE_CONFIG?.contactEndpoint||'/api/contact').trim()||'/api/contact'
      };
      // A file:// preview cannot reach the included Node inbox. The launchers open
      // the same files through http://localhost:8080, which is the supported test path.
      if(location.protocol==='file:') return {...fallback,directFilePreview:true};
      try{
        const r=await fetch('/api/site-config?ts='+Date.now(),{
          cache:'no-store',
          headers:{'Accept':'application/json','Cache-Control':'no-cache'}
        });
        if(r.ok){
          const d=await r.json();
          return {
            businessEmail:String(d.businessEmail||'').trim(),
            contactEndpoint:String(d.contactEndpoint||'/api/contact').trim()||'/api/contact',
            builtInAvailable:d.builtInAvailable!==false,
            directFilePreview:false
          };
        }
      }catch{}
      return {...fallback,directFilePreview:false};
    };

    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const status=form.querySelector('.form-status');
      const submit=form.querySelector('button[type="submit"]');
      const fd=new FormData(form);
      const jobs=fd.getAll('jobType').filter(Boolean);
      const files=fd.getAll('files').filter(f=>f&&f.name);
      if(files.length>8){
        status.textContent='Please upload no more than 8 files.';
        return;
      }
      if(files.some(f=>f.size>12*1024*1024)){
        status.textContent='Each attachment must be 12 MB or smaller.';
        return;
      }
      if(files.reduce((sum,f)=>sum+f.size,0)>25*1024*1024){
        status.textContent='Attachments must be 25 MB or smaller combined.';
        return;
      }
      if(!jobs.length){
        status.textContent='Please select at least one job type.';
        form.querySelector('.job-types')?.scrollIntoView({behavior:'smooth',block:'center'});
        return;
      }

      const cfg=await getContactConfig(); // always fresh; never reuse old settings
      const businessEmail=(cfg.businessEmail||'').trim();
      const endpoint=(cfg.contactEndpoint||'/api/contact').trim()||'/api/contact';

      // Explain direct-file testing clearly instead of reporting a false setup error.
      if(cfg.directFilePreview && endpoint==='/api/contact'){
        if(!businessEmail){
          status.textContent='Local inquiry testing requires the website server. Close this file and start the site with RUN_WINDOWS.bat or RUN_MAC.command.';
          return;
        }
        // If an email fallback is configured, continue below and use it after the
        // built-in endpoint predictably fails in file:// mode.
      }

      status.textContent='Sending…';
      submit?.setAttribute('disabled','');
      try{
        const res=await fetch(endpoint,{method:'POST',body:fd,headers:{'Accept':'application/json'},cache:'no-store'});
        if(!res.ok)throw new Error('Request failed');
        status.textContent='Thanks — your project inquiry has been sent.';
        form.reset();
        return;
      }catch(err){
        // A configured email is an emergency fallback. It opens the visitor's
        // email application; automatic email notifications require an external
        // form/CRM or mail service configured by the site owner.
        if(businessEmail){
          const subject=encodeURIComponent(`New project inquiry — ${jobs.join(', ')}`);
          const body=encodeURIComponent(
            `Name: ${fd.get('firstName')||''} ${fd.get('lastName')||''}\n`+
            `Customer email: ${fd.get('email')||''}\nPhone: ${fd.get('phone')||''}\n`+
            `Address: ${fd.get('address')||''}\nYear built: ${fd.get('yearBuilt')||''}\n`+
            `Job type(s): ${jobs.join(', ')}\n\nProject description:\n${fd.get('message')||''}`+
            (files.length?`\n\nFiles selected: ${files.map(f=>f.name).join(', ')}\nPlease attach these files manually before sending.`:'')
          );
          status.textContent=files.length?'Online inbox unavailable. Opening your email app; attach the selected files before sending.':'Online inbox unavailable. Opening your email app…';
          location.href=`mailto:${businessEmail}?subject=${subject}&body=${body}`;
        }else{
          status.textContent='The online form could not send right now. Please call (801) 725-0000.';
        }
      }finally{
        submit?.removeAttribute('disabled');
      }
    });
  }


  // Catch any image that had already failed before this script reached the end of the page.
  document.querySelectorAll('img').forEach(img=>{
    if(img.complete && img.naturalWidth===0)applyImageFallback(img);
  });

})();