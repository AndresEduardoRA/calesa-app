// Pantalla: el resumen de una cotización (`?cotizacion=`) abierto fuera de `/cotizaciones`. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): lo montan la ficha del
// lead y la del vehículo. Lo que las demás áreas llenan en él (los huecos) lo une `src/app` (`huecos-del-resumen.ts`): un área no importa otra.
export { ResumenFueraDelListado } from '../features/listado/components/resumen-fuera-del-listado'
export type { QuienDelResumen } from '../features/hoja/components/huecos-del-resumen'
