const a=require('assert'),{sandbox}=require('./qa.cjs');
const clean=v=>v.replace(/\s/g,'');
const cases=[
 ['paid pack',{paymentType:'package',isPaid:true,contractAmount:24000,packageCount:8,remaining:2},'Пакет · 8 занятий','24000₽',1],
 ['unpaid pack',{paymentType:'package',isPaid:false,contractAmount:10000,packageCount:4,remaining:4},'Пакет · 4 занятия','10000₽',1],
 ['pack plus single',{paymentType:'package',isPaid:true,contractAmount:24000,packageCount:8,remaining:2,singlePrice:3500},'Пакет · 8 занятий','24000₽',2],
 ['free single plus pack',{paymentType:'package',isPaid:true,contractAmount:24000,packageCount:8,remaining:2,singlePrice:0},'Пакет · 8 занятий','24000₽',2],
 ['free pack',{paymentType:'package',contractAmount:0,packageCount:4},'Пакет · 4 занятия','0₽',1],
 ['unknown pack',{paymentType:'package',contractAmount:null,packageCount:4},'Пакет · 4 занятия','Добавитьцену',1],
 ['gym',{paymentType:'period',contractAmount:13000,duration:'2'},'Абонемент · 2 мес.','13000₽',1],
 ['free term',{paymentType:'period',contractAmount:0,duration:'1'},'Абонемент · 1 мес.','0₽',1],
 ['unknown term',{paymentType:'period',contractAmount:null,duration:'2'},'Абонемент · 2 мес.','Добавитьцену',1],
 ['single',{paymentType:'visit',price:3000},'Разовый визит','3000₽',1],
 ['free single',{paymentType:'visit',price:0},'Разовый визит','0₽',1],
 ['unknown single',{paymentType:'visit',price:null},'Разовый визит','Добавитьцену',1],
];
(async()=>{for(const [name,fields,label,value,count]of cases){const h=await sandbox([{id:1,entityType:'service',groupId:10,groupName:'Мастер',name,...fields}]);h.c.openSpecialistService(1);const before=h.c.aggregatePrepaid(h.run('services')).amount,rows=h.$('groupCards').querySelectorAll('.specialist-price-row');a.equal(rows.length,count,name);a.equal(rows[0].querySelector('span').textContent,label,name);a.equal(clean(rows[0].querySelector('strong').textContent),value,name);if(count===2){a.equal(rows[1].querySelector('span').textContent,'Разовый визит');a.equal(clean(rows[1].querySelector('strong').textContent),String(fields.singlePrice)+'₽')}rows[0].onclick();a(!h.$('paymentFold').hidden);a.equal(h.$('paymentType').value,fields.paymentType);a.equal(h.c.aggregatePrepaid(h.run('services')).amount,before);console.log('PASS',name)}
const pack={id:1,name:'Треня',paymentType:'package',isPaid:true,contractAmount:24000,packageCount:8,remaining:2},h=await sandbox([pack]);h.c.openSpecialistService(1);h.$('groupCards').querySelector('.specialist-price-row').onclick();h.$('name').value='Тренировка';h.c.updateFields();a.equal(await h.c.save(),true);const saved=h.read().find(s=>s.id===1);a.equal(saved.contractAmount,24000);a.equal(saved.singlePrice,null);a.equal(h.c.packageValue(saved),6000);const reopened=await sandbox([],{cloud:h.cloud});reopened.c.openSpecialistService(1);a.equal(clean(reopened.$('groupCards').querySelector('.specialist-price-row').querySelector('strong').textContent),'24000₽');console.log('PASS pack edit/save/reload: amount and credit unchanged, no inferred single price');
})().catch(e=>{console.error(e);process.exitCode=1});
