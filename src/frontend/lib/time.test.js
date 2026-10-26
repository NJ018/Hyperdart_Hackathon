import { describe, expect, it } from 'vitest';
import { formatDuration, formatInstant, formatTime, freshness, isoOffsetMinutes, relative, zoneOffsetMinutes } from './time.js';

const NOW = Date.parse('2026-10-26T07:10:00Z'); // 2:10 AM CDT, Monday

describe('time', () => {
  it('reads the offset inside NWS timestamps', () => {
    expect(isoOffsetMinutes('2026-10-26T03:45:00-06:00')).toBe(-360);
    expect(isoOffsetMinutes('2026-10-26T03:45:00+05:30')).toBe(330);
    expect(isoOffsetMinutes('2026-10-26T03:45:00Z')).toBe(0);
    expect(isoOffsetMinutes('nonsense')).toBeNull();
  });

  it('knows zone offsets including DST', () => {
    expect(zoneOffsetMinutes('America/Chicago', NOW)).toBe(-300); // CDT
    expect(zoneOffsetMinutes('America/Chicago', Date.parse('2026-12-01T12:00:00Z'))).toBe(-360); // CST
    expect(zoneOffsetMinutes('America/Phoenix', NOW)).toBe(-420); // no DST
  });

  it('formats in the place time zone with its abbreviation', () => {
    expect(formatTime('2026-10-26T21:45:00-05:00', { tz: 'America/Chicago', now: NOW })).toBe('9:45 PM CDT');
    expect(formatTime('2026-10-27T03:00:00-05:00', { tz: 'America/Chicago', now: NOW })).toBe('tomorrow 3:00 AM CDT');
    expect(formatTime('2026-10-28T14:00:00-05:00', { tz: 'America/Chicago', now: NOW })).toBe('Wed 2:00 PM CDT');
  });

  it('an alert on another zone than the place (El Paso in a Texas query) uses its own offset, labelled local time', () => {
    expect(formatTime('2026-10-26T03:45:00-06:00', { tz: 'America/Chicago', now: NOW })).toBe('3:45 AM local time');
  });

  it('without a zone, uses the offset in the timestamp', () => {
    expect(formatTime('2026-10-26T17:00:00-04:00', { now: NOW })).toBe('5:00 PM local time');
  });

  it('formats a plain instant in the place zone, or at a given offset', () => {
    expect(formatTime(Date.parse('2026-10-27T02:00:00Z'), { tz: 'America/Chicago', now: NOW })).toBe('9:00 PM CDT');
    expect(formatTime(Date.parse('2026-10-27T02:00:00Z'), { offset: -360, now: NOW })).toBe('8:00 PM local time');
  });

  it('formats our own check time in the place zone', () => {
    expect(formatInstant(NOW, { tz: 'America/Chicago' })).toBe('2:10 AM CDT');
  });

  it('writes relative durations', () => {
    expect(formatDuration(45 * 60_000)).toBe('45 min');
    expect(formatDuration(130 * 60_000)).toBe('2 h 10 m');
    expect(formatDuration(120 * 60_000)).toBe('2 h');
    expect(formatDuration(3 * 24 * 3600_000)).toBe('3 days');
    expect(relative('2026-10-26T09:20:00Z', NOW)).toBe('in 2 h 10 m');
    expect(relative('2026-10-26T06:55:00Z', NOW)).toBe('15 min ago');
    expect(freshness(NOW - 10_000, NOW)).toBe('Updated just now');
    expect(freshness(NOW - 180_000, NOW)).toBe('Updated 3 min ago');
  });
});
