import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHmac,createHash} from 'node:crypto';
import {contactPickerRoute,receiveContactPick} from '../worker/contact-picker.mjs';
import {botRoute} from '../worker/bot.mjs';
const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0001_contact_picks.sql',import.meta.url),'utf8'));
const DB={prepare(sql){let v=[];return {bind(...args){v=args;return this},async first(){return db.prepare(sql).get(...v)||null},async run(){return {meta:{changes:db.prepare(sql).run(...v).changes}}}}}};
const token='123:QA_ONLY',env={DB,TELEGRAM_BOT_TOKEN:token};
function auth(id){const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,first_name:'QA'})}),secret=createHmac('sha256','WebAppData').update(token).digest();p.set('hash',createHmac('sha256',secret).update([...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n')).digest('hex'));return p.toString()}
let prepared;
const transport=async(url,init)=>{assert(url.endsWith('/savePreparedKeyboardButton'));prepared=JSON.parse(init.body);return Response.json({ok:true,result:{id:'native_qa'}})};
async function call(id,path,method='GET',t=transport){const r=await contactPickerRoute(new Request('https://qa.test/api/contacts/'+path,{method,headers:{'X-Telegram-Init-Data':auth(id)}}),env,t);return {status:r.status,...await r.json()}}
assert.equal((await contactPickerRoute(new Request('https://qa.test/api/contacts/prepare',{method:'POST'}),env,transport)).status,401);
let pick=await call(1,'prepare','POST');assert.equal(pick.status,200);assert.equal(prepared.user_id,1);assert.equal(prepared.button.request_users.max_quantity,1);assert.equal(prepared.button.request_users.user_is_bot,false);assert.equal(prepared.button.request_users.request_username,true);assert.equal(prepared.button.request_users.request_photo,undefined);
assert.equal((await call(2,'result?requestId='+pick.requestId)).status,404);assert.equal((await call(1,'result?requestId='+pick.requestId)).contact,null);
const message={chat:{id:1,type:'private'},from:{id:1},users_shared:{request_id:pick.requestId,users:[{user_id:9,first_name:'Тренер',username:'coach_qa'}]}};
assert.equal((await botRoute(new Request('https://qa.test/telegram/webhook',{method:'POST',body:JSON.stringify({message})}),env,transport)).status,401);assert.equal((await call(1,'result?requestId='+pick.requestId)).contact,null);
assert.equal(await receiveContactPick({...message,from:{id:2}},env),false);assert.equal((await botRoute(new Request('https://qa.test/telegram/webhook',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':createHash('sha256').update('telegram-webhook:'+token).digest('hex')},body:JSON.stringify({message})}),env,transport)).status,200);assert.deepEqual((await call(1,'result?requestId='+pick.requestId)).contact,{id:'9',name:'Тренер',username:'coach_qa'});
await receiveContactPick({...message,users_shared:{...message.users_shared,users:[{user_id:10,first_name:'Overwrite'}]}},env);assert.equal((await call(1,'result?requestId='+pick.requestId)).contact.id,'9');
const noUsername=await call(1,'prepare','POST');await receiveContactPick({...message,users_shared:{request_id:noUsername.requestId,users:[{user_id:11,first_name:'Мастер'}]}},env);assert.equal((await call(1,'result?requestId='+noUsername.requestId)).contact.username,'');
db.prepare('UPDATE contact_picks SET expires_at = 1 WHERE request_id = ?').run(pick.requestId);assert.equal((await call(1,'result?requestId='+pick.requestId)).status,404);
assert.equal((await call(1,'prepare','POST',async()=>{throw new Error('offline')})).status,502);assert.equal(db.prepare('SELECT count(*) AS n FROM contact_picks').get().n,1);
console.log('PASS native picker backend: authenticated prepare/result; one person only; owner isolation; webhook authorization; mismatched sender; no duplicate overwrite; missing username; expiry; API failure cleanup. No real Telegram calls.');
