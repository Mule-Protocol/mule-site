import { missionCounter, type MissionCounterEnv } from '../../src/server/mission-counter';

export const onRequest = ({ request, env }: { request: Request; env: MissionCounterEnv }) => missionCounter(request, env);
