'use strict';
const $=id=>document.getElementById(id);
let prefs={};
try{prefs=JSON.parse(localStorage.getItem('meridian.settings')||'{}')||{}}catch{}
function save(){try{localStorage.setItem('meridian.settings',JSON.stringify(prefs))}catch{}}
const defaults=places.map(p=>({...p}));
const zones=Intl.supportedValuesOf('timeZone');
function locationFor(z){return defaults.find(p=>p.zone===z)||{id:z,name:z.split('/').pop().replaceAll('_',' '),country:z.split('/')[0],zone:z}}
function loadCities(list){const valid=[...new Set(list)].filter(z=>zones.includes(z)||defaults.some(p=>p.zone===z)).slice(0,12);if(valid.length)places.splice(0,places.length,...valid.map(locationFor))}
loadCities(prefs.locations||defaults.map(p=>p.zone));
let selected=places[0],fixed=null,anchor=Date.now(),dayKey='',rowKey='',lastMinute='',timer;
const now=()=>fixed??Date.now();
function restore(){
 const hash=new URLSearchParams(location.hash.slice(1)),t=Date.parse(hash.get('at'));
 if(hash.has('locations')){loadCities(hash.get('locations').split(','));buildCards()}
 const place=places.find(p=>p.id===hash.get('city'));
 if(place&&Number.isFinite(t)&&t>=Date.UTC(1900,0,1)&&t<Date.UTC(2100,0,1)){selected=place;fixed=t}
 else{selected=places[0];fixed=null}
 anchor=now();$('slide').value=0;
}
function urlFor(t){const url=new URL(location.href);url.hash=new URLSearchParams({city:selected.id,at:new Date(t).toISOString(),locations:places.map(p=>p.zone).join(',')});return url}
function change(t,place=selected,slider=false){
 if(!Number.isFinite(t)||t<Date.UTC(1900,0,1)||t>=Date.UTC(2100,0,1)){message('Choose a time between 1900 and 2099.');return}
 fixed=t;selected=place;
 if(!slider){anchor=t;$('slide').value=0}
 scheduleHash();render();
}
// Coalesce bursts of drag input to stay within mobile history rate limits.
let hashTimer;
function scheduleHash(){clearTimeout(hashTimer);hashTimer=setTimeout(writeHash,100)}
function writeHash(){clearTimeout(hashTimer);const url=new URL(location.href);url.hash=fixed===null?'':urlFor(fixed).hash;if(url.href!==location.href)history.replaceState(null,'',url)}
function goLive(){fixed=null;anchor=Date.now();$('slide').value=0;writeHash();render()}
window.addEventListener('pagehide',writeHash);
window.addEventListener('hashchange',()=>{clearTimeout(hashTimer);restore();render()});
function message(s){clearTimeout(timer);$('toast').textContent=s;timer=setTimeout(()=>$('toast').textContent='',3500)}
function shortTime(t,z){
 const {h,m}=local(t,z);return prefs.hour24?pad(h)+':'+pad(m):(h%12||12)+':'+pad(m)+(h<12?' AM':' PM');
}
function dateLabel(t,z,year=false){return formatter(z,{weekday:'short',day:'numeric',month:'short',...(year?{year:'numeric'}:{})}).format(t)}
function phase(h){return h<6||h>=20?'night':h<8?'dawn':h<18?'day':'dusk'}
let cards=[];
function buildCards(){ $('cards').replaceChildren();$('city').replaceChildren();$('tableHead').replaceChildren();cards=places.map(p=>{
 const card=document.createElement('article');card.className='clock';
 card.innerHTML='<h3>'+p.name+'</h3><div class="country">'+p.country+'</div><div class="landscape"></div><div class="digits"><button class="hour"></button><span aria-hidden="true">:</span><button class="minute"></button><button class="period"></button></div><div class="date"></div><div class="bar"></div><div class="barlabel"><span class="phase"></span><span>24h</span></div>';
 const remove=document.createElement('button');remove.textContent='Remove';remove.className='remove';remove.setAttribute('aria-label','Remove '+p.name);remove.onclick=()=>{if(places.length===1){message('Keep at least one location.');return}places.splice(places.indexOf(p),1);if(selected===p)selected=places[0];updateCities()};card.append(remove);
 $('city').add(new Option(p.name+' · '+p.country,p.id));const th=document.createElement('th');th.textContent=p.name;$('tableHead').append(th);
 $('cards').append(card);
 const q=s=>card.querySelector('.'+s);
 function shift(n,unit){change(now()+n*unit,p)}
 for(const [name,unit] of [['hour',HOUR],['minute',MIN]]){
  const b=q(name);b.setAttribute('role','spinbutton');b.setAttribute('aria-label',p.name+' '+name);b.setAttribute('aria-valuemin','0');b.setAttribute('aria-valuemax',unit===HOUR?'23':'59');
  b.onkeydown=e=>{const n={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1}[e.key];if(n){e.preventDefault();shift(n,unit)}};
  let wheel=0,lastWheel=0;
  b.addEventListener('wheel',e=>{e.preventDefault();if(performance.now()-lastWheel>200)wheel=0;lastWheel=performance.now();wheel+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?100:1);if(Math.abs(wheel)>=24){shift(-Math.sign(wheel),unit);wheel=0}},{passive:false});
  let drag=null,dragged=false;
  b.onpointerdown=e=>{if(!e.isPrimary||e.button!==0)return;drag={y:e.clientY,t:now(),n:0};dragged=false;b.setPointerCapture(e.pointerId)};
  b.onpointermove=e=>{if(!drag)return;const n=Math.trunc((drag.y-e.clientY)/12);if(n!==drag.n){drag.n=n;dragged=true;change(drag.t+n*unit,p)}};
  b.onlostpointercapture=b.onpointercancel=()=>{drag=null};
  b.onclick=()=>{if(!dragged)openForm(p);dragged=false};
 }
 const bar=q('bar');bar.classList.add('interactive');
 const scrub=document.createElement('input');scrub.type='range';scrub.min='0';scrub.max='1439';scrub.step='1';scrub.className='city-scrub';scrub.setAttribute('aria-label',p.name+' time of day');bar.append(scrub);
 let scrubBase=null;
 scrub.addEventListener('pointerdown',()=>{scrubBase=now()});
 for(const event of ['pointerup','pointercancel','lostpointercapture','blur'])scrub.addEventListener(event,()=>{scrubBase=null});
 scrub.oninput=()=>{const t=timelineTime(scrubBase??now(),p.zone,+scrub.value);if(t!==undefined)change(t,p)};
 q('period').onclick=()=>shift(local(now(),p.zone).h<12?12:-12,HOUR);
 return {p,card,h:q('hour'),m:q('minute'),a:q('period'),date:q('date'),phase:q('phase'),art:q('landscape'),bar:q('bar')};
});
 dayKey='';}
