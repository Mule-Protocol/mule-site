/**
 * Site-consumed subset of the public types from Mule-Protocol/mule.
 * Source commit: ecfb8350e6ede380eb2ad83174576ef6580562e1
 * This declaration does not alter the vendored executable module.
 */
export type Template = 'invoice' | 'contract' | 'address';
export type Behavior = 'honest' | 'dishonest';
export interface MissionHashes { criteria: string; delivery: string; report: string }
export interface ValidationReport {
  mission: string;
  schema: 'invoice.v1' | 'contract.v1' | 'address.v1';
  results: Array<{ check: string; pass: boolean; detail: string }>;
  pass: boolean;
  message: string;
  agent: 'agent de référence scripté';
  criteria_hash?: string;
  delivery_hash?: string;
}
export interface Step {
  station: 1 | 2 | 3 | 4 | 5;
  text: string;
  failed?: boolean;
  outcome?: 'settled' | 'returned';
  hashes?: MissionHashes;
  report?: ValidationReport;
}
export function runMission(template: Template, behavior: Behavior): AsyncIterable<Step>;
