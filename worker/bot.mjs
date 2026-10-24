import {receiveContactPick} from './contact-picker.mjs';
import {transition,persistSharedConnection,sendNotice} from './shared.mjs';
const ORIGIN='https://moi-zapisi-mobile.queeny-inna.chatgpt.site';
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function digest(s){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function same(a,b){return !!a&&!!b&&(await digest(a))===(await digest(b))}
async function telegram(env,method,data,transport){const r=await transport('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const value=await r.json();if(!r.ok||!value.ok)throw new Error('telegram_api_failed');return value.result}
// One tap in the chat: «Да, было» / «Не было» / «Подходит». Only the other party can answer.
async function answerButton(q,env,transport){const reply=text=>telegram(env,'answerCallbackQuery',{callback_query_id:q.id,text},transport),match=/^([yn]):([a-zA-Z0-9_-]{12,62})$/.exec(q.data||''),id=String(q.from?.id||'');const renew=/^r:([a-zA-Z0-9_-]{12,62})$/.exec(q.data||'');if(renew&&env.DB){const uid=String(q.from?.id||''),row=await env.DB.prepare('SELECT * FROM shared_records WHERE client_id = ? AND instr(data, ?) > 0 LIMIT 1').bind(uid,'"id":"'+renew[1]+'"').first();if(!row)return reply('Запись не найдена 🙈');const data=JSON.parse(row.data),b={action:'purchase',eventId:crypto.randomUUID().replace(/-/g,''),date:new Date().toISOString().slice(0,10)};let next;try{next=transition(data,data.client,b);await persistSharedConnection(env,row,next)}catch(e){if(e.message==='purchase_pending'){await reply('Уже ждём подтверждения ⏳');try{await telegram(env,'editMessageReplyMarkup',{chat_id:q.message.chat.id,message_id:q.message.message_id,reply_markup:{inline_keyboard:[]}},transport)}catch{}return}return reply('Не получилось 🙈 Открой приложение')}await reply('Готово! Ждём подтверждения ⏳');try{await telegram(env,'editMessageReplyMarkup',{chat_id:q.message.chat.id,message_id:q.message.message_id,reply_markup:{inline_keyboard:[]}},transport)}catch{}try{await sendNotice(env,transport,next,row.id,data.client,b)}catch{}return}
if(/^k:/.test(q.data||'')){await reply('👌');try{await telegram(env,'editMessageReplyMarkup',{chat_id:q.message.chat.id,message_id:q.message.message_id,reply_markup:{inline_keyboard:[]}},transport)}catch{}return}if(!match||!env.DB||!/^\d+$/.test(id))return reply('Открой приложение 👀');
 const row=await env.DB.prepare('SELECT * FROM shared_records WHERE (provider_id = ? OR client_id = ?) AND instr(data, ?) > 0 LIMIT 1').bind(id,id,'"id":"'+match[2]+'"').first();if(!row)return reply('Запись не найдена 🙈');
 const data=JSON.parse(row.data),actor=data.provider?.id===id?data.provider:data.client,b={action:match[1]==='y'?'confirm':'reject',eventId:match[2]};let next;
 const before=data.events.find(x=>x.id===b.eventId);if(before&&before.status!=='pending'){await reply('Уже решено 👌');try{await telegram(env,'editMessageReplyMarkup',{chat_id:q.message.chat.id,message_id:q.message.message_id,reply_markup:{inline_keyboard:[]}},transport)}catch{}return}
 try{next=transition(data,actor,b);await persistSharedConnection(env,row,next)}catch(e){return reply(e.message==='other_party_required'?'Ждём ответ другой стороны ⏳':'Не получилось 🙈 Открой приложение')}
 const e=next.events.find(x=>x.id===b.eventId),at=v=>new Intl.DateTimeFormat('ru-RU',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(v.slice(0,10)+'T12:00:00Z')).replace(/\./g,'')+(v.length>11?' · '+v.slice(11,16):'');
 const done=e.kind==='move'?'Договорились ✅ '+at(e.to):b.action==='confirm'?'Отмечено ✅ '+at(e.date):'Ок, это занятие не считаем 👌';
 await reply('Готово! У вас обоих обновилось');try{await telegram(env,'editMessageText',{chat_id:q.message.chat.id,message_id:q.message.message_id,text:(next.terms?.name||'Запись')+'\n'+done},transport)}catch{}try{await sendNotice(env,transport,next,row.id,actor,b)}catch{}}
export async function botRoute(request,env,transport=fetch){
 const path=new URL(request.url).pathname;
 if(path==='/api/bot/status')return response({configured:!!env.TELEGRAM_BOT_TOKEN,sharedInvitations:!!env.TELEGRAM_BOT_TOKEN&&!!env.DB});
 if(!['/telegram/webhook','/api/bot/configure'].includes(path))return null;
 if(request.method!=='POST')return response({error:'method_not_allowed'},405);
 if(path==='/api/bot/configure'&&!await same(request.headers.get('Authorization'),env.BOT_SETUP_KEY?'Bearer '+env.BOT_SETUP_KEY:null))return response({error:'unauthorized'},401);
 if(!env.TELEGRAM_BOT_TOKEN)return response({error:'bot_token_missing'},503);
 const secret=await digest('telegram-webhook:'+env.TELEGRAM_BOT_TOKEN);
 if(path==='/api/bot/configure'){
  try{const me=await telegram(env,'getMe',{},transport);if(me.username?.toLowerCase()!=='servisnik_bot')return response({error:'wrong_bot'},409);
   await telegram(env,'setWebhook',{url:ORIGIN+'/telegram/webhook',secret_token:secret,allowed_updates:['message','callback_query'],drop_pending_updates:false},transport);
   await telegram(env,'setChatMenuButton',{menu_button:{type:'web_app',text:'Открыть',web_app:{url:ORIGIN+'/'}}},transport);
   const webhook=await telegram(env,'getWebhookInfo',{},transport);return response({ok:true,username:me.username,webhook:{url:webhook.url||'',pending_update_count:webhook.pending_update_count||0,last_error_message:webhook.last_error_message||null}});
  }catch{return response({error:'telegram_configuration_failed'},502)}
 }
 if(!await same(request.headers.get('X-Telegram-Bot-Api-Secret-Token'),secret))return response({error:'unauthorized'},401);
 if(Number(request.headers.get('Content-Length')||0)>65536)return response({error:'payload_too_large'},413);
 let update;try{const body=await request.text();if(body.length>65536)return response({error:'payload_too_large'},413);update=JSON.parse(body)}catch{return response({error:'invalid_json'},400)}
 if(update.callback_query){try{await answerButton(update.callback_query,env,transport)}catch{}return response({ok:true})}
 const m=update.message;
 if(m?.users_shared){if(!env.DB)return response({ok:false},503);try{await receiveContactPick(m,env);return response({ok:true})}catch{return response({ok:false},503)}}
 if(m?.chat?.type!=='private'||!Number.isSafeInteger(m.chat.id)||typeof m.text!=='string')return response({ok:true});
 if(!/^\/(start|app)(?:@servisnik_bot)?(?:\s|$)/i.test(m.text))return response({ok:true});
 const arg=m.text.trim().split(/\s+/)[1]||'',launch=/^[a-f0-9]{48}$/.test(arg)?ORIGIN+'/?invite='+arg:/^r_[a-f0-9-]{36}$/.test(arg)?ORIGIN+'/?record='+arg.slice(2):ORIGIN+'/';
 let welcome='Привет! 👋 Тут все твои занятия, абонементы и расходы.',button='Открыть';if(/^[a-f0-9]{48}$/.test(arg)){welcome='Ой, эта ссылка уже не работает 🙈 Попроси новую у того, кто её прислал.';button='Открыть Сервисник';if(env.DB)try{const row=await env.DB.prepare('SELECT data, expires_at FROM shared_records WHERE token_hash = ?').bind(await digest(arg)).first();if(row&&row.expires_at>Date.now()){const data=JSON.parse(row.data),from=data.provider||data.client;if(!data.closed&&from){if(data.provider){welcome='Привет! 👋 Приглашаю в Сервисник: там будут видны наши занятия, остаток, заметки об оплатах и планировщик )';button='Посмотреть'}else{welcome='Привет! 👋 Приглашаю в Сервисник: там будут видны наши занятия, остаток, заметки об оплатах и планировщик )';button='Посмотреть'}}}}catch{}}
 return response({method:'sendMessage',chat_id:m.chat.id,text:welcome,reply_markup:{inline_keyboard:[[{text:button,web_app:{url:launch}}]]}});
}
