// lihat.js — cuma tampilkan jawaban (tanpa klik)
(async function(){
  console.clear();
  const FONT="'JetBrains Mono',monospace";
  const COLORS={background:'#282C34',panel:'#21252B',foreground:'#ABB2BF',muted:'#5C6370',border:'#3E4452',success:'#98C379',successBg:'rgba(152,195,121,0.14)',info:'#61AFEF',infoBg:'rgba(97,175,239,0.14)',error:'#E06C75',errorBg:'rgba(224,108,117,0.14)'};
  const STYLE={tag:(bg,fg)=>`background:${bg};color:${fg};padding:2px 8px;border-radius:4px;font-family:${FONT};font-size:11px;font-weight:800;`,text:(c,w)=>`font-family:${FONT};font-size:11px;color:${c};font-weight:${w||400};`};
  const LOG={brand:(m)=>console.log('%c RAZOR %c '+(m||'LIHAT JAWABAN — One Dark')+' %c',`background:${COLORS.success};color:${COLORS.background};font-weight:900;padding:6px 14px;border-radius:8px 0 0 8px;font-family:${FONT};font-size:13px;`,`background:${COLORS.panel};color:${COLORS.foreground};padding:6px 14px;border-radius:0 8px 8px 0;font-family:${FONT};font-size:11px;border:1px solid ${COLORS.border};border-left:none;`,`background:transparent;color:${COLORS.muted};font-family:${FONT};font-size:10px;`), ok:(m)=>console.log('%c ✔ %c '+m,STYLE.tag(COLORS.successBg,COLORS.success),STYLE.text(COLORS.success,600)), info:(m)=>console.log('%c INFO %c '+m,STYLE.tag(COLORS.infoBg,COLORS.info),STYLE.text(COLORS.muted)), err:(m)=>console.log('%c ERR %c '+m,STYLE.tag(COLORS.errorBg,COLORS.error),STYLE.text(COLORS.error)), rule:()=>console.log('%c'+'─'.repeat(62),`color:${COLORS.border};font-family:${FONT};font-size:10px;`)};
  LOG.brand(); LOG.rule();
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const qs=window.questions;
  if(!qs||!Array.isArray(qs)||!qs.length){ LOG.err('window.questions tidak ada — buka halaman exercise'); return; }
  const token=document.querySelector('meta[name="csrf-token"]')?.content||'';
  const checkUrl=location.href+'/check-answer';
  async function doFetch(q, ans){
    const body=`taskId=${encodeURIComponent(q.task_id)}&questionId=${encodeURIComponent(q.id)}&show_explanation=true&show_correction=true&thisAnswer=${encodeURIComponent(ans)}&type=${encodeURIComponent(q.type)}&questionChoices=${encodeURIComponent(JSON.stringify(q.choices||{}))}&maxAnswering=1&answerCount=1`;
    const r=await fetch(checkUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest','X-CSRF-TOKEN':token},body,credentials:'include'});
    return r.json();
  }
  LOG.info(qs.length+' soal — fetch...');
  for(let i=0;i<qs.length;i++){
    const q=qs[i];
    let jawaban=null, src='';
    try{
      if(q.type==='MCQSA'){
        for(const k of Object.keys(q.choices||{})){
          const d=await doFetch(q,k);
          if(d.correct_answer){ jawaban=Array.isArray(d.correct_answer)?String(d.correct_answer[0]):String(d.correct_answer); src='correct_answer'; break; }
          if(d.is_correct===true||d.is_correct===1||d.is_correct==='1'){ jawaban=k; src='is_correct'; break; }
          await sleep(10);
        }
      } else if(q.type==='CQ'){
        const keys=Object.keys(q.choices||{});
        for(const ans of [keys.join(','), JSON.stringify(keys), 'A']){
          const d=await doFetch(q,ans);
          if(d.correct_answer){ const ca=Array.isArray(d.correct_answer)?d.correct_answer:String(d.correct_answer).split(','); if(ca.length){ jawaban=ca.join(','); src='correct_answer'; break; } }
          await sleep(10);
        }
        if(!jawaban) for(let mask=1; mask<(1<<keys.length); mask++){
          const combo=keys.filter((_,idx)=>mask&(1<<idx)).join(',');
          const d=await doFetch(q,combo);
          if(d.correct_answer){ const ca=Array.isArray(d.correct_answer)?d.correct_answer:String(d.correct_answer).split(','); jawaban=ca.join(','); src='correct_answer'; break; }
          if(d.is_correct===true||d.is_correct===1||d.is_correct==='1'){ jawaban=combo; src='is_correct'; break; }
          await sleep(5);
        }
      } else if(q.type==='QSAT'){
        const d=await doFetch(q,'zzz');
        if(d.correct_answer) { jawaban=Array.isArray(d.correct_answer)?String(d.correct_answer[0]):String(d.correct_answer); src='correct_answer'; }
        else if(q.answer) { jawaban=String(q.answer); src='answer field'; }
      } else if(q.type==='LUQ'){
        const n=Array.isArray(q.choices)?q.choices.length:15;
        const dummy=Array.from({length:n},()=>({answer:'zzz'}));
        const body=`taskId=${encodeURIComponent(q.task_id)}&questionId=${encodeURIComponent(q.id)}&show_explanation=true&show_correction=true&thisAnswer=${encodeURIComponent(JSON.stringify(dummy))}&type=LUQ&questionChoices=${encodeURIComponent(JSON.stringify(q.choices||{}))}&maxAnswering=1&answerCount=${n}`;
        const r=await fetch(checkUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest','X-CSRF-TOKEN':token},body,credentials:'include'});
        const d=await r.json();
        let ca=d.correct_answer||d.answer;
        if(Array.isArray(ca)) ca=ca.flat(Infinity);
        if(Array.isArray(ca) && ca.length===2 && Array.isArray(ca[0]) && ca[1] && typeof ca[1]==='object' && !Array.isArray(ca[1])) ca=[...ca[0], ...Object.values(ca[1])];
        if(Array.isArray(ca) && ca.length===1 && Array.isArray(ca[0])) ca=ca[0];
        if(Array.isArray(ca)){
          const vals=ca.map(v=> typeof v==='object'&&v!==null?String(v.answer??v.value??Object.values(v)[0]??'').trim():String(v).trim()).filter(v=>v&&!v.includes('[object Object]'));
          if(vals.length===n){ jawaban=vals.join(','); src='correct_answer'; }
        } else if(ca && n===1) { jawaban=String(ca); src='correct_answer'; }
        if(!jawaban || jawaban.includes('[object Object]')){
          const ans=(Array.isArray(q.choices)?q.choices:[]).map(h=>{const t=String(h).replace(/<[^>]*>/g,'').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim(); let m=t.match(/(-?\d+)\s*([+x×*])\s*\(?\s*(-?\d+)\s*\)?/); if(m){const a=parseInt(m[1]),b=parseInt(m[3]),op=m[2]; if(op==='+') return String(a+b); if(op==='x'||op==='×'||op==='*') return String(a*b);} return null;});
          if(ans.every(v=>v!==null)){ jawaban=ans.join(','); src='hitung manual'; }
        }
      } else if(q.type==='MQIA'){
        for(let n=1;n<=3;n++){
          const dummy=Array.from({length:n},()=>({answer:'zzz'}));
          const d=await doFetch(q, JSON.stringify(dummy));
          const ca=d.correct_answer||d.answer;
          if(Array.isArray(ca)){ const vals=ca.map(v=>typeof v==='object'?String(v.answer??v).trim():String(v).trim()).filter(Boolean); if(vals.length){ jawaban=vals.join(','); src='correct_answer'; break; } }
          else if(ca){ jawaban=String(ca); src='correct_answer'; break; }
          await sleep(10);
        }
        if(!jawaban && Array.isArray(q.answer)) jawaban=q.answer.map(v=>String(v).trim()).join(',');
      }
      if(!jawaban && q.correct_answer) { jawaban=Array.isArray(q.correct_answer)?q.correct_answer.join(','):String(q.correct_answer); src='q.correct_answer'; }
      if(!jawaban && q.answer) { const a=q.answer; jawaban=Array.isArray(a)?a.join(','):String(a); src='q.answer'; }
    }catch(e){ LOG.err(e.message); }
    if(jawaban) LOG.ok('Soal '+(i+1)+' ['+q.type+'] : '+jawaban+'  ← '+src);
    else LOG.err('Soal '+(i+1)+' ['+q.type+'] : (gagal)');
  }
  LOG.rule(); LOG.brand('SELESAI — cuma lihat, tidak klik');
})();
