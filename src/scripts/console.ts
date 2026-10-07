import deliveredPatch from '../assets/mascot/patch-delivered.png?url';
import refusedPatch from '../assets/mascot/patch-refuse.png?url';
import { runMission, type Template, type Behavior } from '../lib/run-mission';
import { missionId, parseMissionId } from '../data/mission.mjs';
import { site } from '../config/site.mjs';
import { startSharedMissionCounter } from '../lib/shared-counter';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>('conForm');
const controls = $<HTMLFieldSetElement>('missionControls');
const canvas = $<HTMLCanvasElement>('patchCanvas');
let runs = 0, busy = false, patchId = '';
const pad = (n: number) => String(n).padStart(4, '0');
const sharedCounter = startSharedMissionCounter($('teleRuns'));
const motionOff = () => document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;

// Turning off motion flushes the current wait immediately, even midway through a run.
function stepDelay() {
  if (motionOff()) return Promise.resolve();
  return new Promise<void>(resolve => {
    const finish = () => { clearTimeout(timer); document.removeEventListener('mule:motion', changed); resolve(); };
    const changed = () => { if (motionOff()) finish(); };
    const timer = setTimeout(finish, 800);
    document.addEventListener('mule:motion', changed);
  });
}

async function drawPatch(id: string) {
  const mission = parseMissionId(id)!;
  await document.fonts.ready;
  const mascot = new Image();
  mascot.src = mission.settled ? deliveredPatch : refusedPatch;
  await mascot.decode();
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
  ctx.clearRect(0, 0, 600, 660); ctx.save(); ctx.scale(3, 3);
  const polygon = (points: number[][], fill: string | null, stroke: string, width: number) => {
    ctx.beginPath();points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();
  };
  const signal = mission.settled ? '#FF4F00' : '#5F5E59';
  ctx.setLineDash(mission.settled ? [] : [8,5]);
  polygon([[100,6],[192,58],[192,162],[100,214],[8,162],[8,58]],'#E9E8E3',signal,8);
  ctx.setLineDash([3,3]);polygon([[100,22],[178,66],[178,154],[100,198],[22,154],[22,66]],null,'#0E0E0E',1.5);
  ctx.setLineDash([]);
  ctx.drawImage(mascot,64,36,72,72*270/260);
  ctx.textAlign='center';ctx.fillStyle='#0E0E0E';ctx.font='900 24px Doto';ctx.fillText(mission.mission,100,126);
  ctx.font='600 11px "Azeret Mono"';ctx.fillText(mission.settled?'SETTLED ✓':'RETURNED',100,141);
  ctx.font='400 7px "Azeret Mono"';ctx.fillText(mission.template.toUpperCase(),100,152);
  // The longer notice sits above the date, where the inner hexagon is wider.
  ctx.fillStyle='#5F5E59';ctx.font='400 5.5px "Azeret Mono"';ctx.fillText('SIMULATION · NO REAL FUNDS',100,162);
  ctx.font='400 7px "Azeret Mono"';ctx.fillText(mission.date,100,175);ctx.restore();
  canvas.setAttribute('aria-label',`${mission.mission}, ${mission.settled?'settled':'returned'}, ${mission.template}, ${mission.date}. Simulation, no real funds.`);
}

form.addEventListener('submit', async event => {
  event.preventDefault(); if (busy || runs >= 9999) return;
  busy=true;controls.disabled=true;patchId='';$('patch').hidden=true;$('getPatch').hidden=true;
  const log=$('log');log.replaceChildren();$('stamp').textContent='';$('stamp').className='stampbig';
  $('conOut').classList.remove('shake');$('msnId').textContent=`MSN-${pad(runs+1)}`;$('msnState').textContent='Running';
  const template=$<HTMLSelectElement>('tpl').value as Template;
  const behavior=form.querySelector<HTMLInputElement>('input[name="beh"]:checked')!.value as Behavior;
  try {
    let settled=false;
    for await (const step of runMission(template,behavior)) {
      const li=document.createElement('li');li.className=`new${step.failed?' bad':''}`;
      const key=document.createElement('span');key.className='k';key.textContent=`[0${step.station}]`;
      const value=document.createElement('span');value.className='v';value.textContent=step.text;li.append(key,value);log.append(li);
      settled=step.outcome==='settled'; await stepDelay();li.classList.remove('new');
    }
    runs++;patchId=missionId(runs,settled,template);sharedCounter.recordMission();
    $('stamp').textContent=settled?'SETTLED ✓':'RETURNED';$('stamp').className=`stampbig on ${settled?'ok':'ko'}`;
    $('conOut').classList.add('shake');$('msnState').textContent=settled?'Settled':'Returned';
    $('runs').textContent=`${runs} mission${runs===1?'':'s'} run on this page`;
    const mission=parseMissionId(patchId)!;
    $('patchTitle').textContent=settled?'Mission settled.':'Mission returned.';
    $('patchText').textContent=settled?`${mission.mission}: the delivery passed every check, so the agent got paid. ${mission.template} · ${mission.date}.`:`${mission.mission}: the delivery failed inspection, so the client got a refund. The agent got nothing. Stubborn by design. ${mission.template} · ${mission.date}.`;
    const url=new URL(`/m/${patchId}`,location.origin).href;
    const text=settled?`My agent got paid on delivery. Mission ${mission.mission} settled.`:'My dishonest agent got nothing. Stubborn by design.';
    $<HTMLAnchorElement>('shareX').href=`https://x.com/intent/post?${new URLSearchParams({text:`${text} ${url} ${site.X_HANDLE}`})}`;
    $<HTMLAnchorElement>('patchPage').href=`/m/${patchId}`;
    await drawPatch(patchId);$('patch').hidden=false;$('getPatch').hidden=false;$('patch').classList.remove('patch-in');
    if(!motionOff()) requestAnimationFrame(()=>$('patch').classList.add('patch-in'));
  } catch { $('msnState').textContent='Simulation unavailable';$('patchText').textContent='Please reload the page to try again.'; }
  finally { busy=false;controls.disabled=runs>=9999; }
});
$('downloadPatch').addEventListener('click',()=>{
  if(!patchId)return;
  canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`mule-${patchId}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');
});
controls.disabled=false;
