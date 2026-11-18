import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'
import {
  CLAVE_DE_LEAD,
  CLAVE_DE_ORIGEN,
  CLAVE_DE_VEHICULO,
  origenElegido,
  origenesParaCotizar,
} from '@/modules/cotizaciones'
import {
  EsqueletoDeHoja,
  FormulaSinPublicar,
  PantallaDeCotizar,
  PestanasDeOrigen,
  ProveedorDelTitulo,
} from '@/modules/cotizaciones/pantallas/cotizar'
import { HUECOS_DE_FORMULA_EN_LA_HOJA } from '@/modules/cotizaciones/pantallas/formula-hoja'
import { nombreVisible, requerirSesion } from '@/modules/equipo'
import { type ClienteElegido } from '@/modules/leads'
import { BarraDelCliente } from '@/modules/leads/pantallas/cotizar'
import { getOrigenes, type OrigenResumen } from '@/modules/origenes'
import { elegidoDesde } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { ConProveedorDeLaHoja } from '../con-proveedor-de-la-hoja'
import { AvisoDeSubastaDeLaHoja } from '../aviso-de-subasta'
import { vehiculoDeLaTarjeta } from '../datos-de-la-tarjeta'
import { idDeUrl, type Quien, type VehiculoDeLaUrl } from '../vehiculo-de-la-hoja'
import { BarraConHistorial } from './barra-con-historial'
import {
  camposQueSeEligen,
  leerLoDeLaHoja,
  paraElegirDe,
  reglasDeLaHoja,
} from './lecturas-de-la-hoja'

// Lo que el área `formula` llena en la hoja (`pantallas/formula-hoja.ts`): el enlace de «Falta publicar la fórmula».
const { EnlaceSinPublicar } = HUECOS_DE_FORMULA_EN_LA_HOJA

export const metadata: Metadata = { title: 'Cotizar' }

// La hoja de cotizar (`docs/UX.md` › «Cotizar»): una pestaña por origen donde la persona cotiza y, de cada uno, la hoja que dibuja su fórmula publicada. `?origen=`
// elige el origen; `?lead=` y `?vehiculo=` llegan de la ficha del lead o del vehículo, o el vehículo se elige en la barra de arriba de la hoja (su panel, `?panel=vehiculo`,
// 4.14-2a): se validan y se llevan. Sin entrada en la navegación todavía: se llega por URL. Guarda con el lead de la URL (4.13-3b); sin él, «Guardar» dice por qué no.
export default function PaginaDeCotizar({ searchParams }: PageProps<'/cotizaciones/nuevo'>) {
  return (
    <div className="grid min-w-0 gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Cotizar</h1>
      <Suspense fallback={<EsqueletoDeHoja />}>
        <Hoja parametros={searchParams} />
      </Suspense>
    </div>
  )
}

async function Hoja({
  parametros,
}: {
  parametros: PageProps<'/cotizaciones/nuevo'>['searchParams']
}) {
  await connection()
  const [sesion, url] = await Promise.all([requerirSesion(), parametros])
  const origenes = origenesParaCotizar(sesion.permisos, datosO(await getOrigenes()))
  const origen = origenElegido(origenes, unParametro(url[CLAVE_DE_ORIGEN]))
  if (!origen) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para cotizar en ningún origen. Pídeselo a quien administra los roles." />
    )
  }
  return (
    <HojaDelOrigen
      sesion={sesion}
      asesor={nombreVisible(sesion)}
      url={url}
      origenes={origenes}
      origen={origen}
    />
  )
}

// «Falta publicar la fórmula»: con permiso para configurar, el enlace es el que llena el área `formula` (C7 del 4.15-6).
function SinPublicar({
  origenId,
  hoja,
}: {
  origenId: string
  hoja: { origen: { nombre: string }; puedeConfigurar: boolean }
}) {
  return (
    <FormulaSinPublicar
      origen={hoja.origen.nombre}
      puedeConfigurar={hoja.puedeConfigurar}
      accion={
        hoja.puedeConfigurar && EnlaceSinPublicar ? (
          <EnlaceSinPublicar origenId={origenId} />
        ) : undefined
      }
    />
  )
}

