import {authenticate} from './shared.mjs';
const pickJSON=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const pickId=n=>Number.isInteger(n)&&n>0&&n<=2147483647;
// Only called after botRoute authenticates the Telegram webhook secret.
export async function receiveContactPick(message,env){
 const shared=message?.users_shared;
 if(message?.chat?.type!=='private'||message.from?.id!==message.chat.id||!Number.isSafeInteger(message.chat.id)||!pickId(shared?.request_id)||!Array.isArray(shared.users)||shared.users.length!==1)return false;
 const u=shared.users[0];if(!Number.isSafeInteger(u.user_id)||u.user_id<=0)return false;
 const name=[u.first_name,u.last_name].filter(x=>typeof x==='string').join(' ').slice(0,120),username=typeof u.username==='string'&&/^[a-zA-Z][a-zA-Z0-9_]{3,31}$/.test(u.username)?u.username:'';
 await env.DB.prepare('UPDATE contact_picks SET result = ? WHERE user_id = ? AND request_id = ? AND expires_at > ? AND result IS NULL').bind(JSON.stringify({id:String(u.user_id),name,username}),String(message.from.id),shared.request_id,Date.now()).run();return true;
}
export async function contactPickerRoute(request,env,transport=fetch){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/contacts/'))return null;
 try{
  if(!env.DB)return pickJSON({error:'storage_unavailable'},503);
  const actor=await authenticate(request.headers.get('X-Telegram-Init-Data'),env.TELEGRAM_BOT_TOKEN);
  if(url.pathname==='/api/contacts/result'&&request.method==='GET'){
   const id=Number(url.searchParams.get('requestId'));if(!pickId(id))return pickJSON({error:'invalid_request'},400);
   const row=await env.DB.prepare('SELECT result FROM contact_picks WHERE user_id = ? AND request_id = ? AND expires_at > ?').bind(actor.id,id,Date.now()).first();if(!row)return pickJSON({error:'request_expired'},404);return pickJSON({contact:row.result?JSON.parse(row.result):null});
  }
  if(url.pathname!=='/api/contacts/prepare'||request.method!=='POST')return pickJSON({error:'method_not_allowed'},405);
  await env.DB.prepare('DELETE FROM contact_picks WHERE expires_at <= ?').bind(Date.now()).run();
  const count=await env.DB.prepare('SELECT count(*) AS n FROM contact_picks WHERE user_id = ?').bind(actor.id).first();if(count.n>=20)return pickJSON({error:'too_many_requests'},429);
  const requestId=(crypto.getRandomValues(new Uint32Array(1))[0]&2147483647)||1;
  await env.DB.prepare('INSERT INTO contact_picks (user_id, request_id, expires_at) VALUES (?, ?, ?)').bind(actor.id,requestId,Date.now()+300000).run();
  try{
   const r=await transport('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/savePreparedKeyboardButton',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:Number(actor.id),button:{text:'Выбрать контакт',request_users:{request_id:requestId,user_is_bot:false,max_quantity:1,request_name:true,request_username:true}}}),signal:AbortSignal.timeout(10000)}),data=await r.json();
   if(!r.ok||!data.ok||typeof data.result?.id!=='string')throw new Error('unavailable');return pickJSON({requestId,buttonId:data.result.id});
  }catch{await env.DB.prepare('DELETE FROM contact_picks WHERE user_id = ? AND request_id = ?').bind(actor.id,requestId).run();return pickJSON({error:'picker_unavailable'},502)}
 }catch(e){return pickJSON({error:e.status?e.message:'picker_unavailable'},e.status||503)}
}
