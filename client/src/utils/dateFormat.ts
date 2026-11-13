const berlin = (value: string | Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', ...options }).format(new Date(value));

export const formatBerlinDate = (value: string | Date) => berlin(value, { day: '2-digit', month: '2-digit', year: 'numeric' });
export const formatBerlinTime = (value: string | Date) => berlin(value, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const formatBerlinDateTime = (value: string | Date) => berlin(value, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function toBerlinDateTimeInput(value?: string | null) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** Convert a datetime-local value that represents Berlin wall time into UTC. */
export function berlinInputToISOString(value: string) {
  const wallAsUtc = new Date(`${value}:00Z`);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(wallAsUtc);
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value || 0);
  const berlinWallAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  const offset = berlinWallAsUtc - wallAsUtc.getTime();
  return new Date(wallAsUtc.getTime() - offset).toISOString();
}
