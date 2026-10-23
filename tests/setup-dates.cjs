const a=require('assert'),{sandbox}=require('./qa.cjs');
const change=(h,id,v)=>{const x=h.$(id);a(x,id);x.value=v;x.oninput?.()};
(async()=>{
 const h=await sandbox();h.c.openSetup();change(h,'setupProviderName','Gym');await h.c.advanceSetup();change(h,'setup_0_name','Membership');h.$('setupFields').querySelectorAll('button').find(b=>b.textContent==='Абонемент').onclick();change(h,'setup_0_contractAmount','13000');
 a.equal(h.$('setupFields').querySelectorAll('input').filter(x=>x.type==='date').length,0,'price step has no calendars');
 await h.c.advanceSetup();change(h,'setup_0_duration','2');change(h,'setup_0_paidDate','2026-10-10');change(h,'setup_0_startDate','2026-10-12');
 h.$('setupBack').onclick();a.equal(h.$('setupFields').querySelectorAll('input').filter(x=>x.type==='date').length,0);await h.c.advanceSetup();a.equal(h.$('setup_0_paidDate').value,'2026-10-10');a.equal(h.$('setup_0_startDate').value,'2026-10-12');
 await h.c.saveSetup();const s=h.read()[0];a.equal(s.paidDate,'2026-10-10');a.equal(s.startDate,'2026-10-12');a.equal(s.duration,'2');a.equal(s.contractAmount,13000);a.equal(s.isPaid,true);
 console.log('PASS dates step: no price calendars, payment/start distinction, back retains dates, duration, skip schedule preserves paid membership');
})().catch(e=>{console.error(e);process.exitCode=1});
