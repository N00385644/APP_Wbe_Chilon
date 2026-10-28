import { describe, expect, it } from 'vitest';
import {
  buildTripWhatsAppMessage,
  buildWhatsAppUrl,
  computeOverviewStats,
  countSeats,
  dayOffset,
  formatDateLabel,
  groupUpcomingDepartures,
  limaDateKey,
  missingLogistics,
  normalizeWhatsAppPhone,
  type AdminRequest,
} from '../features/admin/lib/adminUtils';
import type { TourRequest } from '../lib/types';

function request(overrides: Partial<AdminRequest> = {}): AdminRequest {
  return {
    id: 'req-1',
    user_id: 'user-1',
    tour_id: null,
    requested_destination: 'Cumbemayo',
    preferred_date: null,
    date_is_flexible: false,
    adults: 1,
    children: 0,
    travelers_count: 1,
    contact_phone: '901 195 392',
    additional_notes: null,
    status: 'pending',
    admin_notes: null,
    created_at: '2026-10-01T12:00:00Z',
    confirmed_date: null,
    departure_time: null,
    meeting_point: null,
    departure_notes: null,
    requested_seats: null,
    confirmed_seats: null,
    reminder_sent_at: null,
    ...overrides,
  } satisfies AdminRequest & TourRequest;
}

describe('fechas en America/Lima', () => {
  it('usa el día de Lima, no el día UTC', () => {
    expect(limaDateKey(new Date('2026-10-28T02:30:00Z'))).toBe('2026-10-27');
    expect(limaDateKey(new Date('2026-10-28T15:00:00Z'))).toBe('2026-10-28');
    expect(limaDateKey('2026-10-28T23:00:00Z')).toBe('2026-10-28');
  });

  it('calcula offsets de calendario con hoy en Lima', () => {
    expect(dayOffset('2026-10-29', '2026-10-28')).toBe(1);
    expect(dayOffset('2026-10-27', '2026-10-28')).toBe(-1);
    expect(dayOffset('2026-11-04', '2026-10-28')).toBe(7);
    expect(dayOffset('sin-fecha', '2026-10-28')).toBeNull();
    // 02:30 UTC del 28 = 21:30 del 27 en Lima.
    expect(dayOffset('2026-10-28', new Date('2026-10-28T02:30:00Z'))).toBe(1);
  });

  it('formatea la fecha sin desplazarla de zona', () => {
    expect(formatDateLabel('2026-10-30')).toContain('30 de octubre');
  });
});

describe('agrupación de próximas salidas', () => {
  const today = '2026-10-28';
  const rows = [
    request({ id: 'hoy-tarde', status: 'confirmed', confirmed_date: '2026-10-28', departure_time: '09:00:00' }),
    request({ id: 'hoy-temprano', status: 'confirmed', confirmed_date: '2026-10-28', departure_time: '06:00:00' }),
    request({ id: 'manana', status: 'confirmed', confirmed_date: '2026-10-29' }),
    request({ id: 'semana', status: 'confirmed', confirmed_date: '2026-10-31' }),
    request({ id: 'fuera', status: 'confirmed', confirmed_date: '2026-11-04' }),
    request({ id: 'pasado', status: 'confirmed', confirmed_date: '2026-10-27' }),
    request({ id: 'pendiente', status: 'pending', confirmed_date: '2026-10-28' }),
    request({ id: 'sin-fecha', status: 'confirmed' }),
  ];

  it('separa hoy, mañana y resto de la semana y ordena por hora', () => {
    const groups = groupUpcomingDepartures(rows, today);
    expect(groups.map((g) => g.key)).toEqual(['today', 'tomorrow', 'week']);
    expect(groups[0].items.map((r) => r.id)).toEqual(['hoy-temprano', 'hoy-tarde']);
    expect(groups[1].items.map((r) => r.id)).toEqual(['manana']);
    expect(groups[2].items.map((r) => r.id)).toEqual(['semana']);
  });

  it('excluye pasadas, canceladas y fuera del horizonte', () => {
    const ids = groupUpcomingDepartures(rows, today).flatMap((g) => g.items.map((r) => r.id));
    expect(ids).not.toContain('fuera');
    expect(ids).not.toContain('pasado');
    expect(ids).not.toContain('pendiente');
    expect(ids).not.toContain('sin-fecha');
  });
});

