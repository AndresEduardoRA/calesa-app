// Pantalla: Configuración › Leads (campos, orígenes del lead, tipos de lead, tipos de seguimiento, la plantilla del embudo, el mensaje del portal y los teléfonos extra). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más. Los esqueletos de
// cada `loading.tsx` salen por `configuracion-esqueletos.ts`, sin los Client Components de acá.
export { EditorDeCamposDeLead } from '../features/campos/components/editor-de-campos-de-lead'
export { OrigenesDeLead } from '../features/origenes/components/origenes-de-lead'
export { TiposDeLead } from '../features/tipos/components/tipos-de-lead'
export { TiposDeSeguimiento } from '../features/tipos-de-seguimiento/components/tipos-de-seguimiento'
export { PlantillaDelEmbudo } from '../features/plantillas/components/plantilla-del-embudo'
export { MensajeDelPortal } from '../features/plantillas/components/mensaje-del-portal'
export { TelefonosExtraDeLaEmpresa } from '../features/plantillas/components/telefonos-extra-de-la-empresa'
export { ChoquesDeTelefonos } from '../features/plantillas/components/choques-de-telefonos'
