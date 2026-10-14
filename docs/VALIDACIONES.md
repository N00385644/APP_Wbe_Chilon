# Validaciones Fase 3 — reglas, pendientes y propuesta SQL (no aplicada)

## Fuente única

`src/schemas/requests.ts`: `validateName`, `validateDestination`,
`validatePhoneOptional`, `validateNotes`, `validatePreferredDate`
(zona `America/Lima`), `validateTravelers` + `totalTravelers`,
`validateBookingDraft`, `buildTourRequestPayload`, `createSubmitGuard`.
`src/services/requests.ts`: `friendlySaveError` (nunca expone SQL/claves).
Motor: `chatTree.bookingMissing`/`bookingSummary` + `chatSearch`.

## Reglas implementadas (cliente, antes de guardar)

- Destino obligatorio (no vacío ni solo espacios), normalizado, máx 200.
- Nombre 2–80 tras normalizar; admite tildes, apóstrofos, guiones e
  internacional. Se valida en contacto y en `updateName` (perfil).
- Teléfono opcional: vacío -> null; con contenido 7–20 dígitos, sin letras.
- Fecha concreta: `YYYY-MM-DD` estricta + calendario real + no pasada en Lima.
  Flexible (`date_is_flexible`) y ausente son estados distintos; jamás se
  inventa una fecha ficticia. Sin anticipación mínima (sin regla comercial).
- Viajeros enteros estrictos (rechaza decimales/negativos/basura);
  adultos 1–50, menores 0–50, total 1–100 (respeta el CHECK de la BD).
- Rangos del árbol (`3-5`, `6+`) exigen el número exacto antes de confirmar;
  `1`/`2` son exactos. El resumen muestra lo mismo que irá a Supabase.
- `tour_id`: solo UUID validado contra tours publicados; slug/inexistente/
  no publicado -> null + destino libre (guarda 0007 en BD).
- Payload siempre `status: 'pending'` (nunca `confirmed` desde el cliente).
- Anti doble envío: guardia + botón deshabilitado + borrador marcado enviado;
  el reintento tras error sigue permitido con los datos conservados.
- Errores: qué dato falla, cómo corregirlo, sin SQL/claves/tokens, sin
  afirmar registros falsos.

## Propuesta SQL pendiente (DOCUMENTADA, NO APLICADA)

Requiere confirmación y pruebas en staging antes de cualquier migración:

```sql
-- Borrador de idea: rechazar destino vacío/solo-espacios en tour_requests.
-- Riesgo evaluado: bajo (INSERT/UPDATE de ese campo), pero toca datos reales;
-- no aplicar sin autorización. No toca 0006/0007 ni RLS.
--   CHECK (requested_destination IS NULL OR length(btrim(requested_destination)) > 0)
```

No se propone CHECK de fecha pasada: `preferred_date` es deseo del
visitante, no salida; bloquearla en BD rompería seeds y reintentos.
La coherencia `date_is_flexible=true` + fecha concreta se deja al criterio
de la empresa (hoy el cliente prioriza la fecha si viene informada).

## Reglas comerciales que debe confirmar la empresa

1. Anticipación mínima y disponibilidad (hoy: sin mínimo, solo no-pasada).
2. Tope de grupo web (hoy: 50/50/100 por límites técnicos de la BD).
3. Teléfono obligatorio u opcional (hoy: opcional).
4. Menores: edades, documentación y tarifas (hoy: sin reglas, no inventadas).
5. `date_is_flexible=true` + fecha concreta: ¿se permite o se normaliza?
6. Destinos libres (`tour_id=null`): ¿siempre permitidos?
