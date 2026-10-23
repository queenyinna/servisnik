// Setup authorization is accepted only via hidden stdin, never command arguments or files.
if(process.stdin.isTTY)process.stdin.setRawMode(true);
process.stdout.write('Ready for hidden setup authorization on stdin.\n');
let input='';
for await(const chunk of process.stdin){input+=chunk.toString();if(input.includes('\n'))break}
if(process.stdin.isTTY)process.stdin.setRawMode(false);
process.stdin.pause();
try{
 const {setupKey}=JSON.parse(input.trim());input='';
 const origin='https://moi-zapisi-mobile.queeny-inna.chatgpt.site';
 const result=await fetch(origin+'/api/bot/configure',{method:'POST',headers:{Authorization:'Bearer '+setupKey},signal:AbortSignal.timeout(30000)});
 const data=await result.json();console.log(JSON.stringify({status:result.status,...data}));
 if(!result.ok)process.exitCode=1;
}catch{console.log('Telegram setup request failed. No credentials logged.');process.exitCode=1}
