import { ArrowLeftIcon } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { z } from 'zod'
import { rutaDeActividadDe } from '@/modules/actividad'
import { integracionActiva } from '@/modules/empresa'
import { puede, requerirSesion, type Permisos } from '@/modules/equipo'
import { leerFasesDeOrigen } from '@/modules/flujos'
import { getOrigenes, leerLayout, type OrigenResumen } from '@/modules/origenes'
import {
  PANEL_DE_IMAGENES,
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
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { FichaEnDosColumnas, IndiceDeBloques } from '@/shared/ui/ficha-en-bloques'
import { vehiculoEnEdicion } from '../edicion'
import { paraCotizarDe } from '../para-cotizar'
import { AvisosBajoLaCabecera } from './avisos-bajo-la-cabecera'
import { papeleraYAvisosDe } from './avisos-de-la-ficha'
import { RegistrarLaVisita } from './registrar-la-visita'
import { Encabezado } from './encabezado'
import { Paneles } from './paneles'
import {
  anclaDeLaUrl,
  bloquesDeQuienMira,
  CLAVE_DE_RELACIONADOS,
  CLAVE_DE_SECCION,
} from './bloques'
import { BloquesDeLaFicha } from './bloques-de-la-ficha'
import { LateralDeLaFicha } from './lateral-de-la-ficha'
import { LlegarAlBloque } from './llegar-al-bloque'

export const metadata: Metadata = { title: 'Vehículo' }

// Lo que no existe, lo que está en la papelera y lo que la persona no ve se muestran igual: decir
// «no tienes permiso» confirmaría que existe.
function NoDisponible() {
  return (
    <EstadoVacio
      titulo="No existe o no tienes acceso"
      descripcion="Puede que se haya eliminado, o que esté en un origen que no ves."
      accion={
        <Link href={RUTAS.vehiculos as Route} className={buttonVariants({ variant: 'outline' })}>
          Ir al inventario
        </Link>
      }
    />
  )
}

// «Ver actividad» del «⋯», sólo con `actividad.ver` (`vehiculos` no conoce `actividad`: la ruta la arma la página).
function paraActividadDe(permisos: Permisos, vehiculoId: string): string | null {
  return puede(permisos, 'actividad.ver') ? rutaDeActividadDe('vehiculos', vehiculoId) : null
}

// Vuelve al inventario del origen del vehículo.
function VolverAlOrigen({ origen }: { origen: { id: string; nombre: string } }) {
  return (
    <Link
      href={`${RUTAS.vehiculos}?origen=${origen.id}` as Route}
      className="inline-flex min-h-11 w-fit items-center gap-1.5 text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:text-(--color-ink) hover:underline md:min-h-8"
    >
      <ArrowLeftIcon aria-hidden className="size-4" />
      {origen.nombre}
    </Link>
  )
}

// El vehículo y su origen, si quien mira ve los dos (un id que no es un uuid no se ve).
async function vehiculoYOrigen(id: string, permisos: Permisos) {
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
async function lecturasDeLaFicha(
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
  return {
    suLayout: datosO(layout),
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

// El bloque al que lleva la URL al llegar (`?seccion=`, un panel o el drawer de «Relacionados»).
function anclaDe(
  parametros: Awaited<PageProps<'/vehiculos/[id]'>['searchParams']>,
  visibles: ReturnType<typeof bloquesDeQuienMira>,
) {
  return anclaDeLaUrl(
    {
      seccion: unParametro(parametros[CLAVE_DE_SECCION]),
      panel: unParametro(parametros[CLAVE_DE_PANEL]),
      relacionados: unParametro(parametros[CLAVE_DE_RELACIONADOS]),
    },
    visibles,
  )
}

// Lo único de un bloque que cruza al índice (un componente de cliente).
const entradaDelIndice = ({ ancla, etiqueta }: { ancla: string; etiqueta: string }) => ({
  ancla,
  etiqueta,
})

// La ficha de un vehículo en dos columnas (docs/UX.md › Vehículo): a la izquierda, pegajosa, lo que lo identifica (cabecera, datos principales y
// subasta); a la derecha, el índice y todos los bloques que quien mira ve, a la vista (`bloques.ts`). `?seccion=` (los enlaces de siempre) y los
// paneles de «Relacionados» llevan a su bloque; `?editar=`, `?panel=vitrina`, `?panel=fechas-de-subasta` y `?visor=` abren lo suyo.
export default async function PaginaVehiculo({
  params,
  searchParams,
}: PageProps<'/vehiculos/[id]'>) {
  const [sesion, { id }, parametros] = await Promise.all([requerirSesion(), params, searchParams])
  const { encontrado, origen } = await vehiculoYOrigen(id, sesion.permisos)
  if (!encontrado || !origen) {
    return <NoDisponible />
  }
  const lectura = await lecturasDeLaFicha(sesion, encontrado, origen, parametros)
  const { suLayout, editable, fase, avisos, previa, publicar } = lectura
  const visibles = bloquesDeQuienMira(sesion.permisos, origen.id)
  return (
    <>
      <RegistrarLaVisita id={encontrado.id} />
      <FichaEnDosColumnas
        antes={
          <AvisosBajoLaCabecera
            vehiculo={encontrado}
            origen={origen}
            fase={fase}
            permisos={sesion.permisos}
            editable={editable}
            volver={<VolverAlOrigen origen={origen} />}
          />
        }
        lateral={
          <LateralDeLaFicha
            encabezado={
              <Encabezado
                vehiculo={encontrado}
                origen={origen}
                fase={fase}
                previa={previa}
                publicar={publicar}
                editable={editable}
                paraActividad={paraActividadDe(sesion.permisos, encontrado.id)}
                papelera={lectura.papelera}
                avisos={avisos}
                paraCotizar={lectura.paraCotizar}
                editaEnElOrigen={lectura.editaEnElOrigen}
                subasta={lectura.subasta}
              />
            }
            vehiculo={encontrado}
            origen={origen}
            layout={suLayout}
            editable={editable}
          />
        }
        etiquetaDelLateral={`Datos de ${encontrado.titulo}`}
        indice={<IndiceDeBloques bloques={visibles.map(entradaDelIndice)} />}
      >
        <BloquesDeLaFicha
          visibles={visibles}
          vehiculo={encontrado}
          origen={origen}
          layout={suLayout}
          editable={editable}
          permisos={sesion.permisos}
          ofrecerPapelera={lectura.ofrecerPapelera}
          avisos={avisos}
        />
      </FichaEnDosColumnas>
      <LlegarAlBloque ancla={anclaDe(parametros, visibles)} />
      <Paneles
        vehiculo={encontrado}
        origen={origen}
        fase={fase}
        layout={suLayout}
        previa={previa}
        publicar={publicar}
        enEdicion={lectura.enEdicion}
        imagenes={lectura.imagenes}
        actualizar={lectura.actualizar}
      />
    </>
  )
}
