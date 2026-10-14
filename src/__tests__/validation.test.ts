import { describe, it, expect } from 'vitest';
import {
  LIMITS,
  buildTourRequestPayload,
  createSubmitGuard,
  normalizeText,
  todayLimaISO,
  totalTravelers,
  validateBookingDraft,
  validateDestination,
  validateName,
  validateNotes,
  validatePhoneOptional,
  validatePreferredDate,
  validateTravelers,
} from '../schemas/requests';
import { bookingMissing, bookingSummary, isExactPax } from '../features/chatbot/engine/chatTree';
import * as chatTree from '../features/chatbot/engine/chatTree';
import { friendlySaveError } from '../services/requests';

// Mediodía en Lima del 2026-10-14 (fijo para pruebas deterministas).
const NOW = new Date('2026-10-14T15:00:00Z');

describe('nombres (Fase B: tildes y formatos internacionales válidos)', () => {
  it('rechaza vacío o solo espacios', () => {
    expect(validateName('').error).toBeTruthy();
    expect(validateName('   ').error).toBeTruthy();
  });
  it('normaliza espacios adicionales', () => {
    expect(validateName('  María   José  ').value).toBe('María José');
  });
  it('acepta tildes, apóstrofos, guiones y ñ', () => {
    for (const n of ['José María', "O'Brien", 'Anne-Marie', 'Ñoño Pérez', 'Zoë Müller', 'Li Wei']) {
      expect(validateName(n).error, n).toBeNull();
    }
  });
  it('respeta longitud máxima sin rechazar de más', () => {
    const largo = 'A'.repeat(200);
    const r = validateName(largo);
    expect(r.error).toBeNull();
    expect([...r.value!].length).toBeLessThanOrEqual(LIMITS.name);
  });
});

describe('destino (obligatorio, sin basura)', () => {
  it('rechaza vacío o solo espacios', () => {
    expect(validateDestination('').error).toBeTruthy();
    expect(validateDestination('    ').error).toBeTruthy();
  });
  it('normaliza y recorta a 200', () => {
    expect(validateDestination('  Cumbemayo   ').value).toBe('Cumbemayo');
    expect(validateDestination('x'.repeat(500).valueOf()).value!.length).toBeLessThanOrEqual(200);
  });
});

describe('teléfono opcional (no se vuelve obligatorio)', () => {
  it('vacío sigue válido -> null', () => {
    expect(validatePhoneOptional('')).toEqual({ value: null, error: null });
    expect(validatePhoneOptional(null)).toEqual({ value: null, error: null });
  });
  it('rechaza letras con ayuda para corregir', () => {
    const r = validatePhoneOptional('abc123456');
    expect(r.error).toMatch(/letras/);
  });
  it('exige 7..20 dígitos', () => {
    expect(validatePhoneOptional('123456').error).toBeTruthy();
    expect(validatePhoneOptional('1'.repeat(21)).error).toBeTruthy();
    expect(validatePhoneOptional('1234567').error).toBeNull();
  });
  it('acepta formato peruano e internacional', () => {
    expect(validatePhoneOptional('+51 901 195 392').error).toBeNull();
    expect(validatePhoneOptional('(01) 234-5678').error).toBeNull();
  });
});

describe('observaciones (opcionales, acotadas)', () => {
  it('vacías -> null y largas se recortan', () => {
    expect(validateNotes('')).toBeNull();
    expect(validateNotes('   ')).toBeNull();
    expect(validateNotes('x'.repeat(5000))!.length).toBeLessThanOrEqual(2000);
  });
});

describe('fechas (concreta vs flexible vs ausente, zona Lima)', () => {
  it('rechaza formato inválido con ayuda', () => {
    for (const f of ['20-11-2026', '2026/11/20', 'mañana', '2026-13-01', '2026-02-30']) {
      expect(validatePreferredDate(f, { now: NOW }).error, f).toBeTruthy();
    }
  });
  it('rechaza fecha pasada en America/Lima', () => {
    expect(todayLimaISO(NOW)).toBe('2026-10-14');
    const r = validatePreferredDate('2026-10-13', { now: NOW });
    expect(r.error).toMatch(/pasó/);
  });
  it('acepta hoy y futuro', () => {
    expect(validatePreferredDate('2026-10-14', { now: NOW })).toEqual({ value: '2026-10-14', flexible: false, error: null });
    expect(validatePreferredDate('2026-11-20', { now: NOW }).value).toBe('2026-11-20');
  });
  it('distingue flexible de ausente (nunca fecha ficticia)', () => {
    expect(validatePreferredDate(null, { flexible: true })).toEqual({ value: null, flexible: true, error: null });
    expect(validatePreferredDate('', {})).toEqual({ value: null, flexible: false, error: null });
  });
});

describe('viajeros (enteros estrictos, total único)', () => {
  it('rechaza negativos, decimales y basura', () => {
    expect(validateTravelers(-1, 0).errors.adults).toBeTruthy();
    expect(validateTravelers(2.5, 0).errors.adults).toBeTruthy();
    expect(validateTravelers('abc', 0).errors.adults).toBeTruthy();
    expect(validateTravelers(2, -1).errors.children).toBeTruthy();
    expect(validateTravelers(2, '1.5').errors.children).toBeTruthy();
  });
  it('acepta coherentes y calcula el total con la regla única', () => {
    const r = validateTravelers(2, 1);
    expect(r.errors).toEqual({});
    expect(totalTravelers(r.adults, r.children)).toBe(3);
  });
  it('los topes por campo garantizan el tope de la base de datos (total <= 100)', () => {
    const r = validateTravelers(50, 50);
    expect(r.errors).toEqual({});
    expect(totalTravelers(r.adults, r.children)).toBeLessThanOrEqual(100);
    expect(validateTravelers(51, 0).errors.adults).toMatch(/50/);
  });
});

