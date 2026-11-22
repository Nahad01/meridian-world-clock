'use strict';
const MIN=60000, HOUR=60*MIN, DAY=24*HOUR;
const places=[
 {id:'ontario',name:'Ontario',country:'Canada',zone:'America/Toronto'},
 {id:'kerala',name:'Kerala',country:'India',zone:'Asia/Kolkata'},
 {id:'dubai',name:'Dubai',country:'United Arab Emirates',zone:'Asia/Dubai'},
 {id:'new-york',name:'New York',country:'United States',zone:'America/New_York'}
];
const ranges={awake:[7,23],comfortable:[9,21],work:[9,17]};
const fmt=new Map();
function formatter(zone,options){
 const key=zone+JSON.stringify(options);
 if(!fmt.has(key)) fmt.set(key,new Intl.DateTimeFormat('en-GB',{timeZone:zone,...options}));
 return fmt.get(key);
}
const pad=n=>String(n).padStart(2,'0');
function local(t,z){
 const fields=Object.fromEntries(formatter(z,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(t).map(p=>[p.type,p.value]));
 return {date:fields.year+'-'+fields.month+'-'+fields.day,h:+fields.hour,m:+fields.minute,s:+fields.second};
}
function offset(t,z){
 const {date,h,m,s}=local(t,z);
 return Date.parse(date+'T'+pad(h)+':'+pad(m)+':'+pad(s)+'Z')-Math.floor(t/1000)*1000;
}
function candidates(date,time,z){
 const wall=Date.parse(date+'T'+time+':00Z');
 if(!Number.isFinite(wall))return [];
 const offsets=new Set([-DAY,0,DAY].map(d=>offset(wall+d,z)));
 return [...offsets].map(o=>wall-o).filter(t=>offset(t,z)===wall-t).sort((a,b)=>a-b);
}
const nextDate=(date,n)=>new Date(Date.parse(date+'T00:00Z')+n*DAY).toISOString().slice(0,10);
const midnight=(date,z)=>candidates(date,'00:00',z)[0];
function bounds(t,z){
 const date=local(t,z).date;
 return [midnight(date,z),midnight(nextDate(date,1),z)];
}
function availableWindows(start,end,range){
 const points=new Set([start,end]);
 for(const {zone} of places){
  const first=local(start,zone).date,last=local(end-1,zone).date;
  for(let date=first;date<=last;date=nextDate(date,1)){
   for(const h of ranges[range]){
    for(const t of candidates(date,pad(h)+':00',zone))if(t>start&&t<end)points.add(t);
   }
  }
 }
 const times=[...points].sort((a,b)=>a-b), result=[];
 for(let i=0;i<times.length-1;i++){
  const ok=places.every(({zone})=>{const h=local(times[i],zone).h;return h>=ranges[range][0]&&h<ranges[range][1]});
  if(ok)result.push([times[i],times[i+1]]);
 }
 return result;
}
function daylightChanges(start,end){
 return places.filter(({zone})=>offset(start,zone)!==offset(end-1,zone)).map(p=>p.name);
}


// Resolve a local bar position; preserve the nearest occurrence of a repeated hour.
function timelineTime(base,zone,minute){const date=local(base,zone).date;for(let m=minute;m<Math.min(1440,minute+181);m++){const options=candidates(date,pad(Math.floor(m/60))+':'+pad(m%60),zone);if(options.length)return options.reduce((a,b)=>Math.abs(a-base)<=Math.abs(b-base)?a:b)}}
