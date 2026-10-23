const a=require('assert'),{sandbox}=require('./qa.cjs');
const profile={id:1,entityType:'provider',name:'Антон',groupId:1,groupName:'Антон'},visit={id:2,entityType:'service',name:'Тренировки',groupId:1,groupName:'Антон',paymentType:'visit',price:3000},pack={...visit,paymentType:'package',contractAmount:24000,packageCount:8,remaining:8,isPaid:false},gym={...visit,id:3,name:'Зал',paymentType:'period',contractAmount:13000,duration:'2',isPaid:false};
const cash=s=>s.replace(/\s/g,'');
(async()=>{
const h=await sandbox([profile,visit]);a.equal(h.$('cashDue').textContent,'—');a.equal(h.$('dueTotal').textContent,'—');a.equal(h.$('scheduleMissing').hidden,true);a.equal(h.c.forecast(visit).due,0);h.c.openGroup(1);a(h.c.expenseSummary(h.read()).missing>0);a.equal(h.$('groupBudgetFold').hidden,true);a.equal(h.c.paymentSummary([profile]).missing,0);
const p=await sandbox([profile,pack]);a.equal(cash(p.$('cashDue').textContent),'24000₽');p.c.openGroup(1);a.equal(p.c.expenseSummary(p.c.groupItems(1)).due,24000);a.equal(p.$('cards').querySelector('.service-due'),undefined);a.equal(p.$('groupCards').querySelector('.service-due'),undefined);
const both=await sandbox([profile,pack,gym]);a.equal(cash(both.$('cashDue').textContent),'37000₽');both.c.openGroup(1);a.equal(both.c.expenseSummary(both.c.groupItems(1)).due,37000);
const paid=await sandbox([profile,{...pack,isPaid:true}]);a.equal(paid.c.paymentSummary(paid.read()).due,0);a.equal(paid.c.aggregatePrepaid(paid.read()).amount,24000);a.equal(paid.$('groupCards').querySelector('.service-due'),undefined);
const scheduled={...visit,date:'2026-10-15T10:00',quantity:2};const s=await sandbox([profile,scheduled]);a.equal(cash(s.$('cashDue').textContent),'6000₽');a.equal(s.$('scheduleMissing').hidden,true);a.equal(cash(s.$('dueTotal').textContent),'6000₽');
const mixed=await sandbox([profile,scheduled,{...visit,id:4}]);a.equal(cash(mixed.$('cashDue').textContent),'6000₽');a.equal(mixed.$('scheduleMissing').hidden,true);
const outside=await sandbox([profile,{...visit,date:'2026-11-15T10:00'}]);a.equal(cash(outside.$('cashDue').textContent),'0₽');a.equal(outside.$('scheduleMissing').hidden,true);
const weekly=await sandbox([profile,{...visit,recurring:true,frequency:'weekly',weekdays:[4]}]);a.equal(weekly.$('scheduleMissing').hidden,true);a(weekly.c.paymentSummary(weekly.read()).due>0);
const future=await sandbox([profile,{...gym,startDate:'2026-12-01'}]);a.equal(future.c.paymentSummary(future.read()).due,0);
console.log('PASS payment visibility: unscheduled quote is not debt; incomplete totals marked; unpaid package and gym visible; provider and global sums; paid package balance preserved; quantity; mixed data; future dates; weekly schedule; future membership');
})().catch(e=>{console.error(e);process.exitCode=1});
