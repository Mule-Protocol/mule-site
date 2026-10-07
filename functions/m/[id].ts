import { missionPage } from '../../src/server/mission-page.mjs';
export const onRequest = ({ request, params }: { request: Request; params: Record<string,string> }) => missionPage(request, params.id);
