import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import type { Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { alMenosUna, type AlMenosUna } from '../empresa/pestanas'
import { pestanaDe, pestanasVisibles, type PestanaDeFlujos } from './pestanas'
import { SeccionAbierta } from './seccion-abierta'
import { SECCION_DE_FLUJOS } from './seccion'

export const metadata: Metadata = { title: 'Flujos' }

// Configuración › Flujos (5.02). Entra quien tiene alguna de las claves de la sección (`seccion.ts`); «Fases» (el diagrama del flujo, con «Reglas del flujo» y
// «Tipos de documento» en su panel) pide `flujos.configurar` (en algún origen) o `repuestos.configurar`. Con sólo `logistica.catalogos.gestionar` se ven los
// tipos de documento en la página. La base vuelve a exigir lo suyo en cada escritura. Sin ninguna clave, «No tienes permiso» (y la sección no figura en
// Configuración).
export default async function PaginaDeFlujos({ searchParams }: PageProps<'/configuracion/flujos'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!SECCION_DE_FLUJOS.permisos.some((clave) => puede(sesion.permisos, clave))) {
    return <EstadoSinPermiso />
  }
  const visibles = alMenosUna(pestanasVisibles(sesion.permisos))
  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid max-w-3xl gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Flujos</h1>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Las fases por las que avanza cada origen y el flujo de repuestos.
        </p>
      </div>
      {visibles ? (
        <Abierta
          visibles={visibles}
          permisos={sesion.permisos}
          seccion={unParametro(parametros['seccion'])}
          origenPedido={unParametro(parametros['origen'])}
          ambitoPedido={unParametro(parametros['ambito'])}
        />
      ) : (
        <EstadoVacio
          compacto
          titulo="Por ahora no hay nada que configurar aquí con tus permisos."
        />
      )}
    </div>
  )
}

type PropsDeAbierta = {
  visibles: AlMenosUna<PestanaDeFlujos>
  permisos: Permisos
  seccion: string | undefined
  origenPedido: string | undefined
  ambitoPedido: string | undefined
}

// Sin barra de secciones: las que no son «Fases» se abren en el panel del flujo (o, sin «Fases», en la página).
function Abierta({ visibles, permisos, seccion, origenPedido, ambitoPedido }: PropsDeAbierta) {
  return (
    <SeccionAbierta
      pestana={pestanaDe(seccion, visibles)}
      visibles={visibles.map((v: PestanaDeFlujos) => v.clave)}
      seccionPedida={seccion}
      permisos={permisos}
      origenPedido={origenPedido}
      ambitoPedido={ambitoPedido}
    />
  )
}
