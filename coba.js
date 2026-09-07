// coba.js — AUTO dengan tombol ON/OFF (auto OFF kalau selesai)
(async function(){
  console.clear();
  const FONT="'JetBrains Mono',monospace";
  const COLORS={background:'#282C34',panel:'#21252B',foreground:'#ABB2BF',muted:'#5C6370',dim:'#636D83',border:'#3E4452',success:'#98C379',successBg:'rgba(152,195,121,0.14)',info:'#61AFEF',infoBg:'rgba(97,175,239,0.14)',warning:'#E5C07B',warningBg:'rgba(229,192,123,0.14)',error:'#E06C75',errorBg:'rgba(224,108,117,0.14)',cyan:'#56B6C2'};
  const STYLE={tag:(bg,fg)=>`background:${bg};color:${fg};padding:2px 8px;border-radius:4px;font-family:${FONT};font-size:11px;font-weight:800;`,text:(c,w)=>`font-family:${FONT};font-size:11px;color:${c};font-weight:${w||400};`};
  const LOG={
    brand:(m)=>console.log('%c RAZOR %c '+(m||'AUTO — One Dark')+' %c',`background:${COLORS.success};color:${COLORS.background};font-weight:900;padding:6px 14px;border-radius:8px 0 0 8px;font-family:${FONT};font-size:13px;`,`background:${COLORS.panel};color:${COLORS.foreground};padding:6px 14px;border-radius:0 8px 8px 0;font-family:${FONT};font-size:11px;border:1px solid ${COLORS.border};border-left:none;`,`background:transparent;color:${COLORS.muted};font-family:${FONT};font-size:10px;`),
    ok:(m)=>console.log('%c ✔ %c '+m,STYLE.tag(COLORS.successBg,COLORS.success),STYLE.text(COLORS.success,600)),
    act:(m)=>console.log('%c › %c '+m,STYLE.tag('rgba(92,99,112,0.2)',COLORS.dim),STYLE.text(COLORS.muted)),
    info:(m)=>console.log('%c INFO %c '+m,STYLE.tag(COLORS.infoBg,COLORS.info),STYLE.text(COLORS.muted)),
    warn:(m)=>console.log('%c WARN %c '+m,STYLE.tag(COLORS.warningBg,COLORS.warning),STYLE.text(COLORS.warning)),
    err:(m)=>console.log('%c ERR %c '+m,STYLE.tag(COLORS.errorBg,COLORS.error),STYLE.text(COLORS.error)),
    data:(m)=>console.log('%c 📋 %c '+m,STYLE.tag('rgba(92,99,112,0.2)',COLORS.dim),STYLE.text(COLORS.foreground,500)),
    rule:()=>console.log('%c'+'─'.repeat(62),`color:${COLORS.border};font-family:${FONT};font-size:10px;`),
    click:(m)=>console.log('%c KLIK %c '+m,STYLE.tag(COLORS.infoBg,COLORS.cyan),STYLE.text(COLORS.foreground,600)),
  };
  console.log(''); LOG.brand('AUTO'); LOG.info('coba.js v2026-09-03d ON/OFF + LUQ×QMIA'); LOG.rule();
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  // ── tombol ON/OFF ──
  let autoOn = true;
  const ui = document.createElement('div');
  ui.style.cssText='position:fixed;right:16px;bottom:16px;z-index:999999;display:flex;gap:8px;align-items:center;background:#21252B;border:1px solid #3E4452;border-radius:10px;padding:8px 12px;box-shadow:0 4px 16px rgba(0,0,0,0.3);font-family:'+FONT;
  ui.innerHTML='<span style="color:#98C379;font-size:11px;font-weight:800;letter-spacing:0.5px">RAZOR</span><button id="razor-toggle" style="background:#98C379;color:#282C34;border:none;border-radius:6px;padding:6px 14px;font-family:\'JetBrains Mono\',monospace;font-size:11px;font-weight:900;cursor:pointer;letter-spacing:0.5px">AUTO: ON</button>';
  document.body.appendChild(ui);
  const btnToggle = document.getElementById('razor-toggle');
  function setToggle(on){
    autoOn = on;
    btnToggle.textContent = on ? 'AUTO: ON' : 'AUTO: OFF';
    btnToggle.style.background = on ? '#98C379' : '#5C6370';
    btnToggle.style.color = on ? '#282C34' : '#ABB2BF';
  }
  btnToggle.onclick = ()=> setToggle(!autoOn);
  // observer biar auto OFF kalau selesai
  function autoOff(){ setToggle(false); LOG.brand('AUTO OFF — selesai'); }

  const hasSoal = /SOAL \d+ dari \d+/.test(document.body.innerText);
  if(location.href.includes('/finish')){
    LOG.info('Mode: FINISH — balik ke daftar paket');
    const base=location.href.split('/packages')[0];
    location.href=base+'/packages';
    autoOff();
    return;
  }

  if(!(hasSoal && window.questions && Array.isArray(window.questions) && window.questions.length)){
    const hasReviewCheckbox=document.getElementById('review-checkbox-0');
    const genericCheckbox=document.querySelector('input[type="checkbox"]');
    if(hasReviewCheckbox || genericCheckbox){
      LOG.info('Mode: CHECKBOX');
      if(hasReviewCheckbox){
        let index=0,clicked=0;
        while(index<10){
          if(!autoOn){ await sleep(500); continue; }
          const cb=document.getElementById('review-checkbox-'+index);
          const nextBtn=document.getElementById('next-button-'+index);
          if(!cb && !nextBtn) break;
          if(cb && !cb.checked){ cb.click(); LOG.ok('Checkbox '+index); clicked++; await sleep(60); }
          if(nextBtn){ nextBtn.removeAttribute('disabled'); nextBtn.classList.remove('disabled'); nextBtn.disabled=false; nextBtn.click(); LOG.act('Next '+index); await sleep(80); }
          index++; if(cb && !nextBtn) break;
        }
        if(clicked) LOG.info('Selesai '+clicked+' checkbox');
      } else {
        const cb=genericCheckbox;
        if(cb && !cb.checked){
          const label=document.querySelector('label[for="'+cb.id+'"]')||cb.closest('label');
          if(label) label.click(); else cb.click();
          LOG.ok('Checkbox generic diklik'); await sleep(60);
        }
      }
      for(let w=0;w<10;w++){
        if(!autoOn){ await sleep(500); continue; }
        const btn=Array.from(document.querySelectorAll('button')).find(b=>{const t=b.textContent.trim().toUpperCase(); return (t.includes('MULAI')||t.includes('SELANJUTNYA'))&&b.offsetParent!==null;});
        if(btn && !btn.disabled && !btn.classList.contains('disabled')){ btn.click(); LOG.act(btn.textContent.trim()+' diklik'); break; }
        if(btn && btn.disabled){ btn.removeAttribute('disabled'); btn.classList.remove('disabled'); btn.disabled=false; btn.click(); LOG.act(btn.textContent.trim()+' (force) diklik'); break; }
        await sleep(80);
      }
      return;
    }
  } else {
    // dummy biar tidak masuk checkbox
  }
  // tutup else hasSoal
  if(!(hasSoal && window.questions && Array.isArray(window.questions) && window.questions.length)){
    // cegah lanjut kalau bukan exercise tapi sudah handle checkbox/finish
    // daftar paket
    const isDaftarPaket=document.querySelector('.exercise-card, .panel-card-stats, a.list-group-item-revamp-penilaian') || (location.href.includes('/packages') && !location.href.includes('/exercise') && !location.href.includes('/activities'));
    if(isDaftarPaket && !hasSoal){
      LOG.info('Mode: DAFTAR PAKET');
      for(let t=0;t<10;t++){
        if(!autoOn){ await sleep(500); continue; }
        const cards=Array.from(document.querySelectorAll('.exercise-card, .panel-card-stats, a.list-group-item-revamp-penilaian, .panel.panel-card-stats'));
        if(cards.length){
          function getVal(card){const el=card.querySelector('.h5-reg'); if(el){const m=(el.textContent||'').match(/(\d+\.?\d*)/); if(m) return parseFloat(m[1]);} return null;}
          function getName(card){return (card.querySelector('.h5-semibold')?.textContent||'').trim()||card.innerText.split('\n')[0]||'Aktivitas';}
          let target=null,reason='';
          for(const c of cards){const v=getVal(c); if(v!==null&&v<100){target=c;reason='nilai '+v+' (<100)';break;}}
          if(!target) for(const c of cards){ if(getVal(c)===null){target=c;reason='belum dikerjakan';break;}}
          if(!target){ LOG.brand('SEMUA 100 — SELESAI'); autoOff(); return; }
          LOG.info('Target: "'+getName(target)+'" — '+reason);
          target.scrollIntoView({behavior:'instant',block:'center'}); await sleep(60);
          try{target.click();}catch{} try{target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));}catch{}
          const href=target.getAttribute('href')||target.querySelector('a')?.getAttribute('href');
          if(href&&href.includes('/activities/')){ await sleep(80); if(!location.href.includes(href)) location.href=href; }
          return;
        }
        await sleep(80);
      }
      LOG.warn('Card aktivitas tidak ketemu'); return;
    }
  }

  const questions=window.questions;
  if(!questions||!Array.isArray(questions)||!questions.length){ LOG.warn('Halaman tidak dikenali'); return; }
  const token=document.querySelector('meta[name="csrf-token"]')?.content||'';
  const checkUrl=location.href+'/check-answer';
  async function doFetch(q, ans){
    const body=`taskId=${encodeURIComponent(q.task_id)}&questionId=${encodeURIComponent(q.id)}&show_explanation=true&show_correction=true&thisAnswer=${encodeURIComponent(ans)}&type=${encodeURIComponent(q.type)}&questionChoices=${encodeURIComponent(JSON.stringify(q.choices||{}))}&maxAnswering=1&answerCount=1`;
    const r=await fetch(checkUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest','X-CSRF-TOKEN':token},body,credentials:'include'});
    return r.json();
  }
  async function fetchJawaban(q){
    if(q.type==='LUQ'){
      const n=Array.isArray(q.choices)?q.choices.length:15;
      const dummy=Array.from({length:n},()=>({answer:'zzz'}));
      try{
        const body=`taskId=${encodeURIComponent(q.task_id)}&questionId=${encodeURIComponent(q.id)}&show_explanation=true&show_correction=true&thisAnswer=${encodeURIComponent(JSON.stringify(dummy))}&type=LUQ&questionChoices=${encodeURIComponent(JSON.stringify(q.choices||{}))}&maxAnswering=1&answerCount=${n}`;
        const r=await fetch(checkUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest','X-CSRF-TOKEN':token},body,credentials:'include'});
        const d=await r.json();
        let ca=d.correct_answer||d.answer;
        if(Array.isArray(ca)) ca=ca.flat(Infinity);
        if(Array.isArray(ca) && ca.length===2 && Array.isArray(ca[0]) && ca[1] && typeof ca[1]==='object' && !Array.isArray(ca[1])) ca=[...ca[0], ...Object.values(ca[1])];
        if(Array.isArray(ca) && ca.length===1 && Array.isArray(ca[0])) ca=ca[0];
        if(Array.isArray(ca)){
          const vals=ca.map(v=> typeof v==='object'&&v!==null?String(v.answer??v.value??Object.values(v)[0]??'').trim():String(v).trim()).filter(v=>v&&!v.includes('[object Object]'));
          if(vals.length===n) return vals.join(',');
        } else if(ca && n===1) return String(ca).trim();
      }catch(e){}
      await sleep(15);
      try{
        const ans=(Array.isArray(q.choices)?q.choices:[]).map(html=>{
          const txt=String(html).replace(/<[^>]*>/g,'').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
          let m=txt.match(/(-?\d+)\s*([+x×*])\s*\(?\s*(-?\d+)\s*\)?/);
          if(m){const a=parseInt(m[1]),b=parseInt(m[3]),op=m[2]; if(op==='+') return String(a+b); if(op==='x'||op==='×'||op==='*') return String(a*b);}
          return null;
        });
        if(ans.every(v=>v!==null)) return ans.join(',');
      }catch(e){}
    }
    if(q.type==='MQIA'){
      for(let n=1;n<=3;n++){
        const dummy=Array.from({length:n},()=>({answer:'zzz'}));
        try{
          const d=await doFetch(q, JSON.stringify(dummy));
          const ca=d.correct_answer||d.answer;
          if(Array.isArray(ca)){
            const vals=ca.map(v=> typeof v==='object'?String(v.answer??v).trim():String(v).trim()).filter(Boolean);
            if(vals.length) return vals.join(',');
          } else if(ca) return String(ca).trim();
        }catch(e){}
        await sleep(15);
      }
      if(Array.isArray(q.answer)) return q.answer.map(v=>String(v).trim()).filter(Boolean).join(',');
      if(q.answer) return String(q.answer).trim();
    }
    if(q.type==='QSAT'){
      try{
        const d=await doFetch(q,'zzz');
        if(d.correct_answer) return Array.isArray(d.correct_answer)?String(d.correct_answer[0]).trim():String(d.correct_answer).trim();
        if(d.is_correct===true||d.is_correct===1||d.is_correct==='1') return 'zzz';
      }catch(e){}
      await sleep(15);
      if(q.answer) return String(q.answer).trim();
    }
    const choices=q.choices||{};
    const keys=Object.keys(choices);
    if(q.type==='MCQSA'){
      for(const key of keys){
        try{
          const d=await doFetch(q,key);
          if(d.correct_answer) return Array.isArray(d.correct_answer)?d.correct_answer.join(','):String(d.correct_answer);
          if(d.is_correct===true||d.is_correct===1||d.is_correct==='1') return key;
        }catch(e){}
        await sleep(15);
      }
    }
    if(q.type==='CQ'){
      const n=keys.length;
      for(const ans of [keys.join(','), JSON.stringify(keys), keys.join(''), 'A', 'B']){
        try{
          const d=await doFetch(q,ans);
          if(d.correct_answer){
            const ca=Array.isArray(d.correct_answer)?d.correct_answer:String(d.correct_answer).split(',').map(s=>s.trim());
            if(ca.length) return ca.join(',');
          }
        }catch(e){}
        await sleep(15);
      }
      for(let mask=1;mask<(1<<n);mask++){
        const combo=keys.filter((_,i)=>mask&(1<<i));
        const ans=combo.join(',');
        try{
          const d=await doFetch(q,ans);
          if(d.correct_answer){
            const ca=Array.isArray(d.correct_answer)?d.correct_answer:String(d.correct_answer).split(',').map(s=>s.trim());
            if(ca.length) return ca.join(',');
          }
          if(d.is_correct===true||d.is_correct===1||d.is_correct==='1') return combo.join(',');
        }catch(e){}
        await sleep(10);
      }
    }
    return null;
  }
  async function tipeOther(q){
    if(q.correct_answer) return Array.isArray(q.correct_answer)?q.correct_answer.join(','):String(q.correct_answer);
    return null;
  }
  let lastIdx=-1;
  while(true){
    if(!autoOn){ await sleep(500); continue; }
    if(location.href.includes('/finish')){ LOG.brand('FINISH'); autoOff(); break; }
    const m=document.body.innerText.match(/SOAL (\d+) dari (\d+)/);
    if(!m){ LOG.brand('SELESAI'); autoOff(); break; }
    const curIdx=parseInt(m[1])-1;
    if(curIdx===lastIdx){ await sleep(60); continue; }
    lastIdx=curIdx;
    const q=questions[curIdx];
    if(!q) break;
    LOG.info('Soal '+(curIdx+1)+'/'+questions.length+' type='+q.type);
    let jawaban=await fetchJawaban(q);
    if(!jawaban) jawaban=await tipeOther(q);
    if(!jawaban){ LOG.err('Soal '+(curIdx+1)+' gagal/type '+q.type); }
    else {
      LOG.ok('Jawaban '+(curIdx+1)+': '+jawaban);
      if(q.type==='LUQ'){
        const vals=String(jawaban).split(',').map(s=>s.trim());
        const inputs=Array.from(document.querySelectorAll('input[type="text"], input[type="number"], input.answer-input, .answer-input, input:not([type=radio]):not([type=checkbox]):not([type=hidden])')).filter(el=>el.offsetParent!==null && !el.closest('.d-none'));
        const visibleInputs=inputs.length?inputs:Array.from(document.querySelectorAll('input')).filter(el=>el.offsetParent!==null && el.type!=='radio' && el.type!=='checkbox' && el.type!=='hidden');
        LOG.info('LUQ inputs: '+visibleInputs.length+' vals: '+vals.length);
        visibleInputs.forEach((inp,i)=>{
          if(i<vals.length){
            inp.removeAttribute('readonly'); inp.focus(); inp.click();
            try{inp.value=vals[i];}catch{}
            try{const d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp),'value')?.set; if(d) d.call(inp,vals[i]);}catch{}
            ['input','change','keyup'].forEach(ev=>inp.dispatchEvent(new Event(ev,{bubbles:true})));
            if(window.$) try{window.$(inp).trigger('change');}catch{}
          }
        });
        LOG.ok('Isi LUQ: '+vals.join(','));
      } else if(q.type==='QSAT' || q.type==='MQIA'){
        const vals=String(jawaban).split(',').map(s=>s.trim()).filter(Boolean);
        const panel=document.getElementById('question-panel-'+window.questionKey)||document;
        let inputs=Array.from(panel.querySelectorAll('input[type="text"], input[type="number"], input.answer-input, textarea, .answer-input, input:not([type=radio]):not([type=checkbox]):not([type=hidden])')).filter(el=>el.offsetParent!==null);
        if(!inputs.length) inputs=Array.from(document.querySelectorAll('input')).filter(el=>el.offsetParent!==null && el.type!=='radio' && el.type!=='checkbox' && el.type!=='hidden');
        if(!inputs.length) inputs=[document.querySelector('input[type="text"], input:not([type])')].filter(Boolean);
        inputs.forEach((inp,i)=>{
          const v=vals[i]!==undefined?vals[i]:vals[0];
          if(v!==undefined){
            inp.removeAttribute('readonly'); inp.focus(); inp.click();
            try{inp.value=v;}catch{}
            try{const s=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp),'value')?.set; if(s) s.call(inp,v);}catch{}
            ['input','change','keyup','blur'].forEach(ev=>inp.dispatchEvent(new Event(ev,{bubbles:true})));
            if(window.$) try{window.$(inp).trigger('change');}catch{}
          }
        });
        LOG.ok('Isi '+q.type+': '+vals.join(',')+' → '+inputs.length+' input');
      } else {
        const keys=String(jawaban).split(',').map(s=>s.trim()).filter(Boolean);
        for(const key of keys){
          let inp=document.querySelector('input.select-answer-cq-'+q.id+'[value="'+key+'"]')||document.querySelector('input[name="choice['+q.id+']"][value="'+key+'"]')||document.querySelector('input.select-answer[value="'+key+'"]');
          if(!inp){
            const candRadio=Array.from(document.querySelectorAll('input[type="radio"][value="'+key+'"]'));
            const candCheck=Array.from(document.querySelectorAll('input[type="checkbox"][value="'+key+'"]'));
            const candidates=[...candRadio,...candCheck];
            inp=candidates.find(r=>{const lab=document.querySelector('label[for="'+r.id+'"]'); return lab&&lab.offsetParent!==null;})||candidates[0];
          }
          if(inp){
            const label=document.querySelector('label[for="'+inp.id+'"]');
            if(label&&label.offsetParent!==null) label.click();
            else if(label) label.click();
            else {inp.checked=true; inp.click(); try{inp.dispatchEvent(new Event('change',{bubbles:true}));}catch{}}
            LOG.ok('Klik '+key+' ('+inp.id.slice(0,8)+')');
          } else LOG.warn('Input '+key+' tidak ditemukan');
          await sleep(30);
        }
      }
    }
    await sleep(30);
    let btn=null;
    for(let w=0;w<6;w++){
      if(!autoOn) break;
      btn=Array.from(document.querySelectorAll('button')).find(b=>b.offsetParent!==null && b.textContent.trim().toUpperCase().includes('SELANJUTNYA'));
      if(btn){
        if(btn.disabled||btn.classList.contains('disabled')){btn.removeAttribute('disabled'); btn.classList.remove('disabled'); btn.disabled=false; if(window.$) try{window.$(btn).prop('disabled',false).removeClass('disabled');}catch{}}
        if(!btn.disabled&&!btn.classList.contains('disabled')) break;
      }
      await sleep(30);
    }
    if(btn && autoOn){ btn.click(); LOG.act(btn.textContent.trim()+' diklik'); await sleep(80); }
    if(curIdx===questions.length-1){
      let selesaiBtn=null;
      for(let w=0;w<15;w++){
        if(!autoOn) break;
        selesaiBtn=Array.from(document.querySelectorAll('button')).find(b=>b.offsetParent!==null && b.textContent.trim().toUpperCase().includes('SELESAI'));
        if(selesaiBtn&&selesaiBtn.offsetParent!==null){
          if(selesaiBtn.disabled||selesaiBtn.classList.contains('disabled')){selesaiBtn.removeAttribute('disabled'); selesaiBtn.classList.remove('disabled'); selesaiBtn.disabled=false; if(window.$) try{window.$(selesaiBtn).prop('disabled',false).removeClass('disabled');}catch{}}
          selesaiBtn.click(); LOG.act(selesaiBtn.textContent.trim()+' diklik'); await sleep(500); break;
        }
        await sleep(200);
      }
    } else { await sleep(40); }
    if(curIdx===questions.length-1){
      for(let w=0;w<15;w++){ if(location.href.includes('/finish')){LOG.ok('Finish'); autoOff(); break;} await sleep(300); }
      break;
    }
  }
  LOG.brand('DONE'); autoOff();
})();
