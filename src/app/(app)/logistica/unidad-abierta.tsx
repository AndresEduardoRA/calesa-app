import type { Route } from 'next'
import Link from 'next/link'
import { puede } from '@/modules/equipo'
import { RegistrarVisto } from '@/modules/equipo/pantallas/visto-de-la-ficha'
import { leerFasesDeOrigen, leerFlujoDeOrigen } from '@/modules/flujos'
import { esHuecoConocido, leerUnidad } from '@/modules/logistica'
import { PanelDeLaUnidad } from '@/modules/logistica/pantallas/unidad'
import { getOrigenes } from '@/modules/origenes'
import { EsqueletoDeRelacionados } from '@/modules/vehiculos/pantallas/relacionados'
import { Suspense } from 'react'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { RelacionadosDelVehiculoServidor } from '../_relacionados/relacionados-del-vehiculo'
import { HUECOS_DE_LA_UNIDAD, huecosDeLaUnidad } from './huecos-de-la-unidad'

// Lo que no existe, lo que está en la papelera y lo que la persona no ve se muestran igual: decir «no tienes permiso» confirmaría que existe.
export function UnidadNoDisponible() {
  return (
    <EstadoVacio
      titulo="Este vehículo ya no está disponible"
      descripcion="No existe o ya no tienes acceso."
      accion={
        <Link href={RUTAS.logistica as Route} className={buttonVariants({ variant: 'outline' })}>
          Ir a Logística
        </Link>
      }
    />
  )
}

// La unidad con ese id y su panel, o el estado que toque (6.01). La usan la página de la unidad y el drawer de gastos. Exige las dos cosas (D3): la fila bajo la
// RLS de `vehiculos` (`vehiculos.ver`) y `logistica.ver` en el origen de la unidad. Un error de lectura sube al `error.tsx` de `(app)`, que ofrece «Reintentar»; el del flujo del
// origen no tumba el panel: deja apagados los huecos que piden una regla y lo dice.
export async function UnidadAbierta({
  id,
  permisos,
  huecoAbierto,
  registraElVisto = false,
}: {
  id: string
  permisos: Permisos
  // `?hueco=documentos`: el bloque que un enlace (la bandeja del día) pide ver abierto desde el principio. Una clave desconocida se ignora.
  huecoAbierto?: string
  // Sólo la página de la unidad registra el «visto» del contexto logística; el drawer de gastos no: ahí lo registra la lista, por `?vehiculo=`.
  registraElVisto?: boolean
}) {
  const unidad = datosO(await leerUnidad(id))
  if (!unidad) {
    return <UnidadNoDisponible />
  }
  if (!puede(permisos, 'logistica.ver', unidad.origenId)) {
    return <EstadoSinPermiso />
  }
  const [origenes, fases, flujo] = await Promise.all([
    getOrigenes(true),
    leerFasesDeOrigen(unidad.origenId),
    leerFlujoDeOrigen(unidad.origenId),
  ])
  const origen = datosO(origenes).find((uno) => uno.id === unidad.origenId)
  const fase = datosO(fases).find((una) => una.id === unidad.faseId) ?? null
  const { huecos, aviso } = huecosDeLaUnidad(HUECOS_DE_LA_UNIDAD, { unidad, permisos, flujo })
  const conElPedido = esHuecoConocido(huecoAbierto)
    ? huecos.map((hueco) =>
        hueco.clave === huecoAbierto ? { ...hueco, abiertoAlInicio: true } : hueco,
      )
    : huecos
  return (
    <>
      {registraElVisto ? (
        <RegistrarVisto modulo="logistica" tipo="vehiculo" id={unidad.id} />
      ) : null}
      <PanelDeLaUnidad
        unidad={unidad}
        origen={origen?.nombre ?? ''}
        fase={fase}
        huecos={conElPedido}
        aviso={aviso}
        // Los relacionados de un vehículo (no de un ítem de repuesto), bajo la cabecera: el mismo bloque que la ficha y el resumen. La confirmación de desvincular y los selectores de leads
        // son de la ficha: acá llevan a ella.
        relacionados={
          unidad.tipo === 'vehiculo' && puede(permisos, 'leads.ver') ? (
            <Suspense fallback={<EsqueletoDeRelacionados />}>
              <RelacionadosDelVehiculoServidor
                vehiculoId={unidad.id}
                permisos={permisos}
                lugar="logistica"
              />
            </Suspense>
          ) : null
        }
      />
    </>
  )
}