function syncPrefs(){
 const dark=prefs.dark??matchMedia('(prefers-color-scheme: dark)').matches;
 document.documentElement.toggleAttribute('data-dark',dark);document.documentElement.toggleAttribute('data-large',!!prefs.large);
 $('theme').textContent=dark?'Light mode':'Dark mode';$('format').checked=!!prefs.hour24;$('large').checked=!!prefs.large;
 $('range').value=Object.hasOwn(ranges,prefs.range)?prefs.range:'awake';
}
$('theme').onclick=()=>{prefs.dark=!document.documentElement.hasAttribute('data-dark');save();syncPrefs()};
for(const [id,key] of [['large','large'],['format','hour24'],['range','range']]){
 $(id).onchange=()=>{prefs[key]=id==='range'?$(id).value:$(id).checked;save();syncPrefs();render()};
}
function table(start,end,t){
 const body=$('rows'),frag=document.createDocumentFragment(),baseDate=local(t,selected.zone).date;
 for(let hour=start;hour<end;hour+=HOUR){
  const tr=document.createElement('tr');tr.dataset.t=hour;
  places.forEach((p,i)=>{
   const td=document.createElement('td'),el=document.createElement(i===0?'button':'span');
   const time=shortTime(hour,p.zone),d=local(hour,p.zone).date;
   el.textContent=time;td.append(el);
   const repeated=end-start>DAY&&((hour>start&&shortTime(hour-HOUR,p.zone)===time)||(hour+HOUR<end&&shortTime(hour+HOUR,p.zone)===time));
   if(d!==baseDate||repeated){const note=document.createElement('small');note.textContent=[d!==baseDate?dateLabel(hour,p.zone):'',repeated?formatter(p.zone,{timeZoneName:'shortOffset'}).formatToParts(hour).find(v=>v.type==='timeZoneName').value:''].filter(Boolean).join(' · ');td.append(note)}
   if(!i)el.setAttribute('aria-label','Set time to '+time+' '+p.name+', '+new Date(hour).toISOString());
   tr.append(td);
  });
  frag.append(tr);
 }
 body.replaceChildren(frag);rowKey='';
}
$('rows').onclick=e=>{const row=e.target.closest('tr');if(row)change(+row.dataset.t)};
let todays=[];
function render(){
 const t=now(),current=local(t,selected.zone),range=$('range').value;
 document.body.classList.toggle('planning',fixed!==null);
 $('state').textContent=fixed===null?'Live clocks':'Selected time';
 for(const c of cards){
  const w=local(t,c.p.zone),ph=phase(w.h),hourLabel=prefs.hour24?pad(w.h):pad(w.h%12||12);
  c.h.textContent=hourLabel;c.m.textContent=pad(w.m);c.h.setAttribute('aria-valuenow',w.h);c.h.setAttribute('aria-valuetext',shortTime(t,c.p.zone));c.m.setAttribute('aria-valuenow',w.m);
  c.a.hidden=!!prefs.hour24;c.a.textContent=w.h<12?'AM':'PM';c.a.setAttribute('aria-label',c.p.name+', '+c.a.textContent+', switch by 12 hours');
  c.date.textContent=dateLabel(t,c.p.zone);c.bar.style.setProperty('--pos',(w.h*60+w.m)/14.4+'%');const scrub=c.bar.querySelector('input');scrub.value=w.h*60+w.m;scrub.setAttribute('aria-valuetext',dateLabel(t,c.p.zone)+' '+shortTime(t,c.p.zone));
  if(c.card.dataset.phase!==ph){c.card.dataset.phase=ph;c.phase.textContent={day:'Daylight',night:'Night',dawn:'Morning',dusk:'Evening'}[ph];c.art.innerHTML=landscape(c.p.id,ph==='night')}
 }
 $('basis').textContent=selected.name+' · '+dateLabel(t,selected.zone)+' · '+shortTime(t,selected.zone);
 $('slide').setAttribute('aria-valuetext',$('basis').textContent);
 const key=[current.date,selected.id,prefs.hour24,range].join('|');
 if(key!==dayKey){
  const [start,end]=bounds(t,selected.zone);dayKey=key;
  todays=availableWindows(start,end,range);
  $('windows').textContent=todays.length?todays.map(([a,b])=>shortTime(a,selected.zone)+' – '+shortTime(b,selected.zone)).join(' and ')+' in '+selected.name:'No shared hours on this day.';
  const changes=daylightChanges(start,end);$('dst').hidden=!changes.length;
  $('dst').textContent=changes.length?'Clock change during this day in '+changes.join(' and ')+'.':'';
  $('tableDate').textContent=dateLabel(t,selected.zone,true)+' · '+selected.name+' day';table(start,end,t);
 }
 const active=Array.from($('rows').children).find(row=>t>=+row.dataset.t&&t<+row.dataset.t+HOUR);
 if(active&&rowKey!==active.dataset.t){
  const prior=$('rows').querySelector('.selected');if(prior){prior.classList.remove('selected');prior.removeAttribute('aria-current')}
  active.classList.add('selected');active.setAttribute('aria-current','time');rowKey=active.dataset.t;
  if(!active.parentElement.contains(document.activeElement)){const sc=active.closest('.scroll');sc.scrollTop+=active.getBoundingClientRect().top-sc.getBoundingClientRect().top-sc.clientHeight/2}
 }
 lastMinute=Math.floor(t/MIN);
}
$('next').onclick=async()=>{
 const start=now(),range=$('range').value,place=selected,button=$('next');
 button.disabled=true;
 try{
  // Check a full seasonal cycle, including both North American offsets.
  let a=start;
  for(let i=0;i<367;i++){
   const [,end]=bounds(a,place.zone);
   const next=availableWindows(a,end,range)[0];
   if(next){if(next[0]===start){message('Everyone is available at the displayed time.')}else{change(next[0],place);message('Moved to the next shared time.')}return}
   a=end;
   if(i%8===0){await new Promise(r=>setTimeout(r,0));if(selected!==place||range!==$('range').value||(fixed!==null&&fixed!==start))return}
  }
  message('No shared hours in the next year for this range.');
 }finally{button.disabled=false}
};
for(const [label,n] of [['−1 day',-24],['−1 h',-1],['Now',0],['+1 h',1],['+1 day',24]]){
 const b=document.createElement('button');b.textContent=label;b.onclick=()=>n?change(now()+n*HOUR):goLive();$('steps').append(b);
}
$('slide').oninput=()=>{if(fixed===null)anchor=Date.now();change(anchor+Number($('slide').value)*MIN,selected,true)};