describe('logística y asientos', () => {
  it('detecta los campos de logística que faltan', () => {
    expect(missingLogistics({ confirmed_date: '2026-10-28', departure_time: '07:00', meeting_point: 'Oficina' })).toEqual([]);
    expect(missingLogistics({ confirmed_date: null, departure_time: null, meeting_point: '  ' })).toEqual([
      'fecha', 'hora', 'punto de encuentro',
    ]);
    expect(missingLogistics({ confirmed_date: '2026-10-28', departure_time: '07:00', meeting_point: null })).toEqual([
      'punto de encuentro',
    ]);
  });

  it('cuenta asientos individuales, listas y rangos', () => {
    expect(countSeats('03, 04')).toBe(2);
    expect(countSeats('01-04')).toBe(4);
    expect(countSeats('3 y 4')).toBe(2);
    expect(countSeats('05')).toBe(1);
    expect(countSeats('A1; A2')).toBe(2);
    expect(countSeats('')).toBe(0);
    expect(countSeats(null)).toBe(0);
  });
});

describe('teléfono y WhatsApp', () => {
  it('normaliza al formato internacional 51XXXXXXXXX', () => {
    expect(normalizeWhatsAppPhone('901 195 392')).toBe('51901195392');
    expect(normalizeWhatsAppPhone('+51 901 195 392')).toBe('51901195392');
    expect(normalizeWhatsAppPhone('0051 901 195 392')).toBe('51901195392');
    expect(normalizeWhatsAppPhone('(076) 123-456')).toBe('5176123456');
    expect(normalizeWhatsAppPhone('')).toBeNull();
    expect(normalizeWhatsAppPhone('abc')).toBeNull();
    expect(normalizeWhatsAppPhone(null)).toBeNull();
  });

  it('construye el deep link con el mensaje codificado', () => {
    const message = 'Hola, ¿cómo estás?';
    const url = buildWhatsAppUrl('901 195 392', message);
    expect(url).toBe(`https://wa.me/51901195392?text=${encodeURIComponent(message)}`);
    expect(buildWhatsAppUrl(null, message)).toBeNull();
  });

  it('incluye tour, fecha, hora, punto, asientos y referencia', () => {
    const message = buildTripWhatsAppMessage(request({
      status: 'confirmed',
      confirmed_date: '2026-10-30',
      departure_time: '07:15:00',
      meeting_point: 'Jr. Dos de Mayo 569',
      confirmed_seats: '03, 04',
      travelers_count: 2,
      tours: { title: 'Cumbemayo Full Day' },
    }));
    expect(message).toContain('Tour: Cumbemayo Full Day');
    expect(message).toContain('30 de octubre');
    expect(message).toContain('Hora de salida: 07:15');
    expect(message).toContain('Punto de encuentro: Jr. Dos de Mayo 569');
    expect(message).toContain('Asiento(s): 03, 04');
    expect(message).toContain('Viajeros: 2');
    expect(message).toContain('#req-1');
  });
});

describe('contadores del resumen', () => {
  it('cuenta pendientes, confirmadas de 7 días y pasajeros/asientos', () => {
    const rows = [
      request({ id: 'p1', status: 'pending' }),
      request({ id: 'r1', status: 'in_review' }),
      request({
        id: 'c-hoy', status: 'confirmed', confirmed_date: '2026-10-28',
        departure_time: '07:00', meeting_point: 'Oficina', travelers_count: 2,
        confirmed_seats: '01-03',
      }),
      request({
        id: 'c-semana', status: 'confirmed', confirmed_date: '2026-10-30',
        travelers_count: 3, confirmed_seats: '04, 05',
      }),
      request({
        id: 'c-fuera', status: 'confirmed', confirmed_date: '2026-11-10',
        departure_time: '07:00', meeting_point: 'Oficina', travelers_count: 4,
      }),
      request({ id: 'c-sin-fecha', status: 'confirmed', departure_time: '07:00', meeting_point: 'Oficina' }),
      request({ id: 'cancelada', status: 'cancelled' }),
    ];

    const stats = computeOverviewStats(rows, '2026-10-28');
    expect(stats.pending).toBe(1);
    expect(stats.inReview).toBe(1);
    expect(stats.unattended).toBe(2);
    expect(stats.confirmedNext7).toBe(2);
    expect(stats.weekTravelers).toBe(5);
    expect(stats.weekSeats).toBe(5);
    expect(stats.incompleteLogistics.map((r) => r.id).sort()).toEqual(['c-semana', 'c-sin-fecha']);
    expect(stats.upcoming[0].items.map((r) => r.id)).toEqual(['c-hoy']);
    expect(stats.upcoming[1].items).toHaveLength(0);
    expect(stats.upcoming[2].items.map((r) => r.id)).toEqual(['c-semana']);
  });
});
