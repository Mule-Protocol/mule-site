import fs from 'node:fs/promises';
import sharp from 'sharp';
import {mascotInner} from '../src/lib/mascot.mjs';
const before='reference/brand-before-mascot';
const original=await fs.readFile(`${before}/mule-lockup-ink.svg`,'utf8');
const wordmark=original.slice(original.indexOf('<circle cx="99" cy="5"'));
const head=(await fs.readFile('src/assets/mascot/unit-m1-head.svg','utf8')).replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
await fs.writeFile('public/brand/mule-lockup-ink.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 344 70" width="344" height="70" role="img" aria-label="MULE"><svg x="0" y="0" width="70" height="70" viewBox="218 8 82 88" aria-hidden="true">${head}</svg>${wordmark}`);
let dossier=await fs.readFile('src/content/dossier.html','utf8');
const art=`<!-- M1 ART START --><g class="m1-art">${mascotInner('locked','dossier')}</g><g font-family="Azeret Mono, monospace" font-size="8" fill="#0E0E0E"><text x="120" y="85">PAYLOAD</text><text x="122" y="95" font-weight="600">LOCKED</text></g><!-- M1 ART END -->`;
if(dossier.includes('<!-- M1 ART START -->'))dossier=dossier.replace(/<!-- M1 ART START -->[\s\S]*?<!-- M1 ART END -->/,art);
else {const start=dossier.indexOf('<g stroke="#0E0E0E" stroke-width="2"'),end=dossier.indexOf('<g font-size="7.5"',start);if(start<0||end<0)throw Error('Dossier source bounds missing');dossier=dossier.slice(0,start)+art+'\n        '+dossier.slice(end);}
dossier=dossier.replace('M192 62L212 44H290','M184 64L176 34H206').replace('x="290" y="40"','x="206" y="29"');await fs.writeFile('src/content/dossier.html',dossier);
// Preserve every existing text pixel and the card layouts. Restore only the old mascot's
// rectangle with its original seamless background tile, then rasterize the supplied SVG.
const originalSite=await fs.readFile(`${before}/site.png`);
const {data:tile}=await sharp(originalSite).extract({left:624,top:96,width:24,height:24}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const width=480,height=324,bg=Buffer.alloc(width*height*4);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=((y%24)*24+x%24)*4,b=(y*width+x)*4;tile.copy(bg,b,a,a+4);}
const mascot=await sharp('artifacts/mascot/raw/unit-m1-pose-locked.svg',{density:288}).resize(490,392).png().toBuffer();
const label=await sharp(originalSite).extract({left:908,top:207,width:58,height:20}).png().toBuffer();
await sharp(originalSite).composite([{input:bg,raw:{width,height,channels:4},left:672,top:96},{input:mascot,left:658,top:73},{input:label,left:864,top:207}]).png().toFile('public/images/site.png');
const icon=await sharp('artifacts/mascot/raw/unit-m1-head.svg').resize(82,88).png().toBuffer();
await sharp(`${before}/dossier.png`).composite([{input:icon,left:1038,top:372}]).png().toFile('public/images/dossier.png');
console.log('Updated lockup, dossier illustration and both 1200x630 share cards.');