describe('borrador completo (resumen == payload)', () => {
  const base = {
    requested_destination: '  Cumbemayo  ',
    preferred_date: '2026-11-20',
    adults: 2,
    children: 1,
    contact_phone: '+51 901 195 392',
    additional_notes: '  Llevo abrigo  ',
  };
  it('normaliza y el resumen muestra lo que irá a Supabase', () => {
    const checked = validateBookingDraft(base, NOW);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const summary = bookingSummary({
      ...base,
      requested_destination: checked.payload.requested_destination ?? undefined,
      contact_phone: checked.payload.contact_phone ?? undefined,
      additional_notes: checked.payload.additional_notes ?? undefined,
    });
    expect(summary).toContain('Cumbemayo');
    expect(summary).toContain('2026-11-20');
    expect(summary).toContain('Viajeros: 3 (adultos: 2, menores: 1)');
    const payload = buildTourRequestPayload({ userId: 'u1', draft: base, tourId: null });
    expect(payload.travelers_count).toBe(3);
    expect(payload.requested_destination).toBe('Cumbemayo');
    expect(payload.status).toBe('pending');
  });
  it(' flexible sin fecha concreta es válido', () => {
    const checked = validateBookingDraft({ ...base, preferred_date: null, date_is_flexible: true }, NOW);
    expect(checked.ok).toBe(true);
  });
  it('destino libre (tour_id null) sigue válido', () => {
    const p = buildTourRequestPayload({ userId: 'u1', draft: { ...base, preferred_date: '2026-11-20' }, tourId: null });
    expect(p.tour_id).toBeNull();
    expect(p.requested_destination).toBe('Cumbemayo');
  });
});

describe('árbol: rangos exigen número exacto (sin inventar)', () => {
  it('paxToNumbers legacy fue retirado (transición Fase 4)', () => {
    expect('paxToNumbers' in chatTree).toBe(false);
  });
  it('solo 1 y 2 son exactos', () => {
    expect(isExactPax('1')).toBe(true);
    expect(isExactPax('2')).toBe(true);
    expect(isExactPax('3-5')).toBe(false);
    expect(isExactPax('6+')).toBe(false);
  });
  it('rango sin exacto aparece en faltantes', () => {
    const m = bookingMissing(
      { requested_destination: 'X', preferred_date: '2026-11-20', pax_range: '3-5', pax_confirmed: false, adults: undefined, children: undefined },
      NOW,
    );
    expect(m).toContain('número exacto de viajeros');
  });
  it('rango confirmado con exacto no falta', () => {
    const m = bookingMissing(
      { requested_destination: 'X', preferred_date: '2026-11-20', pax_range: '3-5', pax_confirmed: true, adults: 4, children: 0 },
      NOW,
    );
    expect(m).toEqual([]);
  });
  it('rango sin exacto no pasa la validación de borrador (adultos requeridos)', () => {
    const checked = validateBookingDraft(
      { requested_destination: 'X', preferred_date: '2026-11-20', pax_range: '3-5', pax_confirmed: false },
      NOW,
    );
    expect(checked.ok).toBe(false);
    if (!checked.ok) expect(checked.errors.adults).toBeTruthy();
  });
});

describe('árbol: faltantes con mensajes útiles', () => {
  it('detecta destino en blanco, fecha inválida y pasada', () => {
    expect(bookingMissing({ requested_destination: '   ' }, NOW)).toContain('destino');
    expect(bookingMissing({ requested_destination: 'X', preferred_date: 'ayer' }, NOW)).toContain('fecha inválida (usa AAAA-MM-DD)');
    expect(bookingMissing({ requested_destination: 'X', preferred_date: '2026-10-01' }, NOW)).toContain('fecha pasada (elige hoy, futuro o fecha flexible)');
    expect(bookingMissing({ requested_destination: 'X', preferred_date: null, date_is_flexible: true, adults: 2, children: 0 }, NOW)).toEqual([]);
  });
});

describe('anti doble envío (Fase F)', () => {
  it('bloquea el segundo inicio concurrente y permite reintentar tras finish', () => {
    const g = createSubmitGuard();
    expect(g.tryStart()).toBe(true);
    expect(g.tryStart()).toBe(false);
    g.finish();
    expect(g.tryStart()).toBe(true);
  });
});

describe('errores comprensibles (Fase G, sin datos sensibles)', () => {
  it('clasifica tour no publicado, red y genérico', () => {
    expect(friendlySaveError(new Error('tour_id debe referenciar un tour publicado.'))).toMatch(/ya no está publicado/);
    expect(friendlySaveError(new Error('Failed to fetch'))).toMatch(/Sin conexión/);
    expect(friendlySaveError(new Error('dbname=secret token sk-abc SELECT *'))).toMatch(/No se pudo guardar/);
  });
  it('nunca expone el mensaje crudo', () => {
    const evil = 'SELECT * FROM x -- token sk-abc123';
    const out = friendlySaveError(new Error(evil));
    expect(out).not.toContain('SELECT');
    expect(out).not.toContain('sk-abc123');
  });
});

describe('estados (pendiente, nunca confirmada desde el cliente)', () => {
  it('el payload siempre es pending', () => {
    const p = buildTourRequestPayload({ userId: 'u1', draft: { requested_destination: 'X', preferred_date: '2026-11-20', adults: 1 }, tourId: null });
    expect(p.status).toBe('pending');
    expect(p.status).not.toBe('confirmed');
  });
  it('normalizeText colapsa espacios', () => {
    expect(normalizeText('  a   b  ', 10)).toBe('a b');
  });
});
