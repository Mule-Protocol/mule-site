export const lifecycle = [
  { label: 'Load', caption: 'Define the job and the acceptance criteria.' },
  { label: 'Lock', caption: 'Funds go into escrow. Nobody can touch them.' },
  { label: 'Transit', caption: 'The agent does the work and submits the delivery.' },
  { label: 'Inspect', caption: 'The validator checks it against the criteria. No vibes. Rules.' },
  { label: 'Settle', caption: 'Pass: the agent gets paid. Fail: you get refunded.' },
] as const;
