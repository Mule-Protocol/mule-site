export const lifecycle = [
  { label: 'Load', caption: 'Define the job and the acceptance criteria.', annotation: 'CRITERIA: SCHEMA V1' },
  { label: 'Lock', caption: 'Funds go into escrow. Nobody can touch them.', annotation: 'LOCKED' },
  { label: 'Transit', caption: 'The agent does the work and submits the delivery.', annotation: 'LOCKED · IN TRANSIT' },
  { label: 'Inspect', caption: 'The validator checks it against the criteria. No vibes. Rules.', annotation: 'LOCKED · 6/6 FIELDS ✓' },
  { label: 'Settle', caption: 'Pass: the agent gets paid. Fail: you get refunded.', annotation: 'PASS: SETTLED ✓ / FAIL: RETURNED' },
] as const;
