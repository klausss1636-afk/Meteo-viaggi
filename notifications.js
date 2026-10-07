/* Meteo Viaggio - notifiche meteo v1.4.0 */
(()=>{
  const KEY='mv-weather-notifications';
  const LAST='mv-weather-last-alert';
  const CHECK_MS=15*60*1000;

  const enabled=()=>localStorage.getItem(KEY)==='1';

  const fmt=d=>d.toLocaleTimeString('it-IT',{
    hour:'2-digit',
    minute:'2-digit'
  });

  function getEvent(j){
    const h=j?.hourly;
    if(!h?.time?.length) return null;

    const now=Date.now();
    const end=now+12*3600*1000;
    let best=null;

    for(let i=0;i<h.time.length;i++){
      const t=new Date(h.time[i]).getTime();
      if(t<now || t>end) continue;

      const code=Number(h.weather_code?.[i] ?? 0);
      const rain=Number(h.precipitation_probability?.[i] ?? 0);
      const precip=Number(h.precipitation?.[i] ?? 0);
      const wind=Number(h.wind_gusts_10m?.[i] ?? 0);

      let rank=0, type='', text='';

      if(code===96 || code===99){
        rank=100; type='grandine';
        text='⛈️ Possibile GRANDINE / temporale forte';
      } else if(code===95){
        rank=90; type='temporale';
        text='⛈️ Temporale in arrivo';
      } else if(wind>=75){
        rank=80; type='vento-forte';
        text=`💨 Vento molto forte in arrivo: raffiche ${Math.round(wind)} km/h`;
      } else if(wind>=55){
        rank=70; type='vento';
        text=`💨 Vento forte in arrivo: raffiche ${Math.round(wind)} km/h`;
      } else if(rain>=80 || precip>=5){
        rank=60; type='pioggia-forte';
        text=`🌧️ Pioggia forte in arrivo (${Math.round(rain)}%)`;
      } else if(rain>=60){
        rank=50; type='pioggia';
        text=`🌧️ Sta per piovere (${Math.round(rain)}%)`;
      }

      if(rank && (!best || rank>best.rank)){
        best={rank,type,text,time:new Date(h.time[i]),stamp:h.time[i]};
      }
    }
    return best;
  }

  async function notify(j,force=false){
    const ev=getEvent(j);
    if(!ev) return;

    const id=`${ev.type}-${ev.stamp}`;
    if(!force && localStorage.getItem(LAST)===id) return;

    const title='⚠️ Meteo Viaggio';
    const body=`${ev.text}\nPrevisto verso le ${fmt(ev.time)}`;

    if('Notification' in window && Notification.permission==='granted'){
      try{
        new Notification(title,{
          body,
          icon:'icon-192.png',
          tag:'meteo-viaggio-weather',
          renotify:true
        });
      }catch(e){}
    }

    localStorage.setItem(LAST,id);
  }

  async function weather(){
    if(!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        const lat=pos.coords.latitude;
        const lon=pos.coords.longitude;
        const url=
          `https://api.open-meteo.com/v1/forecast`+
          `?latitude=${lat}`+
          `&longitude=${lon}`+
          `&hourly=weather_code,precipitation_probability,precipitation,wind_gusts_10m`+
          `&forecast_days=2&timezone=auto`;

        const r=await fetch(url);
        if(!r.ok) return;
        await notify(await r.json(),false);
      }catch(e){}
    },()=>{},{
      enableHighAccuracy:false,
      timeout:10000,
      maximumAge:300000
    });
  }

  async function askPermission(){
    if(!('Notification' in window)){
      alert('Le notifiche non sono supportate su questo dispositivo.');
      return;
    }

    const p=await Notification.requestPermission();
    if(p==='granted'){
      localStorage.setItem(KEY,'1');
      sync();
      weather();
      alert('Allerte meteo attivate.');
    }else{
      localStorage.setItem(KEY,'0');
      sync();
      alert('Permesso notifiche non concesso.');
    }
  }

  function addButton(){
    if(document.getElementById('mv-weather-alert-btn')) return;

    const b=document.createElement('button');
    b.id='mv-weather-alert-btn';

    b.onclick=async()=>{
      if(enabled()){
        localStorage.setItem(KEY,'0');
        sync();
      }else{
        await askPermission();
      }
    };

    Object.assign(b.style,{
      position:'fixed', right:'14px', bottom:'86px', zIndex:'99999',
      border:'0', borderRadius:'14px', padding:'11px 15px',
      fontWeight:'700', fontSize:'14px', background:'#123b55',
      color:'#fff', boxShadow:'0 3px 12px #0008'
    });

    document.body.appendChild(b);
    sync();
  }

  function sync(){
    const b=document.getElementById('mv-weather-alert-btn');
    if(!b) return;
    b.textContent=enabled() ? '🔔 Allerte meteo ON' : '🔕 Attiva allerte meteo';
    b.title=enabled()
      ? 'Tocca per disattivare le allerte meteo'
      : 'Tocca per attivare le allerte meteo';
  }

  function start(){
    addButton();
    if(enabled()) weather();
    setInterval(()=>{ if(enabled()) weather(); },CHECK_MS);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start);
  }else{
    start();
  }
})();
