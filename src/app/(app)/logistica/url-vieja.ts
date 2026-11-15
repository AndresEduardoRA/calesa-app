import { z } from 'zod'
import {
  CLAVE_DE_FASE_DE_LA_CADENA,
  CLAVE_DE_ORIGEN_DE_LA_CADENA,
  esquemaDeFiltrosDeLaCadena,
  faseDeLaClave,
  pedidoDeLaCadena,
  rutaDeLaFase,
  rutaDelGrupoDeLaBandeja,
} from '@/modules/logistica'
import { leerFiltros } from '@/shared/lib/filtros'
import { unParametro, unidadDeLogistica } from '@/shared/lib/rutas'

type Parametros = Record<string, string | string[] | undefined>

// Las URL del kanban que se fue (marcadores, enlaces de un aviso, lo que ya estaba escrito): `?vehiculo=<id>` abría el drawer de la unidad y `?fase=<clave>` una columna y `?demoradas=si` o `?por_aprobar=si` filtraban todo el origen. Cada una lleva
// ahora a donde corresponde. Una clave que no sirve (un id que no es guid) se ignora y queda la portada. `contenedor` y `booking` no se mueven: son el filtro del lote del grupo
// (`?panel=lote&contenedor=`). Vive en `src/app` porque cruza dos áreas.
export function destinoDeLaUrlVieja(parametros: Parametros): string | null {
  const unidad = z.guid().safeParse(unParametro(parametros['vehiculo']))
  if (unidad.success) return unidadDeLogistica(unidad.data)

  const clave = unParametro(parametros[CLAVE_DE_FASE_DE_LA_CADENA])
  if (clave !== undefined && faseDeLaClave(clave) !== null) {
    const origen = z.guid().safeParse(unParametro(parametros[CLAVE_DE_ORIGEN_DE_LA_CADENA]))
    // Los filtros de la URL vieja pasan a la lista de la fase tal como eran (los que la base entiende).
    const filtros = pedidoDeLaCadena(
      leerFiltros(esquemaDeFiltrosDeLaCadena({ navieras: [] }), parametros),
    )
    return rutaDeLaFase(origen.success ? origen.data : null, clave, filtros)
  }
  // Los filtros «Demoradas» y «Por aprobar» de todo el origen eran la lista de lo demorado y de lo por aprobar: ahora son su grupo de la bandeja.
  if (unParametro(parametros['demoradas']) === 'si') return rutaDelGrupoDeLaBandeja('demorados')
  if (unParametro(parametros['por_aprobar']) === 'si') return rutaDelGrupoDeLaBandeja('por_aprobar')
  return null
}
