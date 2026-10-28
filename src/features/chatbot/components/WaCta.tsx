// Visual puro: preview del mensaje + apertura de wa.me (sin iframes).
// Sin lógica de negocio: solo presenta el texto que le pasa el motor.
import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { WHATSAPP_DISPLAY, waLink } from '../data/whatsapp';

export function WaCta({ text, label = 'Continuar en WhatsApp' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* portapapeles no disponible */ }
  };
  return (
    <div className="mt-2 rounded-xl border border-[#00a884]/30 bg-[#e7ffdb] p-2.5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#075e54]">Se envía al WhatsApp de la empresa ({WHATSAPP_DISPLAY})</p>
      <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-stone-700">{text}</p>
      <div className="mt-2 flex gap-2">
        <a
          href={waLink(text)} target="_blank" rel="noopener noreferrer"
          aria-label={`${label} (${WHATSAPP_DISPLAY})`}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-[#00a884] px-3 py-2.5 text-[13px] font-bold text-white hover:bg-[#009678] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00a884] transition-colors"
        >
          <ExternalLink size={14} aria-hidden /> {label}
        </a>
        <button
          onClick={copy} title="Copiar mensaje" aria-label={copied ? 'Mensaje copiado' : 'Copiar mensaje de WhatsApp'}
          className="grid min-h-11 w-11 place-items-center rounded-lg border border-stone-300 bg-white hover:bg-stone-50 hover:border-stone-400 focus-visible:outline-2 focus-visible:outline-andino-600 transition-colors"
        >
          {copied ? <Check size={15} className="text-green-700" /> : <Copy size={15} />}
        </button>
      </div>
      <p className="mt-1 text-[10px] text-stone-500">Al abrirse WhatsApp solo pulsa Enviar — el equipo de la empresa te atiende allí.</p>
    </div>
  );
}
