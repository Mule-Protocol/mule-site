import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {optimize} from 'svgo';
import {mascotInner,lifecyclePoses} from '../src/lib/mascot.mjs';
import {missionPage} from '../src/server/mission-page.mjs';
function structure(svg){const nodes=[];optimize(svg,{plugins:[{name:'inspect',fn:()=>({element:{enter(n){nodes.push([n.name,Object.fromEntries(Object.entries(n.attributes).filter(([k])=>!['class','opacity','transform'].includes(k)).sort())]);}}})}]});return nodes;}
test('all supplied geometry, IDs and pivot metadata survive integration without inline opacity or transforms',async()=>{
 for(const file of (await fs.readdir('reference/mascot')).filter(f=>f.endsWith('.svg'))){
  const original=await fs.readFile(`reference/mascot/${file}`,'utf8'),integrated=await fs.readFile(`src/assets/mascot/${file}`,'utf8');
  assert.deepEqual(structure(integrated),structure(original),file);
  assert.doesNotMatch(integrated,/\s(?:style|opacity|transform)=|<script\b/,file);
 }
 for(const name of ['m1.js','build.js'])assert.deepEqual(await fs.readFile(`reference/mascot/source/${name}`),await fs.readFile(`src/assets/mascot/source/${name}`));
});
test('pose instances have separate DOM IDs and retain canonical CSS part names',()=>{
 for(const pose of lifecyclePoses){const svg=mascotInner(pose,'test');assert.match(svg,/id="test-chassis"/);assert.match(svg,/class="[^"]*m1-chassis/);assert.doesNotMatch(svg,/id="chassis"/);}
 assert.throws(()=>mascotInner('unknown'));assert.throws(()=>mascotInner('neutral','<script>'));
});
test('both mission outcomes use their approved pose and only external stylesheets',async()=>{
 for(const status of ['s','r']){
  const html=await missionPage(new Request(`https://preview.mule-site.pages.dev/m/0042-${status}-inv-20261007`),`0042-${status}-inv-20261007`).text();
  assert.match(html,/mascot-poses\.css/);assert.match(html,/m1-chassis/);assert.doesNotMatch(html,/\s(?:style|opacity)=|<style\b|<script\b/);
 }
});
