'use client'

import { Interruptor } from '@/shared/ui/interruptor'
import { AVISO_DE_PREFERENCIAS } from '../../../entities/motivos'
import { estaEncendido } from '../../../entities/preferencia-de-push'
import { TIPOS_DE_NOTIFICACION } from '../../../entities/tipos'
import type { PreferenciasPorTipo as Preferencias } from '../hooks/use-preferencias-por-tipo'

type Props = {
  preferencias: Preferencias
  // Sin `notificaciones.push` quedan a la vista, deshabilitados, con el motivo.
  motivoSiNoPuede: string | null
}

const TIPOS = Object.entries(TIPOS_DE_NOTIFICACION)

// Un interruptor de push por tipo del catálogo, dentro del modal «Notificaciones». Lo que aquí se apaga sólo detiene el push: la campana sigue mostrándolo todo.
export function PreferenciasPorTipo({ preferencias, motivoSiNoPuede }: Props) {
  const { apagados, guardando, cambiar } = preferencias
  return (
    <section aria-labelledby="avisos-por-tipo" className="grid gap-3">
      <div className="grid gap-0.5">
        <h3 id="avisos-por-tipo" className="text-(length:--text-sm) font-medium text-(--color-ink)">
          Avisos por tipo
        </h3>
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">{AVISO_DE_PREFERENCIAS}</p>
      </div>
      {TIPOS.map(([tipo, { etiqueta, descripcion }]) => (
        <Interruptor
          key={tipo}
          titulo={etiqueta}
          ayuda={motivoSiNoPuede ?? descripcion}
          valor={estaEncendido(apagados, tipo)}
          alCambiar={(encendido) => void cambiar(tipo, encendido)}
          deshabilitado={motivoSiNoPuede !== null || guardando.has(tipo)}
        />
      ))}
    </section>
  )
}
