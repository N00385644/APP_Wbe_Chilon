import { useEffect, useState } from 'react';
import { Armchair, Check, Info, Lock, X } from 'lucide-react';
import { fetchOccupiedSeats } from '../../../services/requests';

export type SeatDefinition = {
  id: string; // e.g. "01", "02"
  label: string; // "01"
  row: number;
  col: number; // 0, 1, 2, 3
  type: 'driver' | 'passenger';
  description: string; // e.g. "Copiloto / Vista panorámica", "Ventana izquierda"
};

// Configuración de la Hyundai H350 de Turismo Chilón (15 asientos de pasajeros + Chofer)
export const VEHICLE_SEATS: SeatDefinition[] = [
  // Fila 1 (Cabina delantera)
  { id: 'CHOFER', label: 'Chofer', row: 1, col: 0, type: 'driver', description: 'Conductor profesional' },
  { id: '01', label: '01', row: 1, col: 3, type: 'passenger', description: 'Copiloto · Vista panorámica delantera' },

  // Fila 2
  { id: '02', label: '02', row: 2, col: 0, type: 'passenger', description: 'Fila 2 · Ventana izquierda' },
  { id: '03', label: '03', row: 2, col: 1, type: 'passenger', description: 'Fila 2 · Pasillo izquierdo' },
  { id: '04', label: '04', row: 2, col: 3, type: 'passenger', description: 'Fila 2 · Ventana derecha' },

  // Fila 3
  { id: '05', label: '05', row: 3, col: 0, type: 'passenger', description: 'Fila 3 · Ventana izquierda' },
  { id: '06', label: '06', row: 3, col: 1, type: 'passenger', description: 'Fila 3 · Pasillo izquierdo' },
  { id: '07', label: '07', row: 3, col: 3, type: 'passenger', description: 'Fila 3 · Ventana derecha' },

  // Fila 4
  { id: '08', label: '08', row: 4, col: 0, type: 'passenger', description: 'Fila 4 · Ventana izquierda' },
  { id: '09', label: '09', row: 4, col: 1, type: 'passenger', description: 'Fila 4 · Pasillo izquierdo' },
  { id: '10', label: '10', row: 4, col: 3, type: 'passenger', description: 'Fila 4 · Ventana derecha' },

  // Fila 5 posterior (5 asientos continuos)
  { id: '11', label: '11', row: 5, col: 0, type: 'passenger', description: 'Fila posterior · Ventana izquierda' },
  { id: '12', label: '12', row: 5, col: 1, type: 'passenger', description: 'Fila posterior · Asiento central' },
  { id: '13', label: '13', row: 5, col: 2, type: 'passenger', description: 'Fila posterior · Asiento central' },
  { id: '14', label: '14', row: 5, col: 3, type: 'passenger', description: 'Fila posterior · Asiento derecho' },
  { id: '15', label: '15', row: 5, col: 4, type: 'passenger', description: 'Fila posterior · Ventana derecha' },
];

export interface SeatPickerProps {
  tourId?: string | null;
  tourTitle?: string | null;
  date?: string | null;
  maxSeats?: number;
  initialSelected?: string[];
  occupiedSeats?: string[];
  readOnly?: boolean;
  highlightSeats?: string[];
  onConfirm?: (seats: string[]) => void;
  onClose?: () => void;
}

