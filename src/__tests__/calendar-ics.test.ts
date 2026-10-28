import { describe, it, expect } from 'vitest';
import {
  daysUntil, countdownLabel, buildIcs, buildGoogleCalendarUrl, escapeIcsText, formatFechaLargaEs,
} from '../lib/calendar';

/** DTSTAMP fijo para que el .ics sea determinista. */
const STAMP = new Date(Date.UTC(2026, 9, 28, 13, 0, 0));

describe('daysUntil', () => {
  it('cuenta días de calendario, no horas', () => {
    expect(daysUntil('2026-10-28', new Date(2026, 9, 28, 23, 59))).toBe(0);
    expect(daysUntil('2026-10-29', new Date(2026, 9, 28, 23, 59))).toBe(1);
    expect(daysUntil('2026-10-31', new Date(2026, 9, 28, 0, 1))).toBe(3);
  });

  it('cruza meses y devuelve negativos para fechas pasadas', () => {
    expect(daysUntil('2026-11-02', new Date(2026, 9, 30, 8, 0))).toBe(3);
    expect(daysUntil('2027-01-01', new Date(2026, 11, 31, 20, 0))).toBe(1);
    expect(daysUntil('2026-10-18', new Date(2026, 9, 28, 12, 0))).toBe(-10);
  });

  it('acepta la fecha de referencia como ISO (YYYY-MM-DD)', () => {
    expect(daysUntil('2026-10-29', '2026-10-28')).toBe(1);
    expect(daysUntil('2026-10-28', '2026-10-28T22:15:00-05:00')).toBe(0);
  });

  it('devuelve null si alguna fecha no es válida', () => {
    expect(daysUntil('2026-02-30', new Date(2026, 1, 1))).toBeNull();
    expect(daysUntil('18/10/2026', new Date(2026, 9, 1))).toBeNull();
    expect(daysUntil('2026-10-18', new Date(NaN))).toBeNull();
  });
});

describe('countdownLabel', () => {
  const today = new Date(2026, 9, 28, 9, 0);

  it('usa lenguaje natural en español', () => {
    expect(countdownLabel('2026-10-28', today)).toBe('Hoy');
    expect(countdownLabel('2026-10-29', today)).toBe('Mañana');
    expect(countdownLabel('2026-10-31', today)).toBe('Faltan 3 días');
    expect(countdownLabel('2026-10-27', today)).toBe('Fue ayer');
    expect(countdownLabel('2026-10-18', today)).toBe('Hace 10 días');
  });

  it('tolera fechas ausentes o inválidas', () => {
    expect(countdownLabel(null, today)).toBeNull();
    expect(countdownLabel('', today)).toBeNull();
    expect(countdownLabel('sin-fecha', today)).toBeNull();
  });
});

describe('formatFechaLargaEs', () => {
  it('devuelve la fecha larga en español', () => {
    const text = formatFechaLargaEs('2026-10-18');
    expect(text.toLowerCase()).toContain('octubre');
    expect(text).toContain('2026');
    expect(text).toContain('18');
  });

  it('es tolerante a valores nulos', () => {
    expect(formatFechaLargaEs(null)).toBe('Fecha por confirmar');
  });
});

describe('escapeIcsText (RFC 5545)', () => {
  it('escapa comas, punto y coma, barras y saltos de línea', () => {
    expect(escapeIcsText('Baños del Inca, Cajamarca; oficina')).toBe('Baños del Inca\\, Cajamarca\\; oficina');
    expect(escapeIcsText('linea 1\nlinea 2')).toBe('linea 1\\nlinea 2');
    expect(escapeIcsText('linea 1\r\nlinea 2')).toBe('linea 1\\nlinea 2');
    expect(escapeIcsText('C:\\ruta\\tour')).toBe('C:\\\\ruta\\\\tour');
  });
});

