const a=require('assert'),fs=require('fs'),path=require('path'),{sandbox}=require('./qa.cjs');
const prefix='mz_browser_review_v1:',read=h=>{const index=JSON.parse(h.data[prefix+'mz_index_v1']);return JSON.parse(index.keys.map(k=>h.data[prefix+k]).join(''))};
(async()=>{
const privateData={id:99,name:'Личная запись',paymentType:'visit',price:9999};
const h=await sandbox([privateData],{noTelegram:true});a.equal(h.$('home').hidden,false);a.equal(h.$('accessGate').hidden,true);a.equal(h.$('launchTelegram').hidden,true);a(!h.$('browserReviewBadge').hidden);a.equal(read(h).services.filter(s=>s.entityType!=='provider').length,3);a(!h.run('services.some(s=>s.id===99)'));
const cloudBefore=JSON.stringify(h.cloud),legacyBefore=h.data['moi-zapisi-mobile-v1'],training=h.run("services.find(s=>s.id==='review-training')");a.equal(training.remaining,3);await h.c.markVisit(training.id);a.equal(read(h).services.find(s=>s.id===training.id).remaining,2);a.equal(JSON.stringify(h.cloud),cloudBefore);a.equal(h.data['moi-zapisi-mobile-v1'],legacyBefore);
const reload=await sandbox([],{noTelegram:true,localData:h.data});a.equal(reload.run("services.find(s=>s.id==='review-training').remaining"),2);reload.c.openBudgetPlan();a(!reload.$('info').hidden);await reload.c.togglePlanService(training.id);await reload.c.flushPlanUpdates();a.equal(read(reload).services.find(s=>s.id===training.id).remaining,2);
// Browser draft restoration survives actual sandbox reload, without importing legacy records.
reload.c.openEditor('review-manicure');reload.$('price').value='3500';reload.c.updateFields();await reload.c.flushDraft();const draft=await sandbox([],{noTelegram:true,localData:reload.data});a(!draft.$('editor').hidden);a.equal(draft.$('price').value,'3500');a.equal(await draft.c.save(),true);a.equal(read(draft).services.find(s=>s.id==='review-manicure').price,3500);
// A failed browser write cannot change the previous committed state.
const fail=await sandbox([],{noTelegram:true,localData:h.data});const before=JSON.stringify(read(fail));fail.fail();a.equal(await fail.c.commit(fail.run('services.map(s=>({...s,name:s.name+" x"}))')),false);a.equal(JSON.stringify(read(fail)),before);a(fail.$('toastText').textContent.includes('сохранить'));fail.fail(false);
// Removing everything is persistent: reloading must not reseed deleted demo entries.
a.equal(await fail.c.commit([]),true);const empty=await sandbox([],{noTelegram:true,localData:fail.data});a.equal(empty.run('services.length'),0);a(!empty.$('home').hidden);
const source=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');a(source.includes('<script src="https://telegram.org/'));a(!source.includes('initData=demo'));console.log('PASS browser review: no login, seeded test data, isolated personal/cloud data, attendance, plan, reload, draft, save failure, empty state, official Telegram SDK present; browser fallback isolated');
})().catch(e=>{console.error(e);process.exitCode=1});
