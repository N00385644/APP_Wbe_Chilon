import { describe, it, expect } from 'vitest';
import { VEHICLE_SEATS } from '../features/chatbot/components/SeatPicker';
import { bookingSummary } from '../features/chatbot/engine/chatTree';
import { buildBookingMessage } from '../features/chatbot/data/whatsapp';

describe('Sistema de Asientos - Hyundai H350 Turismo Chilón', () => {
  it('tiene configurados exactamente 15 asientos de pasajeros y 1 chofer', () => {
    const passengerSeats = VEHICLE_SEATS.filter((s) => s.type === 'passenger');
    const driverSeat = VEHICLE_SEATS.filter((s) => s.type === 'driver');

    expect(passengerSeats).toHaveLength(15);
    expect(driverSeat).toHaveLength(1);
    expect(driverSeat[0].id).toBe('CHOFER');
  });

  it('los asientos de pasajeros están numerados del 01 al 15', () => {
    const passengerSeats = VEHICLE_SEATS.filter((s) => s.type === 'passenger');
    const labels = passengerSeats.map((s) => s.label);

    for (let i = 1; i <= 15; i++) {
      const numStr = String(i).padStart(2, '0');
      expect(labels).toContain(numStr);
    }
  });

  it('el asiento 01 corresponde a la cabina delantera (copiloto)', () => {
    const seat01 = VEHICLE_SEATS.find((s) => s.id === '01');
    expect(seat01).toBeDefined();
    expect(seat01?.row).toBe(1);
    expect(seat01?.description).toContain('Copiloto');
  });

  it('bookingSummary muestra el asiento elegido en el resumen', () => {
    const summary = bookingSummary({
      requested_destination: 'Cumbemayo',
      preferred_date: '2026-11-20',
      adults: 2,
      children: 0,
      requested_seats: '03, 04',
    });

    expect(summary).toContain('• Asiento(s) elegido(s): 03, 04');
  });

  it('buildBookingMessage incluye los asientos preferidos para WhatsApp', () => {
    const waMsg = buildBookingMessage({
      requested_destination: 'Granja Porcón',
      preferred_date: '2026-12-01',
      adults: 1,
      children: 0,
      requested_seats: '07',
    });

    expect(waMsg).toContain('• Asiento(s) preferido(s): 07');
  });
});