describe('buildIcs', () => {
  it('genera un evento con hora local de Lima y dos recordatorios', () => {
    const ics = buildIcs({
      uid: 'req-123',
      title: 'Tour a Baños del Inca, con guía',
      date: '2026-10-18',
      time: '07:00',
      durationMinutes: 480,
      location: 'Jr. Dos de Mayo 569; oficina',
      description: 'Salida puntual.\nLlevar abrigo, agua',
      stamp: STAMP,
    });

    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('BEGIN:VTIMEZONE\r\n');
    expect(ics).toContain('TZID:America/Lima\r\n');
    expect(ics).toContain('UID:req-123@cajamarcatours\r\n');
    expect(ics).toContain('DTSTAMP:20261028T130000Z\r\n');
    expect(ics).toContain('DTSTART;TZID=America/Lima:20261018T070000\r\n');
    expect(ics).toContain('DTEND;TZID=America/Lima:20261018T150000\r\n');
    expect(ics).toContain('SUMMARY:Tour a Baños del Inca\\, con guía\r\n');
    expect(ics).toContain('LOCATION:Jr. Dos de Mayo 569\\; oficina\r\n');
    expect(ics).toContain('DESCRIPTION:Salida puntual.\\nLlevar abrigo\\, agua\r\n');
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics).toContain('TRIGGER:-P1D\r\n');
    expect(ics).toContain('TRIGGER:-PT2H\r\n');
    expect(ics).toContain('STATUS:CONFIRMED\r\n');
    // Ninguna línea puede terminar en LF suelto (RFC 5545 exige CRLF).
    expect(/(^|[^\r])\n/.test(ics)).toBe(false);
  });

  it('sin hora genera un evento de día completo con DTEND al día siguiente', () => {
    const ics = buildIcs({
      uid: 'req-456',
      title: 'Tour de día completo',
      date: '2026-12-31',
      time: null,
      stamp: STAMP,
    });

    expect(ics).toContain('DTSTART;VALUE=DATE:20261231\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101\r\n');
    expect(ics).not.toContain('DTSTART;TZID=America/Lima:20261231');
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
  });

  it('rechaza fechas imposibles', () => {
    expect(() => buildIcs({ uid: 'x', title: 'Tour', date: '2026-02-30', stamp: STAMP }))
      .toThrow(/Fecha inválida/);
  });

  it('pliega las líneas largas a 75 octetos UTF-8 sin partir caracteres', () => {
    const longTitle = `Tour a los Baños del Inca ${'con guía y almuerzo '.repeat(6)}ñ`;
    const ics = buildIcs({ uid: 'req-789', title: longTitle, date: '2026-10-18', stamp: STAMP });
    const physicalLines = ics.split('\r\n');

    for (const line of physicalLines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    // Al desplegar (quitar CRLF + espacio) se recupera el valor completo.
    expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${longTitle}`);
    expect(ics).toContain('\r\n ');
  });
});

describe('buildGoogleCalendarUrl', () => {
  it('incluye fechas, título y zona horaria de Lima', () => {
    const url = buildGoogleCalendarUrl({
      uid: 'req-123',
      title: 'Tour a Baños del Inca, con guía',
      date: '2026-10-18',
      time: '07:00',
      durationMinutes: 480,
      location: 'Jr. Dos de Mayo 569',
    });

    expect(url.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE&')).toBe(true);
    expect(url).toContain('dates=20261018T070000/20261018T150000');
    expect(url).toContain('ctz=America%2FLima');
    expect(url).toContain('text=Tour%20a%20Ba%C3%B1os%20del%20Inca%2C%20con%20gu%C3%ADa');
    expect(url).toContain('location=Jr.%20Dos%20de%20Mayo%20569');
  });

  it('sin hora usa un rango de día completo', () => {
    const url = buildGoogleCalendarUrl({ uid: 'x', title: 'Tour', date: '2026-12-31', time: '' });
    expect(url).toContain('dates=20261231/20270101');
    expect(url).not.toContain('ctz=');
  });
});
