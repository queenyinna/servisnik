import {previewShared} from './preview-shared.mjs';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const html=()=>readFile(new URL('../dist/index.html',import.meta.url));
createServer(async(req,res)=>{try{if(await previewShared(req,res,await html()))return;if(!['/','/index.html'].includes(new URL(req.url,'http://localhost').pathname)){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(await html())}catch{res.writeHead(500).end()}}).listen(Number(process.env.PORT)||4173,'0.0.0.0');
