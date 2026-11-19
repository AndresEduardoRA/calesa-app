import 'server-only'
import { z } from 'zod'
import {
  PANEL_DE_IMAGENES,
  PANEL_DE_VITRINA,
  datosDelPanelDeImagenes,
  datosDelPanelDeVitrina,
  type DatosDelPanelDeImagenes,
  type DatosDelPanelDeVitrina,
} from '@/modules/vehiculos'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import type { Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'

type Parametros = Record<string, string | string[] | undefined>

export type PanelesDeLaUrl = {
  panelDeImagenes: DatosDelPanelDeImagenes | null
  panelDeVitrina: DatosDelPanelDeVitrina | null
}

const NINGUNO: PanelesDeLaUrl = { panelDeImagenes: null, panelDeVitrina: null }

// Lo que muestra el panel del «⋯» que nombra la URL del inventario (`?panel=imagenes|vitrina&para=<id>`), como `vehiculoEnEdicion()` para `?editar=`: sólo
// ese panel y sólo con un `para` que es un id (si no, la lista pagaría lecturas en cada carga). Una lectura por apertura; uno de otro origen no abre. La
// vitrina sin el permiso no se lee (su panel no se abre).
export async function panelesDeLaUrl(
  parametros: Parametros,
  quien: { permisos: Permisos; usuarioId: string },
  origen: { id: string; conSubasta: boolean; publica: boolean },
): Promise<PanelesDeLaUrl> {
  const panel = unParametro(parametros[CLAVE_DE_PANEL])
  const para = unParametro(parametros['para'])
  if (para === undefined || !z.guid().safeParse(para).success) {
    return NINGUNO
  }
  if (panel === PANEL_DE_IMAGENES) {
    return {
      ...NINGUNO,
      panelDeImagenes: await datosDelPanelDeImagenes(quien, para, {
        origenId: origen.id,
        conSubasta: origen.conSubasta,
      }),
    }
  }
  if (panel === PANEL_DE_VITRINA && origen.publica) {
    return { ...NINGUNO, panelDeVitrina: await datosDelPanelDeVitrina(para, origen.id) }
  }
  return NINGUNO
}
