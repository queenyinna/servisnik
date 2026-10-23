export function invitationMessage(record){
 if(!record?.provider)return 'Привет! 👋 Хочу вести наши записи и оплаты в «Сервиснике».\nОткрой приглашение и добавь свою услугу. Я проверю цену и расписание.';
 const items=[record.terms,...(record.additionalTerms||[]).map(x=>x.terms)].filter(Boolean),offers=items.map(t=>t.name+' · '+(t.amount===null?'без цены':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(t.amount)+' ₽')+(t.paymentType==='package'?' · '+t.count+' занятий':t.paymentType==='period'?' · '+t.duration+' мес.':''));
 return 'Привет! 👋 Приглашаю в Сервисник: там будут видны наши занятия, остаток, заметки об оплатах и планировщик )\n\n'+(offers.length>1?'Добавляю услуги для тебя':'Добавляю услугу для тебя')+'\n\n'+offers.join('\n');
}
