const a=require('assert'),fs=require('fs'),path=require('path'),{sandbox}=require('./qa.cjs');
(async()=>{const s={id:1,name:'Тренировки',paymentType:'visit',price:3000,provider:'Антон'},h=await sandbox([s]);
a.equal(h.$('groupAppSettings'),undefined);a(h.$('settingsButton').closest('.home-budget-header'));a(!h.$('settingsButton').hidden);
for(let i=0;i<3;i++){h.$('settingsButton').onclick();a(!h.$('info').hidden);a(!h.$('info').inert);a(h.$('home').inert);h.$(i%2?'infoClose':'infoBack').onclick();a(h.$('info').hidden);a(!h.$('home').inert)}
h.$('settingsButton').onclick();h.$('settingsDirectory').onclick();a(!h.$('directory').hidden);a(!h.$('directory').inert);a(h.$('group').hidden);a(h.$('info').hidden);h.$('directoryBack').onclick();a(h.$('directory').hidden);a(!h.$('home').inert);
h.c.openEditor(1);h.c.showScreen('info');a(h.$('editor').inert);a(!h.$('info').inert);h.$('infoBack').onclick();a(!h.$('editor').inert);
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8'),styles=html.match(/<style>([\s\S]*?)<\/style>/)[1];a(styles.includes('#editor{z-index:31}#info{z-index:35}'));a(styles.includes('.setup-screen{z-index:45}'));
console.log('PASS settings: planning-only entry; footer removed; repeated close/back; directory return; editor suspension; CSS layer source check, not device');})().catch(e=>{console.error(e);process.exitCode=1});
