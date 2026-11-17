// Pantalla del área `compras` de `repuestos` (8.11-2, 8.11-3): el panel «Compras» bajo los pasos de `/repuestos/[id]`, cada pieza con `diferido()` (se pide al elegir el
// panel). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más. Una segunda pantalla del área va en
// `pantallas/compras-<pantalla>.ts`.
export {
  ComprasDelProyectoDiferido,
  MargenDelProyectoDiferido,
} from '../features/compras/components/diferidos'
