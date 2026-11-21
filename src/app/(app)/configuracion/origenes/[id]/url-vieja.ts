import { PARTES_DEL_ORIGEN, rutaDeParteDelOrigen, type ParteDelOrigen } from '@/shared/lib/rutas'
import { conParametros, type ParametrosDeLaUrl } from '../../con-parametros'

// A dónde lleva `/configuracion/origenes/<id>` con lo que traiga: `?seccion=` elige la pestaña (`formula`, la de antes, es `formulas`); sin ella (o desconocida), un `?campo=`
// abierto lleva a «Campos», una `?categoria=` a «Categorías» y lo demás a la primera pestaña, «Datos» (la abre todo el que abre el origen;
// quien no, ve ahí por qué). Conserva todo lo demás (`?campo=`, `?categoria=`, `?panel=`…). Nunca vuelve a `/<id>` sin pestaña.
export function destinoDeLaUrlVieja(id: string, parametros: ParametrosDeLaUrl): string {
  const seccion = parametros['seccion']
  // `formula` es el nombre de antes de la lista de fórmulas.
  const elegida = PARTES_DEL_ORIGEN.find(
    (clave) => clave === (seccion === 'formula' ? 'formulas' : seccion),
  )
  const parte: ParteDelOrigen =
    elegida ?? (parametros['campo'] ? 'campos' : parametros['categoria'] ? 'categorias' : 'datos')
  return conParametros(rutaDeParteDelOrigen(id, parte), parametros)
}
