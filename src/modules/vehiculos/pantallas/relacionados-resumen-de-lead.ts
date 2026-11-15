// Pantalla: el bloque «Relacionados» del resumen del listado de leads (`/leads`, lo compone `app/`: `leads` no importa `vehiculos`). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta sólo lo diferido, para que `/leads` no pague en JS el resto de «Relacionados» (el presupuesto de `/leads` está al borde: `docs/RENDIMIENTO.md`).
export { RelacionadosDelResumenDeLeadDiferido } from '../features/relacionados/components/diferidos'
