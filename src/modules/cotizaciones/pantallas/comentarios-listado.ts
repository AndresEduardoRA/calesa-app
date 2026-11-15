// Lo que el área `comentarios` suma al listado de cotizaciones: «Favorita», «Reportar…» y moderar en el «⋯» de cada fila, y los diálogos de reportar y moderar. Sólo `src/app`
// importa este archivo (`.claude/rules/modulos.md`): reexporta lo que `/cotizaciones` pide y nada más.
export {
  DialogosDeMarcasDeLaFila,
  type DatosDeMarcasDeUnaFila,
} from '../features/comentarios/components/dialogos-de-marcas-de-la-fila'
export { useAbrirMarcasDeLaFila } from '../features/comentarios/hooks/use-abrir-marcas-de-la-fila'
export { useFavoritaDeLaFila } from '../features/comentarios/hooks/use-favorita-de-la-fila'
