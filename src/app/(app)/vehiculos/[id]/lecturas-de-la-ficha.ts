import 'server-only'
import { z } from 'zod'
import { integracionActiva } from '@/modules/empresa'
import { puede, type Permisos, type requerirSesion } from '@/modules/equipo'
import { leerFasesDeOrigen } from '@/modules/flujos'
import { getOrigenes, leerLayout, type OrigenResumen } from '@/modules/origenes'
import {
  PANEL_DE_IMAGENES,
  columnaDeCompraDirecta,
  datosDelPanelDeImagenes,
  editablesDe,
  eliminablesDe,
  entradaDeRefresco,
  leerVehiculo,
  origenesVisibles,
  permisoDeVitrina,
  vistaPreviaDe,
  type Vehiculo,
} from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { unParametro } from '@/shared/lib/rutas'
import { vehiculoEnEdicion } from '../edicion'
import { paraCotizarDe } from '../para-cotizar'
import { papeleraYAvisosDe } from './avisos-de-la-ficha'

// Las lecturas de la ficha del vehículo (`page.tsx`), en el servidor.

// El vehículo y su origen, si quien mira ve los dos (un id que no es un uuid no se ve).
export async function vehiculoYOrigen(id: string, permisos: Permisos) {
  if (!z.guid().safeParse(id).success) {
    return { encontrado: null, origen: undefined }
  }
  const [vehiculo, origenes] = await Promise.all([leerVehiculo(id), getOrigenes(true)])
  const encontrado = datosO(vehiculo)
  const origen = origenesVisibles(permisos, datosO(origenes)).find(
    (uno) => uno.id === encontrado?.origenId,
  )
  return { encontrado, origen }
}

// Lo que la ficha necesita además del vehículo: el layout, la fase, si se edita, la vitrina y lo que ofrecen la papelera y los avisos.
export async function lecturasDeLaFicha(
  sesion: Awaited<ReturnType<typeof requerirSesion>>,
  encontrado: Vehiculo,
  origen: OrigenResumen,
  parametros: Awaited<PageProps<'/vehiculos/[id]'>['searchParams']>,
) {
  const deSubasta = origen.tipo === 'subasta'
  const [layout, fases, enEdicion, editables, previa, eliminables, apibaraActiva] =
    await Promise.all([
      leerLayout(origen.id, { conUso: false }),
      leerFasesDeOrigen(origen.id),
      vehiculoEnEdicion(parametros, sesion, origen.id),
      editablesDe(sesion, [encontrado]),
      vistaPreviaDe(encontrado.id),
      eliminablesDe(sesion, [encontrado]),
      // Sólo un origen de subasta consulta apibara («Actualizar los datos»); el resto ni pregunta.
      deSubasta ? integracionActiva('apibara') : Promise.resolve(false),
    ])
  const editable = editables.has(encontrado.id)
  const conApibara = deSubasta && apibaraActiva
  // «Editar imágenes» (`?panel=imagenes`): sus fotos se leen sólo cuando la URL lo pide.
  const imagenes =
    unParametro(parametros[CLAVE_DE_PANEL]) === PANEL_DE_IMAGENES
      ? await datosDelPanelDeImagenes(sesion, encontrado.id, { conSubasta: conApibara })
      : null
  const consultable = entradaDeRefresco(encontrado) !== null
  const fase = datosO(fases).find((una) => una.id === encontrado.faseId) ?? null
  const { papelera, avisos, ofrecerPapelera } = await papeleraYAvisosDe({
    sesion,
    vehiculo: encontrado,
    origenId: origen.id,
    fase,
    editable,
    eliminable: eliminables.has(encontrado.id),
  })
  const suLayout = datosO(layout)
  return {
    suLayout,
    // «Compra directa» de «Subasta»: el origen tiene activo el campo de apibara que trae el «Buy it now».
    conCompraDirecta: columnaDeCompraDirecta(deSubasta, suLayout.campos).tipo === 'campo',
    editable,
    fase,
    papelera,
    avisos,
    ofrecerPapelera,
    enEdicion: enEdicion?.id === encontrado.id ? enEdicion : null,
    previa,
    publicar: permisoDeVitrina(sesion.permisos, origen),
    paraCotizar: paraCotizarDe(sesion.permisos, origen),
    editaEnElOrigen: puede(sesion.permisos, 'vehiculos.editar', origen.id),
    subasta: conApibara ? { consultable } : null,
    imagenes,
    // El panel de «Actualizar los datos» sólo se abre si la acción se ofrece habilitada.
    actualizar:
      conApibara && consultable && editable
        ? { puedeConfigurar: puede(sesion.permisos, 'empresa.ajustes.gestionar') }
        : null,
  }
}
