import {receiveContactPick} from './contact-picker.mjs';
const ORIGIN='https://moi-zapisi-mobile.queeny-inna.chatgpt.site';
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function digest(s){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function same(a,b){return !!a&&!!b&&(await digest(a))===(await digest(b))}
async function telegram(env,method,data,transport){const r=await transport('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const value=await r.json();if(!r.ok||!value.ok)throw new Error('telegram_api_failed');return value.result}
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
   await telegram(env,'setWebhook',{url:ORIGIN+'/telegram/webhook',secret_token:secret,allowed_updates:['message'],drop_pending_updates:false},transport);
   await telegram(env,'setChatMenuButton',{menu_button:{type:'web_app',text:'Открыть',web_app:{url:ORIGIN+'/'}}},transport);
   const webhook=await telegram(env,'getWebhookInfo',{},transport);return response({ok:true,username:me.username,webhook:{url:webhook.url||'',pending_update_count:webhook.pending_update_count||0,last_error_message:webhook.last_error_message||null}});
  }catch{return response({error:'telegram_configuration_failed'},502)}
 }
 if(!await same(request.headers.get('X-Telegram-Bot-Api-Secret-Token'),secret))return response({error:'unauthorized'},401);
 if(Number(request.headers.get('Content-Length')||0)>65536)return response({error:'payload_too_large'},413);
 let update;try{const body=await request.text();if(body.length>65536)return response({error:'payload_too_large'},413);update=JSON.parse(body)}catch{return response({error:'invalid_json'},400)}
 const m=update.message;
 if(m?.users_shared){if(!env.DB)return response({ok:false},503);try{await receiveContactPick(m,env);return response({ok:true})}catch{return response({ok:false},503)}}
 if(m?.chat?.type!=='private'||!Number.isSafeInteger(m.chat.id)||typeof m.text!=='string')return response({ok:true});
 if(!/^\/(start|app)(?:@servisnik_bot)?(?:\s|$)/i.test(m.text))return response({ok:true});
 const arg=m.text.trim().split(/\s+/)[1]||'',launch=/^[a-f0-9]{48}$/.test(arg)?ORIGIN+'/?invite='+arg:/^r_[a-f0-9-]{36}$/.test(arg)?ORIGIN+'/?record='+arg.slice(2):ORIGIN+'/';
 let welcome='Привет! 👋 Тут все твои занятия, абонементы и расходы.',button='Открыть';if(/^[a-f0-9]{48}$/.test(arg)){welcome='Ой, эта ссылка уже не работает 🙈 Попроси новую у того, кто её прислал.';button='Открыть Сервисник';if(env.DB)try{const row=await env.DB.prepare('SELECT data, expires_at FROM shared_records WHERE token_hash = ?').bind(await digest(arg)).first();if(row&&row.expires_at>Date.now()){const data=JSON.parse(row.data),from=data.provider||data.client;if(!data.closed&&from){const offers=[data.terms,...(data.additionalTerms||[]).map(x=>x.terms)].filter(Boolean).map(t=>t.name+(t.paymentType==='package'?' · '+t.count+' занятий':t.paymentType==='period'?' · '+t.duration+' мес.':'')+' · '+(t.amount===null?'без цены':new Intl.NumberFormat('ru-RU').format(t.amount)+' ₽')).join('\n');if(data.provider){welcome='Привет! 👋 '+from.name+' приглашает тебя в Сервисник: тут будут видны ваши занятия, остаток и оплаты.\n'+offers+'\nЭто не оплата, просто загляни 😉';button='Посмотреть'}else{welcome='Привет! 👋 '+from.name+' хочет вести с тобой занятия и оплаты в Сервиснике.\n'+offers+'\nПосмотри и подтверди, если всё так 👌';button='Посмотреть'}}}}catch{}}
 return response({method:'sendMessage',chat_id:m.chat.id,text:welcome,reply_markup:{inline_keyboard:[[{text:button,web_app:{url:launch}}]]}});
}
