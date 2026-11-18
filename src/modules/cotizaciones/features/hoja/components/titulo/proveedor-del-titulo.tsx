'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { claveDelTitulo, claveDelTituloDeUnaGuardada } from '../../../../entities/claves-de-la-hoja'
import {
  alEscribirElTitulo,
  estadoDelTituloGuardado,
  TITULO_AUTOMATICO,
  tituloMostrado,
  type EstadoDelTitulo,
} from '../../../../entities/titulo-de-la-cotizacion'
import {
  ContextoDelTitulo,
  type TituloDeLaCotizacion,
} from '../../hooks/use-titulo-de-la-cotizacion'

// De quién y de qué hoja es el borrador del título: la nueva (por el vehículo con que se abrió) o una guardada (por su versión, el texto de la base).
type DeLaPestana =
  | { personaId: string; origenId: string; vehiculoAlAbrir: string | null }
  | { personaId: string; cotizacionId: string; actualizadoEn: string }

type Props = {
  children: ReactNode
  deLaPestana: DeLaPestana
  // El título del vehículo elegido (el automático); nulo sin vehículo. En una guardada cuyo vehículo quien mira no ve, el título guardado (la base lo conserva).
  vehiculo: string | null
  // Lo guardado de una guardada; la nueva nace automática.
  titulo?: string | null
  tituloManual?: boolean
  // Quien mira lo puede escribir: sin eso no hay campo ni borrador.
  puede?: boolean
}

const claveDe = (de: DeLaPestana) =>
  'cotizacionId' in de ? claveDelTituloDeUnaGuardada(de) : claveDelTitulo(de)

// El título de la cotización que se edita (T307): su estado (automático o manual), su borrador en la pestaña, el foco que pide «Escribir el título» y el rechazo de la
// base. `src/app` lo pone sobre las barras y la hoja (fuera de la `key` de la hoja: cambiar de vehículo o de cliente lo conserva), con `key` del origen en la nueva. En
// una guardada **no lleva `key`** (remontaría la hoja y su guardado, que sobreviven a la versión nueva): al cambiar la versión (guardar, «Recargar») vuelve a lo guardado
// y su borrador pasa a la clave de esa versión.
export function ProveedorDelTitulo({
  children,
  deLaPestana,
  vehiculo,
  titulo = null,
  tituloManual = false,
  puede = true,
}: Props) {
  const nueva = !('cotizacionId' in deLaPestana)
  const version = 'cotizacionId' in deLaPestana ? deLaPestana.actualizadoEn : null
  // Lo abierto: la versión, la clave del borrador y lo guardado. En la nueva la clave se toma al montarse: elegir otro vehículo en esta hoja no cambia de borrador (el de
  // otra hoja con otro vehículo no se repone encima de lo escrito).
  const [abierto, setAbierto] = useState(() => ({
    version,
    clave: claveDe(deLaPestana),
    inicial: estadoDelTituloGuardado(titulo, tituloManual),
  }))
  const { clave, inicial } = abierto
  const [estado, setEstado] = useState<EstadoDelTitulo>(inicial)
  const [focoPedido, setFocoPedido] = useState(false)
  const [rechazo, setRechazo] = useState<string | null>(null)
  if (version !== abierto.version) {
    const otro = {
      version,
      clave: claveDe(deLaPestana),
      inicial: estadoDelTituloGuardado(titulo, tituloManual),
    }
    setAbierto(otro)
    setEstado(otro.inicial)
    setRechazo(null)
  }
  const { limpiar } = useBorradorDeEstado({
    clave,
    valores: estado,
    guardado: inicial,
    alReponer: (cambios) => {
      setEstado((antes) => ({ ...antes, ...cambios }))
    },
    activo: puede,
  })
  const valor = useMemo<TituloDeLaCotizacion>(
    () => ({
      estado,
      inicial,
      vehiculo,
      mostrado: tituloMostrado(estado, vehiculo),
      puede,
      escribir: (texto) => {
        setEstado(alEscribirElTitulo(texto))
        setRechazo(null)
      },
      focoPedido,
      pedirFoco: () => {
        setFocoPedido(true)
      },
      soltarFoco: () => {
        setFocoPedido(false)
      },
      rechazo,
      ponerRechazo: setRechazo,
      alGuardar: () => {
        limpiar()
        setRechazo(null)
        if (nueva) {
          setEstado(TITULO_AUTOMATICO)
        }
      },
    }),
    [estado, inicial, vehiculo, puede, focoPedido, rechazo, limpiar, nueva],
  )
  return <ContextoDelTitulo value={valor}>{children}</ContextoDelTitulo>
}
