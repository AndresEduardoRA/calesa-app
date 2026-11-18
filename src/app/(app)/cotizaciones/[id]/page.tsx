import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { z } from 'zod'
import { RegistrarVisita } from '@/modules/buscador/pantallas/visita'
import { leerHojaDeUnaGuardada } from '@/modules/cotizaciones'
import {
  CabeceraDeLaGuardada,
  EsqueletoDeHoja,
  PantallaDeUnaGuardada,
} from '@/modules/cotizaciones/pantallas/cotizacion'
import { requerirSesion } from '@/modules/equipo'
import { RegistrarVisto } from '@/modules/equipo/pantallas/visto-de-la-ficha'
import { EstadoVacio } from '@/shared/ui/estados'
import { ConProveedorDeLaHoja } from '../con-proveedor-de-la-hoja'
import { asesorDe, clienteDe, vehiculoDe, vehiculoDeLaTarjeta } from '../datos-de-la-tarjeta'
import { HUECOS_DE_LA_GUARDADA, dibujarHuecos } from './huecos-de-la-guardada'

export const metadata: Metadata = { title: 'Cotización' }

// Una cotización guardada (`docs/UX.md` › «Cotizar»): su hoja con lo que se guardó, en sólo lectura para quien no la puede guardar (`cotizaciones.ver`; P8, P13). Se llega desde el
// historial del vehículo y desde la tarjeta de lo guardado.
export default function PaginaDeUnaCotizacion({ params }: PageProps<'/cotizaciones/[id]'>) {
  return (
    <div className="grid min-w-0 gap-4">
      <Suspense fallback={<EsqueletoDeHoja />}>
        <Cotizacion params={params} />
      </Suspense>
    </div>
  )
}

// Lo que no existe, lo que está en la papelera y lo que quien mira no ve se dicen igual: decir «no tienes permiso» confirmaría que existe (como el vehículo).
function NoDisponible() {
  return (
    <EstadoVacio titulo="Esta cotización ya no está disponible: no existe o ya no tienes acceso." />
  )
}

async function Cotizacion({ params }: { params: PageProps<'/cotizaciones/[id]'>['params'] }) {
  await connection()
  const [sesion, { id }] = await Promise.all([requerirSesion(), params])
  if (!z.guid().safeParse(id).success) {
    return <NoDisponible />
  }
  const lectura = await leerHojaDeUnaGuardada(id)
  if (!lectura.ok) {
    if (lectura.error.codigo === 'sin_permiso') {
      return <NoDisponible />
    }
    // Sube al `error.tsx` de la pantalla, que ofrece «Reintentar».
    throw new Error(lectura.error.mensaje)
  }
  const { hoja, inicial } = lectura.data
  const { leadId, vehiculoId } = hoja.cotizacion
  // El cliente y el vehículo sólo se nombran si quien mira los ve (los ids salen de la lectura, así que van después de ella).
  const [cliente, vehiculo, asesor] = await Promise.all([
    clienteDe(sesion.permisos, leadId),
    vehiculoDe(vehiculoId),
    asesorDe(id),
  ])
  // Lo que reciben los huecos de las áreas (acciones de la cabecera, la línea de bajo la cabecera y lo de bajo la hoja); el vehículo, sólo si quien mira lo ve.
  const props = {
    cotizacion: hoja.cotizacion,
    puedeGuardar: hoja.puedeGuardar,
    permisos: sesion.permisos,
    vehiculo: vehiculo === null ? null : { id: vehiculo.id, titulo: vehiculo.titulo },
  }
  return (
    <>
      <RegistrarVisita tipo="cotizacion" id={hoja.cotizacion.id} />
      <RegistrarVisto modulo="cotizaciones" tipo="cotizacion" id={hoja.cotizacion.id} />
      <CabeceraDeLaGuardada
        id={hoja.cotizacion.id}
        numero={hoja.cotizacion.numero}
        clase={hoja.cotizacion.clase}
        actualizadoEn={hoja.cotizacion.actualizadoEn}
        version={hoja.cotizacion.version}
        cadena={hoja.cadena}
        venceEl={hoja.venceEl}
        vencida={hoja.vencida}
        origen={hoja.diseno.origen.nombre}
        cliente={cliente?.nombre ?? null}
        vehiculo={vehiculo?.titulo ?? null}
        acciones={dibujarHuecos(HUECOS_DE_LA_GUARDADA, 'Acciones', props)}
        insignias={dibujarHuecos(HUECOS_DE_LA_GUARDADA, 'Insignias', props)}
      />
      {dibujarHuecos(HUECOS_DE_LA_GUARDADA, 'BajoLaCabecera', props)}
      <ConProveedorDeLaHoja
        origenId={hoja.cotizacion.origenId}
        cotizacionId={hoja.cotizacion.id}
        permisos={sesion.permisos}
        tarjeta={{
          titulo: hoja.cotizacion.titulo,
          cliente: cliente?.nombre ?? null,
          vehiculo: vehiculoDeLaTarjeta(vehiculo),
          asesor,
          numero: hoja.cotizacion.numero,
          vencida: hoja.vencida,
          venceEl: hoja.venceEl,
          guardadaEl: hoja.cotizacion.actualizadoEn,
        }}
      >
        <PantallaDeUnaGuardada
          key={hoja.cotizacion.id}
          hoja={hoja}
          inicial={inicial}
          personaId={sesion.usuarioId}
        />
      </ConProveedorDeLaHoja>
      {dibujarHuecos(HUECOS_DE_LA_GUARDADA, 'Debajo', props)}
    </>
  )
}
