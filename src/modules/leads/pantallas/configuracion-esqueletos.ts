// Pantalla: los `loading.tsx` de Configuración › Leads (orígenes del lead, tipos de lead y tipos de seguimiento). Sólo `src/app` importa este
// archivo (`.claude/rules/modulos.md`). Son Server Components: un `loading.tsx` que importara `configuracion.ts` bajaría además los Client
// Components de la pantalla en otro chunk (`docs/RENDIMIENTO.md`).
export { EsqueletoDeOrigenes } from '../features/origenes/components/esqueleto-de-origenes'
export { EsqueletoDeTipos } from '../features/tipos/components/esqueleto-de-tipos'
export { EsqueletoDeTiposDeSeguimiento } from '../features/tipos-de-seguimiento/components/esqueleto-de-tipos-de-seguimiento'
