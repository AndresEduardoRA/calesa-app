import {
  contextoDeLaPagina,
  ladoDeLaOpcion,
  leerHojaDeUnaGuardada,
  paraCompartirDeUnaGuardada,
  tituloBaseDeLaHermana,
  type DatosParaCompartir,
  type HojaDeUnaGuardada,
} from '@/modules/cotizaciones'

type Lectura = Parameters<typeof paraCompartirDeUnaGuardada>[0]['lectura']
type Cifras = Pick<DatosParaCompartir, 'conceptos' | 'total'>
type Comun = {
  vehiculo: Parameters<typeof contextoDeLaPagina>[0]['vehiculo']
  asesor: string | null
  zona: string
  locale: string
}

// Lo de la página de una cotización para sus cifras de compartir (sin título, cliente, empresa ni logo: el texto los arma aparte).
export const contextoParaCompartir = (hoja: HojaDeUnaGuardada, comun: Comun) =>
  contextoDeLaPagina(
    {
      titulo: null,
      cliente: null,
      vehiculo: comun.vehiculo,
      asesor: comun.asesor,
      numero: hoja.cotizacion.numero,
      venceEl: hoja.venceEl,
      guardadaEl: hoja.cotizacion.actualizadoEn,
      empresa: null,
      logo: null,
    },
    { zona: comun.zona, hoy: hoja.cotizacion.actualizadoEn },
  )

// Las cotizaciones hermanas al compartir (glosario: «Cotizaciones hermanas»): con la hermana disponible, los conceptos y el total de cada opción en el orden de
// las opciones, y el título sin la opción; sin ella (o si no se lee), nada y la cotización sola.
export async function versionesParaCompartir(
  lectura: Lectura,
  propias: Cifras,
  comun: Comun,
): Promise<{ versiones: DatosParaCompartir['versiones']; tituloBase: string | null } | null> {
  const { hoja } = lectura
  if (!hoja.hermana?.disponible) return null
  const par = hoja.diseno.par
  if (!par) return null
  const otra = await leerHojaDeUnaGuardada(hoja.hermana.id)
  if (!otra.ok) return null
  const cifras = await paraCompartirDeUnaGuardada({
    lectura: otra.data,
    contexto: contextoParaCompartir(otra.data.hoja, comun),
    locale: comun.locale,
  })
  if (!cifras.ok) return null
  const lado = ladoDeLaOpcion(par, hoja.opcionDelPar) ?? 0
  const esta = {
    etiqueta: par.opciones[lado].etiqueta,
    cotizacionId: hoja.cotizacion.id,
    conceptos: propias.conceptos,
    total: propias.total,
  }
  const suya = {
    etiqueta: par.opciones[lado === 0 ? 1 : 0].etiqueta,
    cotizacionId: otra.data.hoja.cotizacion.id,
    conceptos: cifras.data.conceptos,
    total: cifras.data.total,
  }
  return {
    versiones: lado === 0 ? [esta, suya] : [suya, esta],
    tituloBase: tituloBaseDeLaHermana(hoja.cotizacion.titulo, esta.etiqueta),
  }
}
