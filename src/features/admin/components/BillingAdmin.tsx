import { useEffect, useState } from 'react';
import { ExternalLink, Receipt } from 'lucide-react';

export function BillingAdmin() {
  const billingUrl = (import.meta.env.VITE_FACTURADOR_APP_URL as string | undefined)?.trim()
    || 'http://localhost:3000';

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-stone-200 bg-stone-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-andino-100 text-andino-800">
            <Receipt size={18} aria-hidden />
          </span>
          <div>
            <h2 className="font-bold text-stone-900">Facturación electrónica</h2>
            <p className="mt-0.5 max-w-2xl text-xs leading-5 text-stone-600">
              Panel independiente para emitir comprobantes y consultar documentos SUNAT.
              Inicia sesión con tus credenciales del facturador.
            </p>
          </div>
        </div>
        <a
          href={billingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 transition-colors hover:border-andino-400 hover:bg-andino-50 hover:text-andino-800 focus-visible:outline-2 focus-visible:outline-andino-600"
        >
          Abrir en nueva pestaña
          <ExternalLink size={14} aria-hidden />
        </a>
      </div>
      <div className="bg-stone-100 p-2 sm:p-3">
        <iframe
          title="Panel de facturación electrónica"
          src={`${billingUrl.replace(/\/$/, '')}/panel`}
          className="h-[min(78vh,900px)] w-full rounded-xl border border-stone-200 bg-white shadow-inner"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </section>
  );
}
