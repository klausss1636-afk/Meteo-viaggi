/* Meteo Viaggio - notifiche meteo v1.3.0 */
(()=>{
  const KEY='mv-weather-notifications';
  const LAST='mv-weather-last-alert';
  const CHECK_MS=15*60*1000;

  const enabled=()=>localStorage.getItem(KEY)==='1' && 'Notification' in window && Notification.permission==='granted';
  const fmt=d=>d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});

  function getEvent(j){
    const h=j?.hourly;if(!h?.time?.length)return null;
    const now=Date.now(), end=now+12*3600*1000;
    let best=null;
    for(let i=0;i<h.time.length;i++){
      const t=new Date(h.time[i]).getTime();
      if(t<now-30*60000||t>end)continue;
      const code=h.weather_code?.[i]??0;
      const pop=h.precipitation_probability?.[i]??0;
      const gust=h.wind_gusts_10m?.[i]??0;
      let ev=null;
      if([96,99].includes(code)) ev={rank:5,kind:'grandine',title:'⛈️ Allerta temporale / grandine',body:`Possibile temporale con grandine verso le ${fmt(new Date(t))}.`};
      else if(code===95) ev={rank:4,kind:'temporale',title:'⛈️ Temporale in arrivo',body:`Temporale previsto verso le ${fmt(new Date(t))}.`};
      else if([65,82].includes(code)) ev={rank:4,kind:'pioggia-forte',title:'🌧️ Pioggia forte in arrivo',body:`Rovesci forti previsti verso le ${fmt(new Date(t))}.`};
      else if([61,63,80,81].includes(code)||pop>=60) ev={rank:2,kind:'pioggia',title:'🌧️ Pioggia vicina',body:`Pioggia prevista verso le ${fmt(new Date(t))}${pop?` · probabilità ${Math.round(pop)}%`:''}.`};
      if(gust>=75){const w={rank:5,kind:'vento-forte',title:'💨 Raffiche molto forti',body:`Raffiche fino a circa ${Math.round(gust)} km/h verso le ${fmt(new Date(t))}.`};if(!ev||w.rank>ev.rank)ev=w;}
      else if(gust>=55){const w={rank:3,kind:'vento',title:'💨 Vento forte in arrivo',body:`Raffiche fino a circa ${Math.round(gust)} km/h verso le ${fmt(new Date(t))}.`};if(!ev||w.rank>ev.rank)ev=w;}
      if(ev){ev.time=t;if(!best||ev.rank>best.rank||(ev.rank===best.rank&&t<best.time))best=ev;}
    }
    return best;
  }

  async function notify(j,force=false){
    if(!enabled())return;
    const ev=getEvent(j);if(!ev)return;
    const sig=`${ev.kind}:${new Date(ev.time).toISOString().slice(0,13)}`;
    const old=JSON.parse(localStorage.getItem(LAST)||'{}');
    if(!force&&old.sig===sig&&Date.now()-(old.at||0)<6*3600*1000)return;
    const reg=await navigator.serviceWorker.ready;
    await reg.showNotification(ev.title,{body:ev.body,icon:'/meteo-viaggio-192-v124.png',badge:'/favicon-32x32.png',tag:'meteo-viaggio-'+ev.kind,renotify:true,data:{url:'/'}});
    localStorage.setItem(LAST,JSON.stringify({sig,at:Date.now()}));
  }

  function addButton(){
    if(document.getElementById('weatherNotify'))return;
    const card=document.querySelector('.alerts-card');if(!card)return;
    const b=document.createElement('button');b.id='weatherNotify';b.className='weather-notify-btn';
    const sync=()=>{b.textContent=enabled()?'🔔 Notifiche meteo attive':'🔔 Attiva notifiche meteo';b.classList.toggle('active',enabled());};
    b.onclick=async()=>{
      if(!('Notification' in window)){alert('Le notifiche non sono supportate su questo dispositivo/browser. Su iPhone installa Meteo Viaggio nella schermata Home e aprila da lì.');return;}
      if(Notification.permission!=='granted'){
        const p=await Notification.requestPermission();
        if(p!=='granted'){localStorage.removeItem(KEY);sync();alert('Permesso notifiche non concesso.');return;}
      }
      localStorage.setItem(KEY,'1');sync();
      try{if(window.pos){const j=await window.wx(pos.lat,pos.lon);await notify(j,true);}}catch{}
    };
    card.appendChild(b);sync();
  }

  const oldRender=window.render;
  if(typeof oldRender==='function'){
    window.render=function(j,n){const out=oldRender.apply(this,arguments);notify(j).catch(()=>{});return out;};
  }
  document.addEventListener('DOMContentLoaded',addButton);
  if(document.readyState!=='loading')addButton();

  setInterval(async()=>{
    try{if(enabled()&&window.pos&&typeof window.wx==='function'){const j=await window.wx(pos.lat,pos.lon);await notify(j);}}catch{}
  },CHECK_MS);
})();
