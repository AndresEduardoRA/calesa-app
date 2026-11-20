import 'server-only'
import { PESO_MAXIMO_LOGO, leerAjustes } from '@/modules/empresa'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { leerHojaDeUnaGuardada } from '../../areas/nucleo/composicion'
import { imagenDeLaPortada } from '../../areas/tarjeta/composicion'
import type { HojaDeUnaGuardada } from '../../entities/hoja-de-una-guardada'
import { contextoDeLaPagina } from '../../entities/tarjeta/contexto-de-la-cotizacion'
import { paginaDeLaPortada } from '../../entities/tarjeta/pagina-de-la-portada'
import type { ContextoCompartido } from '../../entities/tarjeta/portada'

export type PortadaArmada = {
  bytes: Uint8Array<ArrayBuffer>
  // Con el primer recálculo: sin él la tarjeta sale sólo con el total, y esa imagen se entrega pero no se guarda (fijaría una portada pobre con una clave válida).
  guardable: boolean
}

// Arma la portada de una guardada con la sesión de quien pide (`docs/COTIZADOR.md` › «La portada de la cotización»): la hoja de lo guardado y el primer recálculo
// (`leerHojaDeUnaGuardada`), los ajustes de la empresa (`leerAjustes()`, que falla en vez de dar lo de fábrica: la zona, el formato y el logo) y el contexto que
// le den (el de la compartida, de la base, o el de quien pide, que lo arma `src/app` con lo que esa persona ve). Va en `features/` porque cruza con `empresa`.
// Lo que no existe, está en la papelera o no se ve, `sin_permiso`; lo demás que falle, `inesperado`.
export async function armarLaPortada(
  id: string,
  contextoDe: (hoja: HojaDeUnaGuardada) => ContextoCompartido | Promise<ContextoCompartido>,
): Promise<Resultado<PortadaArmada>> {
  const lectura = await leerHojaDeUnaGuardada(id)
  if (!lectura.ok) {
    return { ok: false, error: lectura.error }
  }
  const { hoja, inicial } = lectura.data
  const [contexto, ajustes] = await Promise.all([contextoDe(hoja), leerAjustes()])
  if (!ajustes.ok) {
    return fallo('inesperado', 'No se pudieron leer los ajustes de la empresa.')
  }
  const { nombre, logoRuta, locale, zonaHoraria } = ajustes.data.ajustes
  const url = urlPublicaONull('marca', logoRuta)
  const imagen = await imagenDeLaPortada({
    lectura: lectura.data,
    // El día del último guardado y el del vencimiento, en la zona de la empresa: lo mismo que la vista previa de esa guardada y que su PDF.
    contexto: contextoDeLaPagina(
      paginaDeLaPortada({
        hoja,
        contexto,
        empresa: nombre,
        logo: url === null ? null : { nombre, url },
      }),
      { zona: zonaHoraria, hoy: hoja.cotizacion.actualizadoEn },
    ),
    locale,
    empresa: nombre,
    topeDelLogo: PESO_MAXIMO_LOGO,
  })
  if (!imagen.ok) {
    return imagen
  }
  return ok({ bytes: imagen.data, guardable: inicial.respuesta !== null })
}
