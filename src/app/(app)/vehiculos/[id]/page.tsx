import { ArrowLeftIcon } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { rutaDeActividadDe } from '@/modules/actividad'
import { puede, requerirSesion, type Permisos } from '@/modules/equipo'
import type { OrigenResumen } from '@/modules/origenes'
import { rutaParaCotizar, type ParaCotizar, type Vehiculo } from '@/modules/vehiculos'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { conVuelta, RUTAS, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { FichaEnDosColumnas, IndiceDeBloques } from '@/shared/ui/ficha-en-bloques'
import { AvisosBajoLaCabecera } from './avisos-bajo-la-cabecera'
import { RegistrarLaVisita } from './registrar-la-visita'
import { Encabezado } from './encabezado'
import { lecturasDeLaFicha, vehiculoYOrigen } from './lecturas-de-la-ficha'
import { EnlacesCortos } from './enlaces-cortos'
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
import { redirigirConPermisos, redirigirSinLeer } from './llegada-de-la-ficha'

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

// «Cotizar» desde la ficha: la hoja con este vehículo y su origen, con la vuelta a la ficha; null si no cotiza en el origen (`paraCotizarDe()`). La usan
// «Cotización aprobada» (sin aprobada) y el título de «Cotizaciones de este vehículo».
function cotizarDesdeLaFicha(paraCotizar: ParaCotizar | null, vehiculoId: string): string | null {
  return paraCotizar === null
    ? null
    : conVuelta(rutaParaCotizar(paraCotizar, vehiculoId), `${RUTAS.vehiculos}/${vehiculoId}`)
}

// «Cotización aprobada» de la izquierda: con `cotizaciones.ver` del origen (si no, ni el bloque ni la consulta) y, sin aprobada, «Cotizar».
function aprobadaDe(
  permisos: Permisos,
  origenId: string,
  cotizar: string | null,
): { cotizar: string | null } | null {
  return puede(permisos, 'cotizaciones.ver', origenId) ? { cotizar } : null
}

// Los campos públicos que trae la tarjeta de la vitrina: lo único del layout que necesita «Vitrina» (el layout entero ya viaja con el panel).
function camposPublicosDe(
  campos: Awaited<ReturnType<typeof lecturasDeLaFicha>>['suLayout']['campos'],
  previa: Awaited<ReturnType<typeof lecturasDeLaFicha>>['previa'],
) {
  return previa === null ? [] : campos.filter((campo) => campo.clave in previa.tarjeta.atributos)
}

type Sesion = Awaited<ReturnType<typeof requerirSesion>>

// La cabecera de la columna izquierda, con lo que la página resolvió: la vitrina y el «⋯» sobre la foto y los enlaces cortos.
function encabezadoDe(
  sesion: Sesion,
  encontrado: Vehiculo,
  origen: OrigenResumen,
  lectura: Awaited<ReturnType<typeof lecturasDeLaFicha>>,
) {
  return (
    <Encabezado
      vehiculo={encontrado}
      origen={origen}
      fase={lectura.fase}
      previa={lectura.previa}
      publicar={lectura.publicar}
      editable={lectura.editable}
      paraActividad={paraActividadDe(sesion.permisos, encontrado.id)}
      papelera={lectura.papelera}
      avisos={lectura.avisos}
      paraCotizar={lectura.paraCotizar}
      editaEnElOrigen={lectura.editaEnElOrigen}
      subasta={lectura.subasta}
      enlaces={
        <EnlacesCortos
          vehiculoId={encontrado.id}
          verLogistica={puede(sesion.permisos, 'logistica.ver', origen.id)}
        />
      }
    />
  )
}

// La ficha de un vehículo en dos columnas (docs/UX.md › Vehículo): a la izquierda, pegajosa, lo que lo identifica (cabecera, aprobada, datos
// principales y subasta); a la derecha, el índice y sólo lo de ventas que quien mira ve (`bloques.ts`): cotizaciones, relacionados, actividad y
// vitrina. `?seccion=` de un bloque y los paneles de «Relacionados» llevan a su bloque; los de un bloque que se fue redirigen (`llegada-de-la-ficha.ts`:
// `fotos` y `ficha` antes de leer, `documentos`, `fase` y `repuestos` con el permiso de su página); `?editar=`, `?panel=vitrina`,
// `?panel=fechas-de-subasta`, `?ver=ficha` y `?visor=` abren lo suyo.
export default async function PaginaVehiculo({
  params,
  searchParams,
}: PageProps<'/vehiculos/[id]'>) {
  const [sesion, { id }, parametros] = await Promise.all([requerirSesion(), params, searchParams])
  redirigirSinLeer(id, parametros)
  const { encontrado, origen } = await vehiculoYOrigen(id, sesion.permisos)
  if (!encontrado || !origen) {
    return <NoDisponible />
  }
  await redirigirConPermisos(encontrado.id, origen.id, sesion.permisos, parametros)
  const lectura = await lecturasDeLaFicha(sesion, encontrado, origen, parametros)
  const { suLayout, editable, fase, avisos, previa, publicar } = lectura
  const visibles = bloquesDeQuienMira(sesion.permisos, origen.id)
  const cotizar = cotizarDesdeLaFicha(lectura.paraCotizar, encontrado.id)
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
            encabezado={encabezadoDe(sesion, encontrado, origen, lectura)}
            vehiculo={encontrado}
            origen={origen}
            layout={suLayout}
            editable={editable}
            conCompraDirecta={lectura.conCompraDirecta}
            aprobada={aprobadaDe(sesion.permisos, origen.id, cotizar)}
          />
        }
        etiquetaDelLateral={`Datos de ${encontrado.titulo}`}
        indice={<IndiceDeBloques bloques={visibles.map(entradaDelIndice)} />}
      >
        <BloquesDeLaFicha
          visibles={visibles}
          vehiculo={encontrado}
          origen={origen}
          permisos={sesion.permisos}
          ofrecerPapelera={lectura.ofrecerPapelera}
          avisos={avisos}
          cotizar={cotizar}
          previa={previa}
          publicar={publicar}
          fase={fase}
          camposPublicos={camposPublicosDe(suLayout.campos, previa)}
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
        conCompartir={puede(sesion.permisos, 'cotizaciones.ver', origen.id)}
      />
    </>
  )
}
