export function invitationMessage(record){
 if(!record?.provider)return 'Привет! 👋 Хочу вести наши записи и оплаты в «Сервиснике».\nОткрой приглашение и добавь свою услугу. Я проверю цену и расписание.';
 const items=[record.terms,...(record.additionalTerms||[]).map(x=>x.terms)].filter(Boolean),offers=items.map(t=>t.name+' · '+(t.amount===null?'без цены':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(t.amount)+' ₽')+(t.paymentType==='package'?' · '+t.count+' занятий':t.paymentType==='period'?' · '+t.duration+' мес.':''));
 return 'Привет! 👋 Сервисник помогает вести услуги, оплаты и посещения вместе.\n'+(record.provider.name||'Специалист')+' предлагает вам:\n'+offers.join('\n')+'\nПосмотрите условия и подтвердите, если всё верно.';
}
