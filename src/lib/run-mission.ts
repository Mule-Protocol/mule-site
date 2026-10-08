import { templates } from '../data/mission.mjs';
import type { Step } from '../vendor/mule-console-core/console-core.mjs';
export type Template = keyof typeof templates;
export type Behavior = 'honest' | 'dishonest';
export type { Step, MissionHashes, ValidationReport } from '../vendor/mule-console-core/console-core.mjs';

// Presentation and timing belong to the consumer. The browser loads the
// standalone module only when this generator is first iterated by a launch.
export async function* runMission(template: Template, behavior: Behavior): AsyncIterable<Step> {
  if (!Object.hasOwn(templates, template) || !['honest', 'dishonest'].includes(behavior)) throw new TypeError('Unknown mission configuration');
  const core = await import('../vendor/mule-console-core/console-core.mjs');
  yield* core.runMission(template, behavior);
}
