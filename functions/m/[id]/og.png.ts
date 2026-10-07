import { ImageResponse } from 'workers-og';
import { parseMissionId } from '../../../src/data/mission.mjs';
import { missingMission, missionHeaders, patchSilhouette } from '../../../src/server/mission-page.mjs';
import { monoFont } from '../../../src/server/og-font.mjs';
import { cachedMissionImage } from '../../../src/server/og-cache.mjs';

export const onRequest = async ({ request, params }: { request: Request; params: Record<string,string> }) => {
  const mission=parseMissionId(params.id); if(!mission)return missingMission(request);
  const cache=(caches as CacheStorage & { default: Cache }).default;
  return cachedMissionImage(request, mission, cache, async () => {
    const status=mission.settled?'SETTLED':'RETURNED';
    // Rendering-only styles never enter an HTML response. All text comes from the strict ID parser.
    const element={type:'div',props:{style:{display:'flex',width:1200,height:630,background:'#E9E8E3',color:'#0E0E0E',fontFamily:'MuleMono',padding:60,alignItems:'center',border:'3px solid #0E0E0E'},children:[
      {type:'img',props:{width:340,height:374,src:`data:image/svg+xml;base64,${btoa(patchSilhouette(mission.settled,true))}`}},
      {type:'div',props:{style:{display:'flex',flexDirection:'column',paddingLeft:50},children:[
        {type:'div',props:{style:{fontSize:22,color:'#A83200',marginBottom:38},children:'MULE / MISSION PATCH'}},
        {type:'div',props:{style:{fontSize:60},children:mission.mission}},
        {type:'div',props:{style:{fontSize:44,marginTop:10,marginBottom:34},children:status}},
        {type:'div',props:{style:{fontSize:25},children:mission.template}},
        {type:'div',props:{style:{fontSize:22,marginTop:14},children:mission.date}},
        {type:'div',props:{style:{fontSize:18,color:'#A83200',marginTop:45},children:'SIMULATION · NO REAL FUNDS'}},
      ]}},
    ]}};
    const image=new ImageResponse(element,{width:1200,height:630,fonts:[{name:'MuleMono',data:monoFont,weight:400,style:'normal'}]});
    // Materialize so renderer failures cannot masquerade as a successful streamed PNG.
    return new Response(await image.arrayBuffer(),{headers:missionHeaders(request,{'Content-Type':'image/png','Cache-Control':'public, max-age=86400, s-maxage=604800'})});
  });
};
