import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {authenticate,sharedRoute,sharedSummary,transition} from '../worker/shared.mjs';
import {createHmac} from 'node:crypto';
const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0000_shared_records.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('../drizzle/0001_contact_picks.sql',import.meta.url),'utf8'));
const DB={prepare(sql){let values=[];return {bind(...v){values=v;return this},async first(){return db.prepare(sql).get(...values)||null},async all(){return {results:db.prepare(sql).all(...values)}},async run(){return {meta:{changes:db.prepare(sql).run(...values).changes}}}}}};
DB.batch=async statements=>{db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}};
const token='123:test-only',env={DB,TELEGRAM_BOT_TOKEN:token};let checks=0;
function check(actual,expected,msg){assert.deepEqual(actual,expected,msg);checks++}
const user=id=>({id,first_name:'User '+id,username:'test_'+id});
function auth(id,extra={}){const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify(user(id)),...extra});const secret=createHmac('sha256','WebAppData').update(token).digest();p.set('hash',createHmac('sha256',secret).update([...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n')).digest('hex'));return p.toString()}
async function call(id,path,b){const res=await sharedRoute(new Request('https://example.test/api/shared/'+path,{method:b?'POST':'GET',headers:{'X-Telegram-Init-Data':auth(id),'Content-Type':'application/json'},...(b?{body:JSON.stringify(b)}:{})}),env);return {status:res.status,...await res.json()}}
const eventId=()=>crypto.randomUUID(),today=new Date().toISOString().slice(0,10);let r;
async function change(actor,action,extra={}){const x=await call(actor,'change',{id:r.id,version:r.version,action,...extra});if(x.record)r=x.record;return x}
async function event(actor,action,extra={}){return change(actor,action,{eventId:eventId(),date:today,...extra})}
check((await authenticate(auth(1),token)).id,'1','verified identity');
await assert.rejects(()=>authenticate(auth(1).replace('User','Attacker'),token));checks++;
await assert.rejects(()=>authenticate(auth(1,{auth_date:'1'}),token));checks++;
await assert.rejects(()=>authenticate(auth(1)+'&auth_date=1',token));checks++;
check((await call(1,'records')).records.length,0);
check((await sharedRoute(new Request('https://example.test/api/shared/records'),{DB})).status,503);
const offer={name:'Тренировки',paymentType:'package',contractAmount:24000,packageCount:8,singlePrice:3500};
let invite=await call(1,'invite',{role:'provider',terms:offer});r=invite.record;check(invite.status,201);const t=invite.link.split('=').at(-1);check(t.length,48);
check((await call(3,'records')).records.length,0,'unrelated account sees nothing');
check((await call(3,'change',{id:r.id,version:r.version,action:'close'})).status,404);
check((await call(1,'accept',{token:t})).record.provider.id,'1','self accept never becomes client');
r=(await call(2,'accept',{token:t})).record;check(r.client.id,'2');check((await call(3,'accept',{token:t})).status,409,'one use invite');
check((await change(1,'activate')).status,409);check((await event(1,'purchase')).status,409);
check((await change(2,'activate')).status,200);
let e=(await event(1,'purchase')).record.events.at(-1);check(r.summary.remaining,0,'pending purchase no credits');check(r.summary.due,0);
check((await change(1,'confirm',{eventId:e.id})).status,403,'cannot self confirm');
await change(2,'confirm',{eventId:e.id});check(r.summary.remaining,8);check(r.summary.due,24000);check(r.summary.prepaid,0,'unpaid pack not prepaid');
e=(await event(2,'payment',{amount:24000})).record.events.at(-1);check(r.summary.paid,0,'pending money not income');await change(1,'confirm',{eventId:e.id});check(r.summary.paid,24000);check(r.summary.due,0);check(r.summary.prepaid,24000);
check((await event(2,'payment',{amount:1})).status,400,'no overpayment');
e=(await event(1,'visit')).record.events.at(-1);check(r.summary.remaining,8,'pending attendance not deducted');const oldVersion=r.version;await change(2,'confirm',{eventId:e.id});check(r.summary.remaining,7);check(r.summary.prepaid,21000);
check((await call(2,'change',{id:r.id,version:oldVersion,action:'confirm',eventId:e.id})).status,200,'retry confirm idempotent');check(r.summary.remaining,7);
check((await event(2,'visit')).status,409,'one attendance per calendar day');
let undo=(await event(2,'undo',{ref:e.id})).record.events.at(-1);await change(1,'confirm',{eventId:undo.id});check(r.summary.remaining,8);check(r.summary.prepaid,24000);
check((await event(2,'undo',{ref:e.id})).status,409,'cannot return twice');
check((await change(1,'offer',{terms:{...offer,contractAmount:1}})).status,409,'history price snapshot locked');
check((await call(1,'change',{id:r.id,version:1,action:'close'})).status,409,'stale update rejected');
// Eight confirmed visits on different historical days exhaust exactly eight, then one-off price.
for(let i=1;i<=8;i++){const date=new Date(Date.now()-i*86400000).toISOString().slice(0,10); // purchases must precede attendance
 // Separate direct transition fixture models established package in the past.
}
let fixture={provider:{id:'1'},client:{id:'2'},state:'active',closed:false,terms:{paymentType:'package',amount:24000,count:8,singlePrice:null},events:[{id:'lot',actor:'1',kind:'purchase',status:'confirmed',date:'2026-01-01',type:'package',amount:24000,count:8},{id:'pay',kind:'payment',status:'confirmed',date:'2026-01-01',amount:24000}]};
for(let i=1;i<=8;i++){const date='2026-01-'+String(i+1).padStart(2,'0'),id=eventId();fixture=transition(fixture,{id:'1'},{action:'visit',date,eventId:id},'2026-02-01');fixture=transition(fixture,{id:'2'},{action:'confirm',eventId:id},'2026-02-01')}
check(sharedSummary(fixture).remaining,0);check(sharedSummary(fixture).prepaid,0);assert.throws(()=>transition(fixture,{id:'1'},{action:'visit',date:'2026-01-20',eventId:eventId()},'2026-02-01'),/pack_empty/);checks++;
fixture.terms.singlePrice=3500;let id=eventId();fixture=transition(fixture,{id:'1'},{action:'visit',date:'2026-01-20',eventId:id},'2026-02-01');fixture=transition(fixture,{id:'2'},{action:'confirm',eventId:id},'2026-02-01');check(sharedSummary(fixture).due,3500);check(sharedSummary(fixture).remaining,0);
// Unknown vs free prices, periods with clamped month boundaries, payments rejected.
for(const bad of [-1,1.001])check((await call(4,'invite',{role:'provider',terms:{name:'Test',paymentType:'visit',price:bad}})).status,400);
check((await call(4,'invite',{role:'provider',terms:{name:'Free',paymentType:'visit',price:0}})).status,201);
fixture={provider:{id:'1'},client:{id:'2'},state:'active',closed:false,terms:{paymentType:'period',amount:13000,count:1,duration:2,singlePrice:null},events:[]};id=eventId();fixture=transition(fixture,{id:'1'},{action:'purchase',date:'2026-01-31',eventId:id},'2026-04-01');check(fixture.events[0].end,'2026-03-31');fixture=transition(fixture,{id:'2'},{action:'confirm',eventId:id},'2026-04-01');check(sharedSummary(fixture,'2026-03-01').active,true);check(sharedSummary(fixture,'2026-03-31').active,false);
assert.throws(()=>transition(fixture,{id:'1'},{action:'visit',date:'2026-01-01',eventId:eventId()},'2026-04-01'),/period_expired/);checks++;
id=eventId();fixture=transition(fixture,{id:'1'},{action:'payment',amount:13000,date:'2026-02-01',eventId:id},'2026-04-01');fixture=transition(fixture,{id:'2'},{action:'reject',eventId:id},'2026-04-01');check(sharedSummary(fixture).paid,0);
// Reverse direction: client request, specialist offers, client confirms.
invite=await call(5,'invite',{role:'client'});r=(await call(6,'accept',{token:invite.link.split('=').at(-1)})).record;check(r.client.id,'5');check(r.provider.id,'6');await change(6,'offer',{terms:{name:'Разово',paymentType:'visit',price:3000,date:'2026-11-01',time:'10:00'}});await change(5,'activate');check(r.state,'active');
check((await event(6,'visit',{date:'2099-01-01'})).status,400,'future attendance blocked');
e=(await event(6,'visit')).record.events.at(-1);await change(5,'confirm',{eventId:e.id});check(r.summary.due,3000);await change(5,'close');check(r.closed,true);check((await event(6,'visit')).status,409);
// Expired invite, revoked invite, failed database, actual concurrent version conflict.
invite=await call(10,'invite',{role:'client'});db.prepare('UPDATE shared_records SET expires_at=0 WHERE id=?').run(invite.record.id);check((await call(11,'accept',{token:invite.link.split('=').at(-1)})).status,410);
invite=await call(10,'invite',{role:'client'});r=invite.record;await change(10,'close');check((await call(11,'accept',{token:invite.link.split('=').at(-1)})).status,409);
const broken={...env,DB:{prepare(){throw Error('offline')}}};check((await sharedRoute(new Request('https://example.test/api/shared/records',{headers:{'X-Telegram-Init-Data':auth(1)}}),broken)).status,503);
console.log('PASS '+checks+' shared checks: real SQLite migration + D1 adapter; signed two-account requests; one-use/expired/revoked invites; private records; terms; package/one-off/period; no self confirmation; payments; exact-once confirmations; visits/returns; conflicts; failures. No real Telegram API/device.');
// Link rotation invalidates old unclaimed link and stays owner-only.
invite=await call(12,'invite',{role:'client'});const oldToken=invite.link.split('=').at(-1);let rotate=await call(13,'link',{id:invite.record.id,version:invite.record.version});check(rotate.status,404);rotate=await call(12,'link',{id:invite.record.id,version:invite.record.version});check(rotate.status,200);check((await call(14,'accept',{token:oldToken})).status,404);check((await call(14,'accept',{token:rotate.link.split('=').at(-1)})).status,200);
// Purchase date and a future subscription start are independent.
fixture={provider:{id:'1'},client:{id:'2'},state:'active',closed:false,terms:{paymentType:'period',amount:13000,count:1,duration:2,singlePrice:null},events:[]};id=eventId();fixture=transition(fixture,{id:'1'},{action:'purchase',date:'2026-01-20',startDate:'2026-02-01',eventId:id},'2026-01-20');check(fixture.events[0].end,'2026-04-01');check(fixture.events[0].date,'2026-01-20');
// A partially paid pack covers unit costs, not a fraction of all remaining units.
fixture={provider:{id:'1'},client:{id:'2'},state:'active',closed:false,terms:{paymentType:'package',amount:24000,count:8,singlePrice:null},events:[{id:'lot',kind:'purchase',status:'confirmed',date:'2026-01-01',type:'package',amount:24000,count:8},{id:'pay',kind:'payment',status:'confirmed',date:'2026-01-01',amount:3000},{id:'v',kind:'visit',status:'confirmed',date:'2026-01-02',lot:'lot',amount:0}]};check(sharedSummary(fixture).prepaid,0);check(sharedSummary(fixture).due,21000);
console.log('PASS total '+checks+' shared assertions including link rotation, future term start and partial payment.');
// Preview is read-only, exposes inviter/terms but never private history, and acceptance is one explicit step.
invite=await call(21,'invite',{role:'provider',terms:offer});let preview=await call(22,'preview',{token:invite.link.split('=').at(-1)});check(preview.status,200);check(preview.invitation.from.name,'User 21');check(preview.invitation.role,'client');check(preview.invitation.terms.amount,24000);check(preview.invitation.events,undefined);check((await call(21,'records')).records[0].client,null,'preview does not add participant');
check((await call(22,'accept',{token:invite.link.split('=').at(-1),confirmTerms:true,expectedVersion:0})).status,409,'changed terms require fresh preview');
const accepted=await call(22,'accept',{token:invite.link.split('=').at(-1),confirmTerms:true,expectedVersion:preview.invitation.version});check(accepted.record.state,'active');check((await call(22,'preview',{token:invite.link.split('=').at(-1)})).record.id,accepted.record.id,'existing member reopens without acceptance loop');
invite=await call(23,'invite',{role:'client'});preview=await call(24,'preview',{token:invite.link.split('=').at(-1)});check(preview.invitation.role,'provider');check(preview.invitation.terms,null);check((await call(25,'records')).records.length,0);
console.log('PASS total '+checks+' shared assertions including invitation preview, privacy, one-step acceptance and price-change protection.');
// Native sharing prepares a message for the signed-in creator; it never sends one.
invite=await call(31,'invite',{role:'provider',terms:offer});let transportCalls=[];const preparedTransport=async(url,init)=>{transportCalls.push({url,body:JSON.parse(init.body)});return Response.json({ok:true,result:{id:'prepared_qa_only'}})};
const prepareRequest=(actor)=>new Request('https://example.test/api/shared/prepare-share',{method:'POST',headers:{'X-Telegram-Init-Data':auth(actor)},body:JSON.stringify({token:invite.link.split('=').at(-1)})});
check((await sharedRoute(prepareRequest(32),env,null,preparedTransport)).status,404);check(transportCalls.length,0);
check((await sharedRoute(prepareRequest(31),env,null,preparedTransport)).status,200);check(transportCalls.length,1);check(transportCalls[0].url.endsWith('/savePreparedInlineMessage'),true);check(transportCalls[0].body.user_id,31);check(transportCalls[0].body.allow_group_chats,false);check(transportCalls[0].body.result.input_message_content.message_text.includes('Привет!'),true);check(transportCalls[0].body.result.input_message_content.message_text.includes('24'),false);
console.log('PASS total '+checks+' shared assertions including authorized native message preparation; no real Telegram calls.');

invite=await call(41,'invite',{role:'provider',services:[{id:'a',...offer},{id:'b',name:'Массаж',paymentType:'visit',price:0}]});const multiToken=invite.link.split('=').at(-1);preview=await call(42,'preview',{token:multiToken});check(preview.invitation.services.length,2);const multi=await call(42,'accept',{token:multiToken,confirmTerms:true,expectedVersion:preview.invitation.version});check(multi.status,200);check(multi.records.length,2);check((await call(42,'records')).records.length,2);check(multi.records.every(x=>x.events.length===0&&x.summary.remaining===0&&x.summary.due===0),true);await call(42,'accept',{token:multiToken,confirmTerms:true,expectedVersion:1});check((await call(42,'records')).records.length,2,'repeat does not duplicate');check((await call(43,'accept',{token:multiToken})).status,409);check((await call(41,'invite',{role:'provider',services:[]})).status,400);check((await call(41,'invite',{role:'provider',services:[{id:'a',...offer},{id:'a',...offer}]})).status,400);check((await call(44,'invite',{role:'provider',terms:{name:'Unknown',paymentType:'visit',price:null}})).status,201);console.log('PASS multi-service atomic acceptance and unknown/free price');

fixture={provider:{id:'1'},client:{id:'2'},state:'active',closed:false,terms:{paymentType:'package',amount:24000,count:8,singlePrice:null},events:[{id:'future',kind:'purchase',status:'confirmed',date:'2026-02-01',type:'package',amount:24000,count:8}]};check(sharedSummary(fixture,'2026-01-01').remaining,0);check(sharedSummary(fixture,'2026-01-01').due,0);assert.throws(()=>transition(fixture,{id:'1'},{action:'payment',amount:100,date:'2026-01-01',eventId:eventId()},'2026-02-02'),/invalid_payment/);console.log('PASS backdated accounting excludes future package and debt');
