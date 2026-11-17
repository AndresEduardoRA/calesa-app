// Pantalla del área `proyectos` de `repuestos` (8.09-1): `/repuestos`. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que esa pantalla dibuja y nada más. Una segunda pantalla del área va en `pantallas/proyectos-<pantalla>.ts`. El formulario «Nuevo proyecto» sale por
// `pantallas/proyectos-nuevo.ts`, que sólo importa la composición diferida de `src/app`.
export { BotonNuevoProyecto } from '../features/proyectos/components/boton-nuevo-proyecto'
export { ListadoDeProyectos } from '../features/proyectos/components/listado-de-proyectos'
export { useNuevoProyectoPorUrl } from '../features/proyectos/hooks/use-nuevo-proyecto-por-url'
export { CabeceraDeProyecto } from '../features/proyectos/components/cabecera-de-proyecto'
export {
  buscarProyectoAbierto,
  interpretarBusquedaDeProyecto,
} from '../features/proyectos/hooks/buscar-proyecto-abierto'
