import { describe, it, expect } from 'vitest';
import {
  buildMonthGrid, shiftMonth, toISODate, formatHoraEs, formatFechaCortaEs,
} from '../lib/calendar';

describe('calendario de tours', () => {
  it('el grid del mes empieza en lunes y contiene todos los días', () => {
    // Octubre 2026: 31 días, empieza en jueves.
    const weeks = buildMonthGrid(2026, 9);
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(6);
    for (const w of weeks) expect(w.length).toBe(7);
    const days = weeks.flat().filter(Boolean);
    expect(days.length).toBe(31);
    // El 1 de octubre debe caer en la celda 3 (ju) de la primera semana.
    expect(weeks[0][3]?.date.getDate()).toBe(1);
    expect(days[days.length - 1]?.date.getDate()).toBe(31);
  });

  it('busca correctamente un tour en su fecha ISO', () => {
    const weeks = buildMonthGrid(2026, 9);
    const cell = weeks.flat().find((c) => c?.iso === '2026-10-18');
    expect(cell?.date.getDate()).toBe(18);
  });

  it('toISODate no depende de la zona horaria', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('shiftMonth cruza de año', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it('formatHoraEs muestra 12 h en español', () => {
    expect(formatHoraEs('07:00:00')).toBe('7:00 a. m.');
    expect(formatHoraEs('13:30')).toBe('1:30 p. m.');
    expect(formatHoraEs('12:00')).toBe('12:00 p. m.');
    expect(formatHoraEs('00:15')).toBe('12:15 a. m.');
    expect(formatHoraEs(null)).toBe('—');
  });

  it('formatFechaCortaEs es tolerante a valores nulos', () => {
    expect(formatFechaCortaEs(null)).toBe('—');
    expect(formatFechaCortaEs('2026-10-18')).toContain('18');
  });
});
