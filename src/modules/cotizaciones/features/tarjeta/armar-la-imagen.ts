import 'server-only'
import { PESO_MAXIMO_LOGO, leerAjustes } from '@/modules/empresa'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { leerHojaDeUnaGuardada } from '../../areas/nucleo/composicion'
import { webpDeUnaGuardada } from '../../areas/tarjeta/composicion'
import type { HojaDeUnaGuardada } from '../../entities/hoja-de-una-guardada'
import type { AnchoDeLaImagen } from '../../entities/ruta-de-la-hoja'
import { contextoDeLaPagina } from '../../entities/tarjeta/contexto-de-la-cotizacion'
import {
  paginaDeLaImagen,
  type ContextoDeQuienMira,
} from '../../entities/tarjeta/pagina-de-la-imagen'

export type ImagenArmada = {
  bytes: Uint8Array<ArrayBuffer>
  // Con el primer recálculo: sin él la tarjeta sale sólo con el total, y esa imagen se entrega sin que el navegador la guarde (la ruta responde `no-store`).
  conRecalculo: boolean
}

// Arma la imagen de la tarjeta de una guardada para quien la pide, con su sesión (`docs/COTIZADOR.md` › «La imagen de la tarjeta»): la hoja de lo guardado y el
// primer recálculo (`leerHojaDeUnaGuardada`), los ajustes de la empresa (`leerAjustes()`, que falla en vez de dar lo de fábrica: la zona, el formato y el logo) y
// el contexto de quien mira (el cliente si lo ve, el vehículo y él como asesor, que lo arma `src/app`), en el ancho pedido. Va en `features/` porque cruza con
// `empresa`. Lo que no existe, está en la papelera o no se ve, `sin_permiso`; lo demás que falle, `inesperado`.
export async function armarLaImagen(
  id: string,
  {
    contextoDe,
    ancho,
  }: {
    contextoDe: (hoja: HojaDeUnaGuardada) => ContextoDeQuienMira | Promise<ContextoDeQuienMira>
    ancho: AnchoDeLaImagen | null
  },
): Promise<Resultado<ImagenArmada>> {
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
  const imagen = await webpDeUnaGuardada(
    {
      lectura: lectura.data,
      // El día del último guardado y el del vencimiento, en la zona de la empresa: lo mismo que la vista previa de esa guardada y que su PDF.
      contexto: contextoDeLaPagina(
        paginaDeLaImagen({
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
    },
    { ancho },
  )
  if (!imagen.ok) {
    return imagen
  }
  return ok({ bytes: imagen.data, conRecalculo: inicial.respuesta !== null })
}
