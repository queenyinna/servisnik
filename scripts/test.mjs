import {readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const files=(await readdir(new URL('../tests/',import.meta.url))).filter(x=>/\.(cjs|mjs)$/.test(x)).sort();
let failures=0;
for(const file of files){const code=await new Promise(resolve=>{const child=spawn(process.execPath,['tests/'+file],{stdio:'inherit'});const timer=setTimeout(()=>child.kill('SIGTERM'),45000);child.on('error',()=>{clearTimeout(timer);resolve(1)});child.on('exit',code=>{clearTimeout(timer);resolve(code??1)})});if(code){failures++;console.error('FAIL '+file)}}
console.log(`${files.length-failures}/${files.length} current test files passed; legacy reference tests excluded.`);
process.exitCode=failures?1:0;
