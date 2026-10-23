const a=require('assert'),{sandbox}=require('./qa.cjs');
const s={id:1,name:'Тренировки',groupId:'coach',groupName:'Антон',entityType:'service',paymentType:'package',contractAmount:24000,packageCount:8,remaining:2,isPaid:true,singlePrice:3500,date:'2026-10-14T19:00',recurring:true,frequency:'weekly',weekdays:[3,5]};
const text=n=>n.textContent+n.children.map(text).join(' ');
(async()=>{
 const h=await sandbox([s]);h.c.openEditor(1);a(h.$('editorProviderContext').hidden);a(!text(h.$('editorActions')).includes('Купить пакет'));a(!text(h.$('editorActions')).includes('Посетила разово'));a(!h.$('editorActions').querySelector('.plan-switch'));a(!text(h.$('editorActions')).includes('В плане расходов'));
 h.c.closeScreen('editor',true);h.c.openBudgetPlan();await h.c.togglePlanService(1);await h.c.flushPlanUpdates();a.equal(h.read()[0].budgetPeriods['2026-10-01'],false);a.equal(h.read()[0].remaining,2);await h.c.finishPlanClose();
 // Price editing preserves plan membership without another plan control in the editor.
 h.c.openEditor(1);h.$('singlePrice').value='3900';a.equal(await h.c.save(),true);a.equal(h.read()[0].budgetPeriods['2026-10-01'],false);h.c.closeScreen('editor',true);h.c.openBudgetPlan();a.equal(h.$('planServices').children[0].querySelector('.plan-switch').attrs['aria-checked'],'false');
 // Failed planner writes retain credit and allow retry.
 h.fail();await h.c.togglePlanService(1);a.equal(await h.c.flushPlanUpdates(),false);a(!h.$('planRetry').hidden);a.equal(h.read()[0].budgetPeriods['2026-10-01'],false);h.fail(false);await h.$('planRetry').onclick();a.equal(h.read()[0].budgetPeriods['2026-10-01'],true);a.equal(h.read()[0].remaining,2);
 const reload=await sandbox([],{cloud:h.cloud});reload.c.openEditor(1);a(!reload.$('editorActions').querySelector('.plan-switch'));a.equal(reload.read()[0].singlePrice,3900);a.equal(reload.read()[0].budgetPeriods['2026-10-01'],true);
 console.log('PASS simplified editor: no plan row; planner persistence; price save preserves plan; failure/retry; reload; prepaid unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