// El título del vehículo elegido para la banda de la tarjeta (4.18-2); sin vehículo, nulo.
function tituloDelElegido(elegido: { vehiculo: { titulo: string } } | null) {
  return elegido?.vehiculo.titulo ?? null
}

// El título de la cotización (T307) sobre las barras y la hoja, fuera de la `key` de la hoja: cambiar de vehículo o de cliente lo conserva. Va con `key` del origen (otra
// pestaña de origen es otra cotización); su borrador, por el vehículo con que se abrió la hoja, y el automático es el título del elegido.
function ConElTitulo({
  sesion,
  origen,
  elegido,
  children,
}: {
  sesion: { usuarioId: string }
  origen: { id: string }
  elegido: VehiculoDeLaUrl
  children: ReactNode
}) {
  return (
    <ProveedorDelTitulo
      deLaPestana={{
        personaId: sesion.usuarioId,
        origenId: origen.id,
        vehiculoAlAbrir: elegido?.vehiculo.id ?? null,
      }}
      vehiculo={tituloDelElegido(elegido)}
    >
      {children}
    </ProveedorDelTitulo>
  )
}

// La barra del cliente de la hoja: lo que puede hacer quien mira con los leads, y si su rol no deja guardar sin cliente en este origen.
function BarraDelClienteDeLaHoja({
  cliente,
  permisos,
  obligatorio,
}: {
  cliente: ClienteElegido | null
  permisos: Permisos
  obligatorio: boolean
}) {
  return (
    <BarraDelCliente
      elegido={cliente}
      puedeVer={puede(permisos, 'leads.ver')}
      numeroGlobal={puede(permisos, 'leads.numero_global.ver')}
      puedeCrear={puede(permisos, 'leads.crear')}
      claveDeLaUrl={CLAVE_DE_LEAD}
      obligatorio={obligatorio}
    />
  )
}

// Las dos barras de arriba de la hoja y el aviso de subasta cerrada: fuera de la hoja (`[data-hoja]`) y del componente con `key`, así elegir otro vehículo o cliente no la vuelve a
// montar. Cada barra dice «Obligatorio» si el rol de quien mira no puede guardar sin ese vínculo en este origen.
function BarrasDeLaHoja({
  sesion,
  origen,
  elegido,
  cliente,
  reglas,
}: {
  sesion: { permisos: Permisos }
  origen: OrigenResumen
  elegido: VehiculoDeLaUrl
  cliente: ClienteElegido | null
  reglas: Pick<Awaited<ReturnType<typeof leerLoDeLaHoja>>, 'conteo' | 'alta'> & {
    obligatorios: { lead: boolean; vehiculo: boolean }
    paraElegir: ReturnType<typeof paraElegirDe>
    abierta: string
  }
}) {
  const { obligatorios, conteo, alta, paraElegir, abierta } = reglas
  return (
    <>
      <BarraConHistorial
        origen={origen}
        elegido={elegido ? elegidoDesde(elegido.vehiculo) : null}
        conteo={conteo}
        alta={alta}
        puedeVer={puede(sesion.permisos, 'vehiculos.ver', origen.id)}
        paraElegir={paraElegir}
        abierta={abierta}
        obligatorio={obligatorios.vehiculo}
      />
      <AvisoDeSubastaDeLaHoja elegido={elegido} origen={origen} permisos={sesion.permisos} />
      <BarraDelClienteDeLaHoja
        cliente={cliente}
        permisos={sesion.permisos}
        obligatorio={obligatorios.lead}
      />
    </>
  )
}

