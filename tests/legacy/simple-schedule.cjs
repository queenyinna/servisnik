const a=require('assert'),fs=require('fs'),{sandbox}=require('./qa.cjs');
const change=(h,id,v)=>{const e=h.$(id);a(e,id);e.value=v;e.oninput?.()};
(async()=>{
 const h=await sandbox();h.c.openSetup();change(h,'setupProviderName','Антон');await h.c.advanceSetup();change(h,'setup_0_name','Тренировки');change(h,'setup_0_price','3000');await h.c.advanceSetup();
 a(h.$('setup_0_date'));a(h.$('setup_0_frequency'));a.equal(h.$('setupFields').querySelectorAll('details').length,0);
 change(h,'setup_0_date','2026-10-20');change(h,'setup_0_scheduleTime','18:30');change(h,'setup_0_frequency','custom');change(h,'setup_0_intervalEvery','2');change(h,'setup_0_intervalUnit','weeks');
 change(h,'setup_0_frequency','none');a(!h.$('setupFields').querySelectorAll('input').some(e=>e.id==='setup_0_intervalEvery'));a.equal(h.$('setup_0_date').value,'2026-10-20');
 change(h,'setup_0_frequency','monthly');await h.c.closeSetup();const r=await sandbox([],{cloud:h.cloud});a.equal(r.$('setup_0_frequency').value,'monthly');a.equal(r.$('setup_0_date').value,'2026-10-20');a.equal(r.$('setup_0_scheduleTime').value,'18:30');a.equal(await r.c.saveSetup(),true);a.equal(r.read()[0].frequency,'monthly');a.equal(r.read()[0].forecastEnabled,false);
 a(!fs.readFileSync('dist/index.html','utf8').includes('id="setupResult"'));
 console.log('PASS simple schedule: visible date/repeat, conditional interval, date retained, draft reload, monthly save, no setup budget preview or implicit inclusion');
})().catch(e=>{console.error(e);process.exitCode=1});
