import { describe, expect, it } from 'vitest';
import { billingAppUrl } from '../features/admin/components/BillingAdmin';
import { buildEmail, limaDate, type ReminderRow } from '../../supabase/functions/send-reminders/email';

describe('deployment integrations', () => {
  it('never links visitors to local or unsafe billing addresses', () => {
    for (const url of [undefined, '', 'javascript:alert(1)', 'http://billing.test', 'http://localhost:3000', 'https://user:password@billing.test']) {
      expect(billingAppUrl(url)).toBeNull();
    }
    expect(billingAppUrl('http://localhost:3000', true)).toBe('http://localhost:3000');
    expect(billingAppUrl('https://billing.test/')).toBe('https://billing.test');
  });
  it('uses the Lima day even when the UTC day has advanced', () => {
    expect(limaDate(0, new Date('2026-11-01T02:00:00Z'))).toBe('2026-10-31');
    expect(limaDate(1, new Date('2026-11-01T02:00:00Z'))).toBe('2026-11-01');
  });
  it('escapes customer and agency text in reminder HTML', () => {
    const row: ReminderRow = {
      id: 'request', user_id: 'customer', requested_destination: '<script>alert(1)</script>',
      confirmed_date: '2026-11-01', departure_time: '08:00:00', meeting_point: '<img src=x onerror=alert(1)>',
      departure_notes: 'Traer agua & abrigo', confirmed_seats: '01,02', tours: null,
      profiles: { full_name: '<b>Cliente</b>' },
    };
    const email = buildEmail(row, 'https://turismo.example/');
    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<img');
    expect(email.html).toContain('&lt;b&gt;Cliente&lt;/b&gt;');
    expect(email.html).toContain('https://turismo.example/calendario');
    expect(email.text).toContain('Asientos confirmados: 01,02');
  });
});
