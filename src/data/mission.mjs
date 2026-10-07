// This allowlist is shared by the browser and both public Pages Functions.
export const templates = Object.freeze({
  invoice: { code: 'inv', name: 'Invoice to JSON', ok: '6/6 FIELDS VALID', bad: '5/6 · MISSING: total_amount' },
  contract: { code: 'con', name: 'Contract summary', ok: '5/5 FIELDS VALID', bad: '4/5 · MISSING: governing_law' },
  address: { code: 'adr', name: 'Address normalization', ok: '12/12 ROWS VALID', bad: '11/12 · INVALID POSTCODE, ROW 7' },
});

export function parseMissionId(value) {
  if (typeof value !== 'string' || value.length !== 19) return null;
  const match = /^([0-9]{4})-(s|r)-(inv|con|adr)-([0-9]{4})([0-9]{2})([0-9]{2})$/.exec(value);
  if (!match) return null;
  const [, number, status, code, year, month, day] = match;
  if (Number(year) < 2026 || Number(year) > 2099) return null;
  const date = `${year}-${month}-${day}`;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const template = Object.values(templates).find(item => item.code === code);
  return Object.freeze({ id: value, number, mission: `MSN-${number}`, status, settled: status === 's', template: template.name, code, date });
}

export function missionId(number, settled, template, date = new Date()) {
  const day = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const id = `${String(number).padStart(4, '0')}-${settled ? 's' : 'r'}-${templates[template]?.code}-${day}`;
  if (!parseMissionId(id)) throw new RangeError('Invalid mission identifier');
  return id;
}