let formInstant;
const formPlace=()=>places.find(p=>p.id===$('city').value);
function fillForm(){
 const p=formPlace(),w=local(formInstant,p.zone);$('date').value=w.date;$('time').value=pad(w.h)+':'+pad(w.m);
 validateForm();const options=formCandidates();$('occ').value=String(Math.max(0,options.indexOf(Math.floor(formInstant/MIN)*MIN)));
}
function formCandidates(){return candidates($('date').value,$('time').value,formPlace().zone)}
function validateForm(){const opts=formCandidates();$('repeat').hidden=opts.length<2;$('occ').value='0';$('err').textContent=opts.length||!$('date').value||!$('time').value?'':'This local time is skipped by the clock change. Choose another time.'}
function openForm(p){formInstant=now();$('city').value=p.id;fillForm();$('dlg').showModal()}
$('set').onclick=()=>openForm(selected);$('date').oninput=$('time').oninput=validateForm;
$('city').onchange=fillForm;$('cancel').onclick=()=>$('dlg').close();
$('form').onsubmit=e=>{e.preventDefault();const t=formCandidates()[+$('occ').value];if(t===undefined){validateForm();return}change(t,formPlace());writeHash();$('dlg').close()};
async function copy(value,msg){
 try{await navigator.clipboard.writeText(value);message(msg)}catch{$('manual').value=value;$('fallback').showModal();$('manual').focus();$('manual').select()}
}
$('closeCopy').onclick=()=>$('fallback').close();
const lines=t=>places.map(p=>p.name+' · '+dateLabel(t,p.zone,true)+' · '+shortTime(t,p.zone));
$('copy').onclick=()=>copy(lines(now()).join('\n'),'Local times copied.');
$('share').onclick=()=>copy(urlFor(now()).href,'Time link copied.');
function calendar(t){
 const stamp=s=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const esc=s=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 function fold(line){const encoder=new TextEncoder();let out='',length=0;for(const c of line){const bytes=encoder.encode(c).length;if(length+bytes>75){out+='\r\n ';length=1}out+=c;length+=bytes}return out}
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Meridian//Family Clock//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+stamp(t)+'-call@meridian.invalid','DTSTAMP:'+stamp(Date.now()),'DTSTART:'+stamp(t),'DTEND:'+stamp(t+30*MIN),'SUMMARY:Call','DESCRIPTION:'+esc(lines(t).join('\n')),'END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
$('cal').onclick=()=>{const url=URL.createObjectURL(new Blob([calendar(now())],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Call.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)};
buildCards();restore();syncPrefs();render();
function tick(){if(fixed===null&&Math.floor(Date.now()/MIN)!==lastMinute)render()}
setInterval(tick,1000);document.addEventListener('visibilitychange',tick);
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('./service-worker.js').catch(()=>message('Offline installation is unavailable.'));


function updateCities(){prefs.locations=places.map(p=>p.zone);save();buildCards();render();scheduleHash()}
function cityResults(){const q=$('searchCity').value.toLowerCase().trim(),box=$('cityResults');box.replaceChildren();const found=zones.filter(z=>!places.some(p=>p.zone===z)&&z.replaceAll('_',' ').toLowerCase().includes(q)).slice(0,25);for(const z of found){const b=document.createElement('button');b.textContent=locationFor(z).name+' · '+z;b.onclick=()=>{if(places.length>=12){message('Show up to 12 locations.');return}places.push(locationFor(z));updateCities();$('cityDialog').close()};box.append(b)}if(!found.length)box.textContent='No matches. Try a nearby major city.'}
$('addCity').onclick=()=>{$('searchCity').value='';cityResults();$('cityDialog').showModal();$('searchCity').focus()};$('searchCity').oninput=cityResults;$('closeCities').onclick=()=>$('cityDialog').close();
$('suggest').onclick=()=>{const start=Math.ceil(now()/(30*MIN))*30*MIN,duration=+$('duration').value*MIN,results=[];for(let t=start;t<start+7*DAY;t+=30*MIN){let score=0,awake=true;for(const p of places){for(const point of [t,t+duration-MIN]){const w=local(point,p.zone),h=w.h+w.m/60;awake&&=h>=7&&h<23;score+=h>=9&&h<21?0:h>=7&&h<23?2:12;score+=Math.abs(h-15)/24}}results.push({t,score,awake})}results.sort((a,b)=>a.score-b.score||a.t-b.t);const chosen=[];for(const r of results){if(chosen.every(c=>Math.abs(c.t-r.t)>=3*HOUR))chosen.push(r);if(chosen.length===3)break}const box=$('suggestions');box.replaceChildren();const note=document.createElement('p');note.textContent=chosen[0].awake?'These times keep everyone within 07:00–23:00 for the full call.':'No shared waking time found. These are the least disruptive options.';box.append(note);for(const r of chosen){const b=document.createElement('button');b.textContent=lines(r.t).join(' | ');b.onclick=()=>{change(r.t);message('Suggested call time selected.')};box.append(b)}};

$('backNow').onclick=()=>{goLive();message('Showing the current live time.')}
