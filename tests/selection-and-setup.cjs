const a=require('assert'),fs=require('fs'),{sandbox}=require('./qa.cjs');
const text=n=>n.textContent+n.children.map(text).join(' ');
(async()=>{
 const h=await sandbox([{id:1,name:'Unique training',paymentType:'visit',price:3000,balance:2,balanceUnitPrice:3000,recurring:true,frequency:'weekly',weekdays:[2],date:'2026-10-20'}]);
 h.c.openBudgetPlan();a(text(h.$('planChart')).includes('Unique training'));
 await h.c.togglePlanService(1);a(!text(h.$('planChart')).includes('Unique training'));a(text(h.$('planChart')).includes('Нет услуг в плане'));a(h.$('planAxis').hidden);
 await h.c.flushPlanUpdates();a.equal(h.read()[0].balance,2);
 await h.c.togglePlanService(1);a(text(h.$('planChart')).includes('Unique training'));
 const s=await sandbox();s.c.openSetup();s.$('setupProviderName').value='Антон';s.$('setupProviderName').oninput();await s.c.advanceSetup();
 a(text(s.$('setupFields')).includes('Название услуги'));
 a(!text(s.$('setupFields')).includes('Количество и предоплата'));
 s.$('setupFields').querySelectorAll('button').find(b=>b.textContent==='Пакет').onclick();
 a(!text(s.$('setupFields')).includes('Разовый визит, ₽'));a(text(s.$('setupFields')).includes('Всего посещений'));
 const html=fs.readFileSync('dist/index.html','utf8');a(!html.includes('<div class="setup-identity">'));a(!html.includes('<details class="plan-settings">'));
 console.log('PASS DOM model: plan exclusion removes chart, empty axis, reinclude, real balance unchanged, concise visit/package setup, removed intro/settings');
})().catch(e=>{console.error(e);process.exitCode=1});
