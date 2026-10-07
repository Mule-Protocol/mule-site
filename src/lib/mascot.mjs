import { poses } from '../assets/mascot/generated.mjs';
// One instance may appear several times in a document: retain canonical part classes,
// and namespace DOM IDs only (the optimized source SVGs retain their original IDs).
export function mascotInner(pose='neutral', prefix='m1') {
 const svg=poses[pose];if(!svg)throw new Error('Unknown approved mascot pose');
 if(!/^[a-zA-Z][\w-]*$/.test(prefix))throw new Error('Invalid mascot instance prefix');
 return svg.replace(/id="([^"]+)"/g,(_,id)=>`id="${prefix}-${id}"`);
}
export const lifecyclePoses=['load','locked','walk','scan','delivered'];