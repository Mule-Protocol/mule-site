import { templates } from '../data/mission.mjs';
export type Template = keyof typeof templates;
export type Behavior = 'honest' | 'dishonest';
export interface Step { station: 1 | 2 | 3 | 4 | 5; text: string; failed?: boolean; outcome?: 'settled' | 'returned' }

// M-1 replaces this implementation; presentation and timing belong to the consumer.
// No network, wallet, storage, real hashes or user-provided content.
export async function* runMission(template: Template, behavior: Behavior): AsyncIterable<Step> {
  if (!Object.hasOwn(templates, template) || !['honest', 'dishonest'].includes(behavior)) throw new TypeError('Unknown mission configuration');
  const selected = templates[template];
  const honest = behavior === 'honest';
  const fake = (kind: string) => `FAKE_${kind}_SIM_${Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2,'0')).join('')}`;
  yield { station: 1, text: `ESCROW LOCKED · 5.00 dUSDC · ${fake('TX')}` };
  yield { station: 2, text: `MISSION ACCEPTED · AGENT MULE-01 · ${selected.name.toUpperCase()}` };
  yield { station: 3, text: `DELIVERY SUBMITTED · ${fake('HASH')}` };
  yield { station: 4, text: `INSPECTION · ${honest ? selected.ok : selected.bad}`, failed: !honest };
  yield { station: 5, text: `${honest ? 'SETTLED · 5.00 dUSDC PAID TO AGENT' : 'RETURNED · 5.00 dUSDC REFUNDED TO CLIENT'} · ${fake('TX')}`, failed: !honest, outcome: honest ? 'settled' : 'returned' };
}