export function SeatPicker({
  tourId,
  tourTitle,
  date,
  maxSeats = 1,
  initialSelected = [],
  occupiedSeats: initialOccupied,
  readOnly = false,
  highlightSeats = [],
  onConfirm,
  onClose,
}: SeatPickerProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [occupied, setOccupied] = useState<string[]>(initialOccupied ?? []);
  const [loading, setLoading] = useState(!initialOccupied && !!date);
  const [hoveredSeat, setHoveredSeat] = useState<SeatDefinition | null>(null);

  // Cargar asientos ocupados reales si hay fecha
  useEffect(() => {
    if (initialOccupied) {
      setOccupied(initialOccupied);
      return;
    }
    if (!date) {
      setOccupied([]);
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    fetchOccupiedSeats({ tourId, date })
      .then((data) => {
        if (isMounted) setOccupied(data);
      })
      .catch(() => {
        if (isMounted) setOccupied([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [tourId, date, initialOccupied]);

  const toggleSeat = (seatId: string) => {
    if (readOnly) return;
    if (occupied.includes(seatId)) return;

    if (selected.includes(seatId)) {
      setSelected(selected.filter((s) => s !== seatId));
    } else {
      if (selected.length >= maxSeats) {
        // Si ya alcanzó el máximo, reemplaza o informa
        if (maxSeats === 1) {
          setSelected([seatId]);
        } else {
          // Desplaza el primero y agrega el nuevo
          setSelected([...selected.slice(1), seatId]);
        }
      } else {
        setSelected([...selected, seatId]);
      }
    }
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm(selected);
  };

  return (
    <div className="relative rounded-2xl border border-stone-200 bg-white p-5 shadow-xl text-stone-800 max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200">
      {/* Cabecera */}
      <div className="flex items-start justify-between border-b border-stone-100 pb-3">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-andino-50 px-2.5 py-0.5 text-[11px] font-bold text-andino-700">
            🚍 Nuestras movilidades · Turismo Chilón
          </span>
          <h3 className="mt-1 text-base font-extrabold text-stone-900">
            {readOnly ? 'Ubicación de tu Asiento' : 'Selecciona tus Asientos'}
          </h3>
          <p className="text-xs text-stone-500">
            {tourTitle ? `${tourTitle} · ` : ''}
            {date ? `Salida: ${date}` : 'Fecha a coordinar'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar selección de asientos"
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Indicador de cantidad de viajeros */}
      {!readOnly && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50/70 border border-amber-200/80 px-3 py-2 text-xs">
          <span className="font-semibold text-amber-900">
            Viajeros: <b>{maxSeats}</b>
          </span>
          <span className="font-bold text-andino-800">
            {selected.length === maxSeats
              ? `✓ ${selected.length} de ${maxSeats} elegidos`
              : `Elige ${maxSeats - selected.length} asiento(s) más`}
          </span>
        </div>
      )}

      {/* Leyenda de colores */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-stone-600 border-b border-stone-100 pb-3">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md border-2 border-emerald-500 bg-emerald-50 inline-block" />
          Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-andino-700 text-white flex items-center justify-center text-[9px] font-bold">
            ✓
          </span>
          {readOnly ? 'Tu asiento' : 'Seleccionado'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-stone-200 border border-stone-300 inline-block" />
          Ocupado
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-stone-500">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-andino-600 border-t-transparent" />
          <p className="mt-2">Consultando disponibilidad en tiempo real…</p>
        </div>
      ) : (
        /* Plano del Minibús */
        <div className="mt-4 rounded-2xl bg-stone-50 p-4 border border-stone-200 shadow-inner">
          {/* Frente del vehículo */}
          <div className="mb-3 text-center">
            <div className="mx-auto h-2 w-28 rounded-full bg-stone-300" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              ▲ Frente del vehículo / Parabrisas ▲
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Fila 1: Chofer y Asiento 01 */}
            <div className="grid grid-cols-4 gap-2 items-center">
              {/* Chofer */}
              <div
                className="flex flex-col items-center justify-center rounded-xl border border-stone-300 bg-stone-200/90 py-2.5 px-1 text-stone-600 select-none"
                title="Conductor profesional de Turismo Chilón"
              >
                <span className="text-sm">👨‍✈️</span>
                <span className="text-[9px] font-bold uppercase mt-0.5">Chofer</span>
              </div>

              {/* Pasillo central frontal */}
              <div className="col-span-2 flex items-center justify-center text-[10px] text-stone-300 italic select-none">
                Puerta de ingreso
              </div>

              {/* Asiento 01 (Copiloto) */}
              {renderSeatButton(
                VEHICLE_SEATS.find((s) => s.id === '01')!,
                selected,
                occupied,
                highlightSeats,
                readOnly,
                toggleSeat,
                setHoveredSeat
              )}
            </div>

            {/* Filas 2, 3 y 4 (2 asientos a la izquierda, pasillo, 1 a la derecha) */}
            {[2, 3, 4].map((rowNum) => {
              const rowSeats = VEHICLE_SEATS.filter((s) => s.row === rowNum);
              const left1 = rowSeats.find((s) => s.col === 0);
              const left2 = rowSeats.find((s) => s.col === 1);
              const right = rowSeats.find((s) => s.col === 3);

              return (
                <div key={rowNum} className="grid grid-cols-4 gap-2 items-center">
                  {left1 && renderSeatButton(left1, selected, occupied, highlightSeats, readOnly, toggleSeat, setHoveredSeat)}
                  {left2 && renderSeatButton(left2, selected, occupied, highlightSeats, readOnly, toggleSeat, setHoveredSeat)}
                  <div className="flex items-center justify-center text-[9px] text-stone-300 select-none">
                    pasillo
                  </div>
                  {right && renderSeatButton(right, selected, occupied, highlightSeats, readOnly, toggleSeat, setHoveredSeat)}
                </div>
              );
            })}

            {/* Fila 5 posterior (5 asientos continuos) */}
            <div className="grid grid-cols-5 gap-1.5 pt-1 border-t border-dashed border-stone-200">
              {VEHICLE_SEATS.filter((s) => s.row === 5).map((seat) =>
                renderSeatButton(seat, selected, occupied, highlightSeats, readOnly, toggleSeat, setHoveredSeat, true)
              )}
            </div>
          </div>

          <div className="mt-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              ▼ Parte trasera del Minibús ▼
            </span>
          </div>
        </div>
      )}

      {/* Detalle del asiento en hover o seleccionado */}
      <div className="mt-3 min-h-[38px] rounded-xl bg-stone-100/80 px-3 py-1.5 text-xs text-stone-600 flex items-center gap-2">
        <Info size={15} className="text-andino-600 shrink-0" />
        <span className="leading-tight text-[11px]">
          {hoveredSeat ? (
            <>
              <b>Asiento {hoveredSeat.label}:</b> {hoveredSeat.description}
            </>
          ) : selected.length > 0 ? (
            <>
              <b>Seleccionado(s):</b> Asiento {selected.sort().join(', ')}
            </>
          ) : (
            'Toca un asiento disponible para elegirlo.'
          )}
        </span>
      </div>

      {/* Botones de acción */}
      {!readOnly && (
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selected.length === 0}
            className="flex-1 rounded-xl bg-andino-700 py-2.5 text-xs font-bold text-white shadow-md hover:bg-andino-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
          >
            <Armchair size={15} />
            Confirmar Asiento{selected.length > 1 ? 's' : ''} ({selected.length})
          </button>
          <button
            type="button"
            onClick={() => {
              if (onConfirm) onConfirm([]);
            }}
            className="rounded-xl border border-stone-200 px-3 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Asignación automática
          </button>
        </div>
      )}
    </div>
  );
}

function renderSeatButton(
  seat: SeatDefinition,
  selected: string[],
  occupied: string[],
  highlightSeats: string[],
  readOnly: boolean,
  onToggle: (id: string) => void,
  onHover: (s: SeatDefinition | null) => void,
  compact = false
) {
  const isOccupied = occupied.includes(seat.id);
  const isSelected = selected.includes(seat.id) || highlightSeats.includes(seat.id);

  let style = 'border-2 border-emerald-500 bg-white text-emerald-900 hover:bg-emerald-50 hover:shadow-sm cursor-pointer';

  if (isOccupied) {
    style = 'border border-stone-200 bg-stone-200 text-stone-400 cursor-not-allowed';
  } else if (isSelected) {
    style = 'border-2 border-andino-800 bg-andino-700 text-white font-extrabold shadow-md scale-105 transition-transform';
  }

  return (
    <button
      key={seat.id}
      type="button"
      disabled={isOccupied || (readOnly && !isSelected)}
      onClick={() => onToggle(seat.id)}
      onMouseEnter={() => onHover(seat)}
      onMouseLeave={() => onHover(null)}
      aria-label={`Asiento ${seat.label} ${isOccupied ? 'ocupado' : isSelected ? 'seleccionado' : 'disponible'}`}
      className={`relative flex flex-col items-center justify-center rounded-xl transition-[transform,background-color,border-color,box-shadow] duration-160 ${
        compact ? 'py-1.5 px-0.5' : 'py-2 px-1'
      } ${style}`}
    >
      <div className="flex items-center gap-0.5">
        <Armchair size={compact ? 13 : 15} />
        {isSelected ? <Check size={compact ? 10 : 12} className="stroke-[3]" /> : isOccupied ? <Lock size={compact ? 10 : 11} /> : null}
      </div>
      <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold mt-0.5 leading-none`}>
        {seat.label}
      </span>
    </button>
  );
}