// Lo que la tarjeta de la hoja nueva nombra: el vehículo elegido (con lote y VIN), quien cotiza y el cliente, si quien mira los ve. El título no: la tarjeta lee el
// que se está escribiendo.
function tarjetaDeLaHojaNueva({
  elegido,
  cliente,
  asesor,
}: {
  elegido: { vehiculo: { titulo: string; lote: string | null; vin: string | null } } | null
  cliente: { nombre: string } | null
  asesor: string
}) {
  return {
    vehiculo: vehiculoDeLaTarjeta(elegido === null ? null : elegido.vehiculo),
    asesor,
    cliente: cliente === null ? null : cliente.nombre,
  }
}

// La hoja del origen elegido, con sus dos barras (vehículo y cliente) y las pestañas de origen.
async function HojaDelOrigen({
  sesion,
  asesor,
  url,
  origenes,
  origen,
}: {
  sesion: Quien & { permisos: Permisos }
  // «Asesor:» de la tarjeta: quien cotiza.
  asesor: string
  url: Awaited<PageProps<'/cotizaciones/nuevo'>['searchParams']>
  origenes: readonly OrigenResumen[]
  origen: OrigenResumen
}) {
  const lead = idDeUrl(url[CLAVE_DE_LEAD])
  const vehiculo = idDeUrl(url[CLAVE_DE_VEHICULO])
  const { apertura, vehiculoSoltado, leido, conteo, alta, layout, cliente } = await leerLoDeLaHoja(
    sesion,
    origen,
    { lead, vehiculo },
  )
  if (apertura.tipo === 'sin_permiso') {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para cotizar en este origen. Pídeselo a quien administra los roles." />
    )
  }
  if (apertura.tipo === 'error') {
    // Sube al `error.tsx` de la pantalla, que ofrece «Reintentar».
    throw new Error(apertura.error.mensaje)
  }
  // Un lead que no se ve se suelta, como el vehículo: ni la hoja ni las pestañas de origen lo llevan.
  const leadUsado = cliente?.id ?? null
  const pestanas = <PestanasDeOrigen origenes={origenes} actual={origen.id} leadId={leadUsado} />
  if (apertura.tipo === 'sin_publicar') {
    return (
      <>
        {pestanas}
        <SinPublicar origenId={origen.id} hoja={apertura.hoja} />
      </>
    )
  }
  const vehiculoUsado = vehiculoSoltado ? null : vehiculo
  const elegido = vehiculoSoltado ? null : leido
  const paraElegir = paraElegirDe(apertura.hoja, elegido, layout)
  const { obligatorios, elecciones } = reglasDeLaHoja(sesion.permisos, origen.id)
  return (
    <>
      {pestanas}
      <ConElTitulo key={origen.id} sesion={sesion} origen={origen} elegido={elegido}>
        <BarrasDeLaHoja
          sesion={sesion}
          origen={origen}
          elegido={elegido}
          cliente={cliente}
          reglas={{ obligatorios, conteo, alta, paraElegir, abierta: apertura.hoja.abierta }}
        />
        <ConProveedorDeLaHoja
          origenId={origen.id}
          cotizacionId={null}
          permisos={sesion.permisos}
          tarjeta={tarjetaDeLaHojaNueva({ elegido, cliente, asesor })}
        >
          <PantallaDeCotizar
            key={`${origen.id}:${leadUsado ?? '-'}:${vehiculoUsado ?? '-'}`}
            hoja={apertura.hoja}
            inicial={apertura.inicial}
            vehiculoId={vehiculoUsado}
            vehiculoSoltado={vehiculoSoltado}
            leadId={leadUsado}
            obligatorios={obligatorios}
            elecciones={elecciones}
            personaId={sesion.usuarioId}
            // La celda sin valor por un dato que quien mira elige en el panel dice dónde se elige (4.14-2c3).
            seEligen={camposQueSeEligen(paraElegir)}
          />
        </ConProveedorDeLaHoja>
      </ConElTitulo>
    </>
  )
}
