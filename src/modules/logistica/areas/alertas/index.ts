// La API de servidor de el área `alertas` de `logistica`: la bandeja de Inicio (demoradas, trabados y por aprobar), sus textos, y la bandeja del día de `/logistica` (siete grupos por cursor).
// La consumen los bloques de `tablero` y la pantalla de logística. Las alertas mismas las escribe la base (jobs de 6.12-1). Sale por el `index.ts` de la raíz.
export { bandejaLogistica, leerGrupoDeLaBandeja } from './composicion'
export {
  detalleDeDemorada,
  detalleDeTrabado,
  type BandejaDeLogistica,
  type FilaDemorada,
  type FilaPorAprobar,
  type FilaTrabada,
  type ListaDeLaBandeja,
} from '../../entities/alertas/bandeja'
export {
  GRUPOS_DE_LA_BANDEJA,
  TITULO_DE_LOS_GRUPOS,
  grupoDelSlug,
  gruposVisibles,
  rutaDelGrupoDeLaBandeja,
  slugDelGrupo,
  type GrupoDeLaBandeja,
} from '../../entities/alertas/grupos'
export {
  claveDeLaFila,
  type CursorDeLaBandeja,
  type FilaDeLaBandeja,
  type LecturaDelGrupo,
} from '../../entities/alertas/grupo-leido'
export { detalleDeLaFila } from '../../entities/alertas/fila'
export { accionDeLaFila, type AccionDeLaFila } from '../../features/alertas/accion-de-la-fila'
export {
  estadoDeLaBandeja,
  type EstadoDeLaBandeja,
  type GrupoDeLaBandejaLeido,
  type GrupoParaDibujar,
} from '../../entities/alertas/estado-de-la-bandeja'
