// La entrada del SHELL del módulo `leads` para Client Components de `src/app/(app)/_shell/`: abrir «Nuevo lead» desde la paleta de la barra, sin importar el drawer.
// Existe aparte de `client.ts` porque lo que importa el shell viaja en el JS de **todas** las pantallas (`docs/RENDIMIENTO.md`); el alta se pide al abrirse.
export { useAbrirNuevoLead } from './features/alta/hooks/use-panel-de-alta'
// Pide el código y la lectura del alta sin abrir nada (al llegar el puntero o el foco a «Lead» en «Nuevo»).
export { adelantarElAlta } from './features/alta/components/diferidos'
// A dónde lleva «Nuevo» para anotar un seguimiento o agendar un recordatorio sobre un lead elegido (puro).
export { rutaDeAccionSobreUnLead, type AccionSobreUnLead } from './entities/ruta-de-accion-de-lead'
