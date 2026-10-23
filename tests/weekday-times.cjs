const a=require('assert'),fs=require('fs'),{sandbox}=require('./qa.cjs');
const change=(h,id,v)=>{const x=h.$(id);a(x,id);x.value=v;x.oninput?.()};
(async()=>{
 const h=await sandbox();h.c.openSetup();change(h,'setupProviderName','Антон');await h.c.advanceSetup();change(h,'setup_0_name','Тренировки');change(h,'setup_0_price','3000');await h.c.advanceSetup();change(h,'setup_0_date','2026-10-13');change(h,'setup_0_frequency','weekly');
 for(const d of ['Вт','Пт'])h.$('setupFields').querySelectorAll('button').find(b=>b.textContent===d).onclick();change(h,'setup_0_day_2','18:00');change(h,'setup_0_day_5','10:00');await h.c.closeSetup();const r=await sandbox([],{cloud:h.cloud});a.equal(r.$('setup_0_day_2').value,'18:00');a.equal(r.$('setup_0_day_5').value,'10:00');a.equal(await r.c.saveSetup(),true);const s=r.read()[0];
 const local=(x)=>new Date(x);let n=r.c.nextOccurrence(s,local('2026-10-13T17:00'));a.equal(n.getDay(),2);a.equal(n.getHours(),18);n=r.c.nextOccurrence(s,local('2026-10-13T19:00'));a.equal(n.getDay(),5);a.equal(n.getHours(),10);
 a.equal(r.c.scheduledCount(s,local('2026-10-13T19:00'),local('2026-10-17T00:00')),1);
 const blank={...s,weekdayTimes:{2:'',5:'10:00'}};n=r.c.nextOccurrence(blank,local('2026-10-13T19:00'));a.equal(n.getDay(),2);a.equal(r.c.occurrenceHasTime(blank,n),false);
 const done={...s,visits:[{scheduledDate:'2026-10-16'}]};a.equal(r.c.nextOccurrence(done,local('2026-10-13T19:00')).getDate(),20);
 const legacy={...s,weekdayTimes:undefined,scheduleTime:'17:30',dateHasTime:true};a.equal(r.c.nextOccurrence(legacy,local('2026-10-13T17:00')).getMinutes(),30);
 r.c.openEditor(s.id);a.equal(r.$('editorWeekTime_2').value,'18:00');change(r,'editorWeekTime_2','19:15');a.equal(r.c.readForm().weekdayTimes[2],'19:15');a(r.c.isDirty());r.c.scheduleDraft();await r.c.flushDraft();const e=await sandbox([],{cloud:r.cloud});a.equal(e.$('editorWeekTime_2').value,'19:15');
 const html=fs.readFileSync('dist/index.html','utf8');a(!html.includes('id="setupSkip"'));a(!html.includes('id="setupDraftStatus"'));
 console.log('PASS per-day times: setup draft/reload/save, timed next visit, elapsed visit, blank time, completed date, legacy shared time, editor edit/draft reload, removed footer noise');
})().catch(e=>{console.error(e);process.exitCode=1});
