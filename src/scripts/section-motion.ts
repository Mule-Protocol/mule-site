export {};
const off=()=>document.documentElement.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const finals=new Map<Element,string>();const timers=new Map<Element,ReturnType<typeof setInterval>>();
document.querySelectorAll('[data-flip],[data-scramble]').forEach(el=>finals.set(el,el.textContent||''));
const finish=(el:Element)=>{clearInterval(timers.get(el));timers.delete(el);el.textContent=finals.get(el)||'';};
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){if(!entry.isIntersecting)continue;const el=entry.target;observer.unobserve(el);
    if(el.id==='strike'){el.classList.add('on');continue;}
    if(off())continue;
    const target=finals.get(el)!;let frame=0;const scramble=el.hasAttribute('data-scramble');
    const timer=setInterval(()=>{frame++;if(off()||frame>=(scramble?target.length:7)){finish(el);return;}
      el.textContent=scramble?target.split('').map((c,i)=>i<frame||c===' '?c:'█▓▒░#*+='[(frame+i)%8]).join(''):String(10+(frame*17)%90);
    },scramble?35:45);timers.set(el,timer);
  }
},{threshold:0.6});
document.querySelectorAll('[data-flip],[data-scramble],#strike').forEach(el=>observer.observe(el));
const rail=document.getElementById('mlogFill')!;const log=document.getElementById('mlog')!;let scheduled=false;
function updateRail(){if(off())return;if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;if(off())return;const r=log.getBoundingClientRect();const p=Math.round(Math.max(0,Math.min(1,(innerHeight*.7-r.top)/r.height))*20)/20;rail.style.transform=`scaleY(${p})`;});}
document.addEventListener('mule:motion',()=>{if(off()){timers.forEach((_,el)=>finish(el));document.getElementById('strike')?.classList.add('on');rail.style.transform='scaleY(1)';}else updateRail();});
addEventListener('scroll',updateRail,{passive:true});addEventListener('resize',updateRail);
if(off()){document.getElementById('strike')?.classList.add('on');rail.style.transform='scaleY(1)';}else updateRail();
