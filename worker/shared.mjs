import { invitationMessage } from '../ui/invitation-copy.mjs';
// Telegram-authenticated shared records. Private planning remains in CloudStorage.
const sj=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const te=new TextEncoder();
async function hmac(key,value){const k=await crypto.subtle.importKey('raw',typeof key==='string'?te.encode(key):key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,te.encode(value)))}
const hex=b=>[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
async function hashToken(s){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',te.encode(s))))}
function fail(code,status=400){throw Object.assign(new Error(code),{status})}
export async function authenticate(raw,token,now=Date.now()){
 if(!token)fail('bot_token_missing',503);if(!raw||raw.length>16384)fail('unauthorized',401);
 const p=new URLSearchParams(raw),seen=new Set();for(const [k]of p){if(seen.has(k))fail('unauthorized',401);seen.add(k)}
 const signature=p.get('hash');p.delete('hash');const check=[...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
 const expected=hex(await hmac(await hmac('WebAppData',token),check));
 if(!signature||signature.length!==64||!/^[a-f0-9]+$/.test(signature))fail('unauthorized',401);
 let mismatch=0;for(let i=0;i<64;i++)mismatch|=signature.charCodeAt(i)^expected.charCodeAt(i);if(mismatch)fail('unauthorized',401);
 const date=Number(p.get('auth_date'));if(!Number.isInteger(date)||now/1000-date>86400||date>now/1000+30)fail('session_expired',401);
 let user;try{user=JSON.parse(p.get('user'))}catch{fail('unauthorized',401)}
 if(!user||!Number.isSafeInteger(user.id)||user.id<=0)fail('unauthorized',401);
 return {id:String(user.id),photo_url:telegramPhoto(user.photo_url),name:[user.first_name,user.last_name].filter(x=>typeof x==='string').join(' ').slice(0,120)||'Telegram',username:typeof user.username==='string'?user.username.replace(/[^a-zA-Z0-9_]/g,''):''};
}
const dateOK=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const amountOK=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e8&&Math.abs(Math.round(n*100)-n*100)<.00001;
const round=n=>Math.round(n*100)/100;
function telegramPhoto(raw){if(typeof raw!=='string'||raw.length>2048)return '';try{const url=new URL(raw);return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}catch{return ''}}
function terms(raw){
 if(!raw||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>100||!['visit','package','period'].includes(raw.paymentType))fail('invalid_terms');
 const price=(raw.paymentType==='visit'?raw.price:raw.contractAmount)??null;if(price!==null&&!amountOK(price))fail('price_required');
 const count=raw.paymentType==='package'?raw.packageCount:1;if(!Number.isInteger(count)||count<1||count>100000)fail('invalid_count');
 const duration=raw.paymentType==='period'?Number(raw.duration):null;if(duration!==null&&(!Number.isInteger(duration)||duration<1||duration>36))fail('invalid_duration');
 const singlePrice=raw.singlePrice===undefined||raw.singlePrice===null||raw.singlePrice===''?null:raw.singlePrice;if(singlePrice!==null&&!amountOK(singlePrice))fail('invalid_price');
 const date=raw.date||'';if(date&&!dateOK(date))fail('invalid_date');const time=raw.time||'';if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))fail('invalid_time');
 return {name:raw.name.trim(),paymentType:raw.paymentType,amount:price,count,duration,singlePrice,date,time};
}
function termEnd(start,months){const d=new Date(start+'T12:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10)}
export function sharedSummary(data,today=new Date().toISOString().slice(0,10)){
 const confirmed=data.events.filter(x=>x.status==='confirmed'&&x.date<=today),reversed=new Set(confirmed.filter(x=>x.kind==='undo').map(x=>x.ref)),events=confirmed.filter(x=>!reversed.has(x.id));
 let charged=0,paid=0;const lots=[],charges=[];let until='';
 for(const e of events){if(e.kind==='purchase'){charged+=e.amount;charges.push({id:e.id,amount:e.amount,type:e.type,start:e.start,end:e.end});if(e.type==='package')lots.push({id:e.id,count:e.count,remaining:e.count,amount:e.amount});if(e.type==='period'&&e.start<=today&&e.end>until)until=e.end}if(e.kind==='visit'){if(e.lot){const lot=lots.find(x=>x.id===e.lot);if(lot)lot.remaining=Math.max(0,lot.remaining-1)}else{charged+=e.amount;charges.push({id:e.id,amount:e.amount})}}if(e.kind==='payment')paid+=e.amount}
 let funds=paid,prepaid=0;for(const charge of charges){const covered=Math.min(funds,charge.amount),lot=lots.find(x=>x.id===charge.id);if(lot)prepaid+=Math.max(0,covered-(lot.count-lot.remaining)*(lot.amount/lot.count));if(charge.type==='period'){const start=Date.parse(charge.start),end=Date.parse(charge.end),used=Math.max(0,Math.min(1,(Date.parse(today)-start)/(end-start)));prepaid+=Math.max(0,covered-charge.amount*used)}funds=Math.max(0,funds-charge.amount)}
 prepaid+=funds;const remaining=lots.reduce((a,x)=>a+x.remaining,0),visits=events.filter(x=>x.kind==='visit').length;
 return {charged:round(charged),paid:round(paid),due:round(Math.max(0,charged-paid)),prepaid:round(prepaid),remaining,visits,until,active:!!until&&today<until,lots};
}
export function noticeText(d,actor,b={}){
 const service=d.terms?.name||'Запись',who=actor?.name||'Telegram',rub=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽',day=x=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(x+'T12:00:00Z')).replace(/\./g,'');
 const label=e=>(e.kind==='purchase'?(e.type==='period'?'начало абонемента':'начало пакета'):e.kind==='payment'?'оплата '+rub(e.amount):e.kind==='visit'?'посещение':'возврат посещения')+' · '+day(e.date);
 const e=d.events?.find(x=>x.id===b.eventId);let body;const at=v=>{if(!v)return '';const w=new Intl.DateTimeFormat('ru-RU',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(v.slice(0,10)+'T12:00:00Z')).replace(/\./g,'');return v.length>11&&v.slice(11)?w+' · '+v.slice(11,16):w};
 if(b.action==='accept')body='🎉 '+who+' теперь с тобой в Сервиснике';
 else if(b.action==='offer')body=d.state==='active'?who+' добавил(-а) твои услуги! Загляни и спланируй занятия ✨':'✏️ Новые условия от '+who+'. Загляни.';
 else if(b.action==='activate')body='✅ Условия подтверждены: '+who;
 else if(b.action==='close')body=who+' больше не ведёт с тобой записи. История осталась 📁';
 else if(e?.kind==='move'&&b.action==='confirm')body='Перенос подтверждён ✅ '+at(e.to);
 else if(e?.kind==='move'&&b.action==='move')body=e.counter?who+' предлагает другое время:\n'+at(e.to)+' 🤝':who+' просит перенести занятие:\n'+(e.from?at(e.from)+' → ':'')+at(e.to)+' ↻';
 else if(e?.kind==='visit'&&b.action==='visit')body=who+' отметил(-а) занятие ✅\n'+at(e.date)+'. Всё верно?';
 else if(e&&b.action==='confirm')body='✅ Подтверждено: '+label(e);
 else if(e&&b.action==='reject')body='🤔 Не подтверждено: '+label(e)+'. Загляни, что не так.';
 else if(e)body=who+': '+label(e)+'\nВсё так? Подтверди 👌';
 else body='Есть новости 👀 Загляни.';
 return service+'\n'+body;
}
export function transition(data,actor,body,today=new Date().toISOString().slice(0,10)){
 const d=structuredClone(data),provider=d.provider?.id===actor.id,client=d.client?.id===actor.id;if(!provider&&!client)fail('forbidden',403);
 if(d.closed)fail('connection_closed',409);
 if(body.action==='offer'){if(!provider||d.events.length)fail('terms_locked',409);const items=Array.isArray(body.services)?body.services:[body.terms];if(!items.length||items.length>20)fail('invalid_terms');d.terms=terms(items[0]);d.additionalTerms=items.slice(1).map(x=>({id:crypto.randomUUID(),terms:terms(x)}));if(d.state==='requested'){d.state='active';d.joinedFromRequest=true}else d.state='offered';return d}
 if(body.action==='activate'){if(!client||d.state!=='offered')fail('invalid_state',409);d.state='active';return d}
 if(body.action==='close'){d.closed=true;return d}
 if(d.state!=='active')fail('confirm_terms',409);
 const existing=d.events.find(x=>x.id===body.eventId);
 if(body.action==='confirm'||body.action==='reject'){
  if(!existing)fail('not_found',404);if(existing.actor===actor.id)fail('other_party_required',403);
  const status=body.action==='confirm'?'confirmed':'rejected';if(existing.status===status)return d;if(existing.status!=='pending')fail('already_resolved',409);
  if(status==='confirmed')validateEvent(d,existing,today);existing.status=status;existing.resolvedBy=actor.id;if(status==='confirmed'&&existing.kind==='move'){d.terms.date=existing.to.slice(0,10);d.terms.time=existing.to.slice(11,16)}return d;
 }
 if(existing){if(existing.actor!==actor.id)fail('conflict',409);return d}
 if(body.action==='move'){if(typeof body.eventId!=='string'||!/^[a-zA-Z0-9_-]{12,80}$/.test(body.eventId))fail('invalid_id');if(d.events.length>=2000)fail('history_full',409);const to=typeof body.to==='string'?body.to:'';if(!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(to)||!dateOK(to.slice(0,10))||to.slice(0,10)<today)fail('invalid_date');let counter=false;for(const x of d.events)if(x.kind==='move'&&x.status==='pending'){if(x.actor!==actor.id)counter=true;x.status='rejected';x.resolvedBy=actor.id}d.events.push({id:body.eventId,actor:actor.id,status:'pending',kind:'move',date:to.slice(0,10),to,from:typeof body.from==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(body.from)?body.from:d.terms?.date?d.terms.date+'T'+(d.terms.time||''):'',counter});return d}
 if(typeof body.eventId!=='string'||!/^[a-zA-Z0-9_-]{12,80}$/.test(body.eventId))fail('invalid_id');if(d.events.length>=2000)fail('history_full',409);
 if(!dateOK(body.date)||body.date>today)fail('invalid_date');
 const t=d.terms,s=sharedSummary(d,body.date);if((body.action==='purchase'||body.action==='visit'&&t.paymentType==='visit')&&t.amount===null)fail('price_required');let e={id:body.eventId,actor:actor.id,status:'pending',date:body.date,kind:body.action};
 if(body.action==='purchase'){
  if(t.paymentType==='visit')fail('not_a_package');e={...e,type:t.paymentType,amount:t.amount,count:t.count,duration:t.duration};if(e.type==='period'){e.start=body.startDate||body.date;if(!dateOK(e.start))fail('invalid_date');e.end=termEnd(e.start,e.duration)}
 }else if(body.action==='payment'){if(!amountOK(body.amount)||body.amount<=0||body.amount>s.due)fail('invalid_payment');e.amount=body.amount;
 }else if(body.action==='visit'){
  if(d.events.some(x=>x.kind==='visit'&&x.status!=='rejected'&&x.date===body.date&&!d.events.some(u=>u.kind==='undo'&&u.ref===x.id&&u.status==='confirmed')))fail('visit_exists',409);
  const lot=s.lots.filter(x=>x.remaining>0&&d.events.find(p=>p.id===x.id).date<=body.date).sort((a,b)=>d.events.find(p=>p.id===a.id).date.localeCompare(d.events.find(p=>p.id===b.id).date))[0];if(lot){e.lot=lot.id;e.amount=0}else if(t.paymentType==='period'&&s.active){e.amount=0;e.period=s.until}else{const value=t.paymentType==='visit'?t.amount:t.singlePrice;if(value===null)fail(t.paymentType==='package'?'pack_empty':'period_expired',409);e.amount=value}
 }else if(body.action==='undo'){const v=d.events.find(x=>x.id===body.ref&&x.kind==='visit'&&x.status==='confirmed');if(!v||d.events.some(x=>x.kind==='undo'&&x.ref===v.id&&x.status!=='rejected'))fail('invalid_reversal',409);e.ref=v.id;
 }else fail('invalid_action');
 validateEvent(d,e,today);d.events.push(e);return d;
}
function validateEvent(d,e,today){const s=sharedSummary(d,e.date);if(e.kind==='payment'&&e.amount>s.due)fail('payment_exceeds_due',409);if(e.kind==='visit'&&e.lot&&!s.lots.some(x=>x.id===e.lot&&x.remaining>0&&d.events.find(p=>p.id===x.id).date<=e.date))fail('pack_empty',409)}
const APP='https://moi-zapisi-mobile.queeny-inna.chatgpt.site';
export function noticeButtons(d,id,b){const open={text:'Открыть',web_app:{url:APP+'/?record='+encodeURIComponent(id)}},e=d.events?.find(x=>x.id===b.eventId),ok=e&&e.status==='pending'&&('y:'+e.id).length<=64;if(ok&&b.action==='visit')return [[{text:'Да, было',callback_data:'y:'+e.id},{text:'Не было',callback_data:'n:'+e.id}]];if(ok&&b.action==='move')return [[{text:'Подходит',callback_data:'y:'+e.id},{text:'Другое время',web_app:{url:APP+'/?record='+encodeURIComponent(id)+'&move=1'}}]];return [[open]]}
export async function sendNotice(env,transport,data,id,actor,b){const other=data.provider?.id===actor.id?data.client:data.provider;if(!other)return;await transport('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:Number(other.id),text:noticeText(data,actor,b),reply_markup:{inline_keyboard:noticeButtons(data,id,b)}})})}
function publicRecord(row){const data=JSON.parse(row.data);return {id:row.id,version:row.version,...data,summary:sharedSummary(data)}}
export async function persistSharedConnection(env,row,d,includeChildren=false){
const update=env.DB.prepare('UPDATE shared_records SET provider_id = ?, client_id = ?, data = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?').bind(d.provider?.id||null,d.client?.id||null,JSON.stringify(d),Date.now(),row.id,row.version),children=(includeChildren?d.additionalTerms||[]:[]).map(x=>({id:x.id,version:1,provider:d.provider,client:d.client,state:d.state,terms:x.terms,events:[],closed:false}));
   let result;if(children.length){if(typeof env.DB.batch!=='function')fail('storage_unavailable',503);const inserts=[];for(const child of children)inserts.push(env.DB.prepare('INSERT INTO shared_records (id, creator_id, provider_id, client_id, token_hash, expires_at, version, data, updated_at) SELECT ?, ?, ?, ?, ?, ?, 1, ?, ? WHERE EXISTS (SELECT 1 FROM shared_records WHERE id = ? AND version = ? AND client_id = ? AND provider_id = ?)').bind(child.id,row.creator_id,d.provider.id,d.client.id,await hashToken(row.token_hash+child.id),row.expires_at,JSON.stringify(child),Date.now(),row.id,row.version+1,d.client.id,d.provider.id));result=(await env.DB.batch([update,...inserts]))[0]}else result=await update.run();if(!result.meta.changes)fail('conflict',409);
 const record={id:row.id,version:row.version+1,...d,summary:sharedSummary(d)};return {record,records:[record,...children.map(x=>({...x,summary:sharedSummary(x)}))]};
}
// Owner-authorized pre-release cleanup. Fixed cutoff protects every new test record.
const TEST_DATA_CUTOFF=1792753863075;
let testDataCleanupDone=false;
export async function sharedRoute(request,env,defer=null,transport=fetch){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/shared/'))return null;const notify=(data,id,actor,b)=>{if(!defer)return;const task=sendNotice(env,transport,data,id,actor,b).catch(()=>{});try{defer(task)}catch{}};
 try{
  if(!env.DB)fail('storage_unavailable',503);
  if(!testDataCleanupDone){await env.DB.prepare('DELETE FROM shared_records WHERE updated_at <= ?').bind(TEST_DATA_CUTOFF).run();await env.DB.prepare('DELETE FROM shared_records WHERE id IN (?, ?)').bind('d112e88f-cdc7-41ae-a63f-c659bdbaa685','db80e2cc-e8fd-4ea2-812a-c93edcd5a9e6').run();await env.DB.prepare('DELETE FROM contact_picks WHERE expires_at <= ?').bind(TEST_DATA_CUTOFF+300000).run();testDataCleanupDone=true;}
  const actor=await authenticate(request.headers.get('X-Telegram-Init-Data'),env.TELEGRAM_BOT_TOKEN);
  if(!['GET','POST'].includes(request.method))fail('method_not_allowed',405);
  let b={};if(request.method==='POST'){const text=await request.text();if(text.length>32768)fail('payload_too_large',413);try{b=JSON.parse(text)}catch{fail('invalid_json')}if(!b||typeof b!=='object')fail('invalid_json')}
  const path=url.pathname.slice(12);
  if(path==='records'&&request.method==='GET'){
   // Refresh only the authenticated person's photo, atomically; no ledger/version change.
   await env.DB.prepare("UPDATE shared_records SET data = CASE WHEN provider_id = ? THEN json_set(data, '$.provider.photo_url', ?) ELSE json_set(data, '$.client.photo_url', ?) END WHERE (provider_id = ? AND coalesce(json_extract(data, '$.provider.photo_url'), '') != ?) OR (client_id = ? AND coalesce(json_extract(data, '$.client.photo_url'), '') != ?)").bind(actor.id,actor.photo_url,actor.photo_url,actor.id,actor.photo_url,actor.id,actor.photo_url).run();
   const r=await env.DB.prepare('SELECT * FROM shared_records WHERE provider_id = ? OR client_id = ? ORDER BY updated_at DESC LIMIT 250').bind(actor.id,actor.id).all();return sj({user:actor,records:r.results.map(publicRecord)});
  }
  if(path==='invite'&&request.method==='POST'){
   if(!['provider','client'].includes(b.role))fail('invalid_role');const count=await env.DB.prepare('SELECT count(*) AS n FROM shared_records WHERE creator_id = ? AND updated_at > ?').bind(actor.id,Date.now()-86400000).first();if(count.n>=30)fail('invite_limit',429);
   const id=crypto.randomUUID(),token=hex(crypto.getRandomValues(new Uint8Array(24))),data={provider:b.role==='provider'?actor:null,client:b.role==='client'?actor:null,state:'requested',terms:null,events:[],closed:false};
   if(b.role==='provider'){const items=Array.isArray(b.services)?b.services:[b.terms];if(!items.length||items.length>20)fail('invalid_terms');const ids=items.map(x=>x?.id).filter(Boolean);if(new Set(ids).size!==ids.length)fail('invalid_terms');data.terms=terms(items[0]);data.additionalTerms=items.slice(1).map(x=>({id:crypto.randomUUID(),terms:terms(x)}));data.state='offered'}
   await env.DB.prepare('INSERT INTO shared_records (id, creator_id, provider_id, client_id, token_hash, expires_at, version, data, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)').bind(id,actor.id,data.provider?.id||null,data.client?.id||null,await hashToken(token),Date.now()+7*86400000,JSON.stringify(data),Date.now()).run();
   return sj({record:{id,version:1,...data,summary:sharedSummary(data)},link:'https://t.me/servisnik_bot?start='+token},201);
  }
  if(path==='prepare-share'&&request.method==='POST'){
   if(typeof b.token!=='string'||!/^[a-f0-9]{48}$/.test(b.token))fail('invalid_invite');const row=await env.DB.prepare('SELECT * FROM shared_records WHERE token_hash = ? AND creator_id = ?').bind(await hashToken(b.token),actor.id).first();if(!row)fail('not_found',404);const data=JSON.parse(row.data);if(data.closed||data.provider&&data.client)fail('invite_used',409);if(row.expires_at<Date.now())fail('invite_expired',410);
   const link='https://t.me/servisnik_bot?start='+b.token,result={type:'article',id:crypto.randomUUID(),title:'Приглашение в Сервисник',input_message_content:{message_text:invitationMessage(data)},reply_markup:{inline_keyboard:[[{text:'Открыть приглашение',url:link}]]}};
   let r;try{r=await transport('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/savePreparedInlineMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:Number(actor.id),result,allow_user_chats:true,allow_bot_chats:false,allow_group_chats:false,allow_channel_chats:false}),signal:AbortSignal.timeout(10000)});const prepared=await r.json();if(!r.ok||!prepared.ok||!prepared.result?.id)fail('share_unavailable',502);return sj({preparedMessageId:prepared.result.id})}catch{fail('share_unavailable',502)}
  }
  if(path==='link'&&request.method==='POST'){
   const row=await env.DB.prepare('SELECT * FROM shared_records WHERE id = ? AND creator_id = ?').bind(b.id||'',actor.id).first();if(!row)fail('not_found',404);const data=JSON.parse(row.data);if(data.closed||data.provider&&data.client)fail('invite_used',409);if(b.version!==row.version)fail('conflict',409);
   const token=hex(crypto.getRandomValues(new Uint8Array(24))),r=await env.DB.prepare('UPDATE shared_records SET token_hash = ?, expires_at = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?').bind(await hashToken(token),Date.now()+7*86400000,Date.now(),row.id,row.version).run();if(!r.meta.changes)fail('conflict',409);return sj({record:{id:row.id,version:row.version+1,...data,summary:sharedSummary(data)},link:'https://t.me/servisnik_bot?start='+token});
  }
  if(['accept','preview'].includes(path)&&request.method==='POST'){
   if(typeof b.token!=='string'||!/^[a-f0-9]{48}$/.test(b.token))fail('invalid_invite');const row=await env.DB.prepare('SELECT * FROM shared_records WHERE token_hash = ?').bind(await hashToken(b.token)).first();if(!row)fail('invite_missing',404);const d=JSON.parse(row.data);if(d.closed)fail('connection_closed',409);
   if(row.provider_id===actor.id||row.client_id===actor.id)return sj({record:publicRecord(row)});
   if(row.expires_at<Date.now())fail('invite_expired',410);if(d.provider&&d.client)fail('invite_used',409);
   if(path==='preview'){const from=d.provider||d.client;return sj({invitation:{version:row.version,from:{name:from.name,username:from.username||'',photo_url:telegramPhoto(from.photo_url)},role:d.provider?'client':'provider',terms:d.terms,services:d.terms?[d.terms,...(d.additionalTerms||[]).map(x=>x.terms)]:[]}})}
   if(b.confirmTerms===true&&b.expectedVersion!==row.version)fail('conflict',409);if(!d.provider)d.provider=actor;else{d.client=actor;if(b.confirmTerms===true&&d.state==='offered'&&d.terms)d.state='active'}
   const saved=await persistSharedConnection(env,row,d,true);notify(d,row.id,actor,{action:'accept'});return sj(saved);
  }
  if(path==='change'&&request.method==='POST'){
   const row=await env.DB.prepare('SELECT * FROM shared_records WHERE id = ? AND (provider_id = ? OR client_id = ?)').bind(b.id||'',actor.id,actor.id).first();if(!row)fail('not_found',404);
   const current=JSON.parse(row.data),prior=current.events.find(e=>e.id===b.eventId);if(prior&&((['confirm','reject'].includes(b.action)&&prior.resolvedBy===actor.id&&prior.status===(b.action==='confirm'?'confirmed':'rejected'))||(prior.actor===actor.id&&prior.kind===b.action&&prior.date===b.date)))return sj({record:publicRecord(row)});if(!Number.isInteger(b.version)||row.version!==b.version)fail('conflict',409);
   const offset=Number.isInteger(b.timezoneOffset)&&b.timezoneOffset>=-840&&b.timezoneOffset<=720?b.timezoneOffset:0,localToday=new Date(Date.now()-offset*60000).toISOString().slice(0,10);const d=transition(JSON.parse(row.data),actor,b,localToday),saved=await persistSharedConnection(env,row,d,b.action==='activate'||b.action==='offer'&&d.state==='active');notify(d,row.id,actor,b);return sj(saved);
  }
  fail('not_found',404);
 }catch(e){return sj({error:e.status?e.message:'storage_error'},e.status||503)}
}

