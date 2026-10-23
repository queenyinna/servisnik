// Local QA fixtures only. Never included in the deployed Worker.
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {sharedRoute} from '../worker/shared.mjs';
const db=new DatabaseSync(':memory:');db.exec(await readFile(new URL('../drizzle/0000_shared_records.sql',import.meta.url),'utf8'));db.exec(await readFile(new URL('../drizzle/0001_contact_picks.sql',import.meta.url),'utf8'));
const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}}}}}};
DB.batch=async statements=>{db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}};
const token='123:LOCAL_QA_ONLY';
const store={};
export async function previewShared(req,res,html){
 const url=new URL(req.url,'http://terminal.local:4173');
 if(url.pathname.startsWith('/api/shared/')){let body='';for await(const chunk of req)body+=chunk;const r=await sharedRoute(new Request(url,{method:req.method,headers:req.headers,...(body?{body}:{})}),{DB,TELEGRAM_BOT_TOKEN:token});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return true}
 if(!['/qa/provider','/qa/client'].includes(url.pathname))return false;
 const id=url.pathname.endsWith('provider')?1001:1002,user={id,first_name:id===1001?'Тренер QA':'Клиент QA',username:'qa_'+id},p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify(user)}),secret=createHmac('sha256','WebAppData').update(token).digest();p.set('hash',createHmac('sha256',secret).update([...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n')).digest('hex'));
 const sdk=`<script>window.Telegram={WebApp:{initData:${JSON.stringify(p.toString())},initDataUnsafe:{user:${JSON.stringify(user)}},CloudStorage:{getKeys(cb){const p='qa_${id}:';cb(null,Object.keys(localStorage).filter(k=>k.startsWith(p)).map(k=>k.slice(p.length)))},getItem(k,cb){cb(null,localStorage.getItem('qa_${id}:'+k)||'')},getItems(ks,cb){const r={};ks.forEach(k=>r[k]=localStorage.getItem('qa_${id}:'+k)||'');cb(null,r)},setItem(k,v,cb){localStorage.setItem('qa_${id}:'+k,v);cb(null,true)},removeItem(k,cb){localStorage.removeItem('qa_${id}:'+k);cb(null,true)},removeItems(ks,cb){ks.forEach(k=>localStorage.removeItem('qa_${id}:'+k));cb(null,true)}},BackButton:{show(){},hide(){},onClick(){}},ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){},isVersionAtLeast(){return false},enableClosingConfirmation(){},disableClosingConfirmation(){}}};</script>`;
 const out=html.toString().replace(/<script src="https:\/\/telegram.org\/js\/telegram-web-app.js[^\"]*"><\/script>/,sdk);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(out);return true;
}
