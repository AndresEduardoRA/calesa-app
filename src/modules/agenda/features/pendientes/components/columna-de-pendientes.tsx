'use client'

import { useRouter } from 'next/navigation'
import { useId } from 'react'
import type { Resultado } from '@/shared/lib/errores'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { GRUPOS_DE_PENDIENTES, type PendientesDeAgenda } from '../../../entities/pendientes'
import type { BaseDeEnlace } from '../../calendario/enlace-de-panel'
import { useCompletarPendiente } from '../hooks/use-completar-pendiente'
import { GrupoDePendientes } from './grupo-de-pendientes'

type Props = {
  lectura: Resultado<PendientesDeAgenda>
  // La vista, la fecha y lo elegido: cada pendiente abre su panel sin salir de lo que se mira.
  base: BaseDeEnlace
  deTodos: boolean
  zona: string
  // El instante en que el servidor leyó (ISO) y el fin de hoy en la zona de la empresa (el borde de los recordatorios, también de «Ver más»).
  ahora: string
  hasta: string
}

// «Pendientes»: lo que está por hacer de quien mira (también con «De todos»), al costado de la hoja del día o debajo en el celular. «Vencidas», «Recordatorios» y
// «Sin fecha», cada uno con «Completar» en un toque y «Ver más»; un grupo vacío no se dibuja. Sin marcas de visto: es una lista de cosas por hacer.
export function ColumnaDePendientes({ lectura, base, deTodos, zona, ahora, hasta }: Props) {
  const router = useRouter()
  const id = useId()
  const completar = useCompletarPendiente()
  const conAlgo = lectura.ok
    ? GRUPOS_DE_PENDIENTES.flatMap((grupo) => {
        const pagina = lectura.data[grupo]
        return pagina && pagina.filas.some((fila) => !completar.oculto(fila.id))
          ? [{ grupo, pagina }]
          : []
      })
    : []
  return (
    <section aria-labelledby={id} className="grid min-w-0 content-start gap-3">
      <div>
        <h2 id={id} className="text-(length:--text-base) font-semibold text-(--color-ink)">
          Pendientes
        </h2>
        {deTodos ? (
          <p className="text-(length:--text-xs) text-(--color-ink-soft)">Los tuyos.</p>
        ) : null}
      </div>
      {!lectura.ok ? (
        <EstadoError
          compacto
          titulo="No pudimos leer tus pendientes"
          descripcion={lectura.error.mensaje}
          alReintentar={() => {
            router.refresh()
          }}
        />
      ) : conAlgo.length === 0 ? (
        <EstadoVacio
          compacto
          titulo="Nada pendiente."
          descripcion="Lo vencido y lo que no tiene fecha aparece aquí."
        />
      ) : (
        conAlgo.map(({ grupo, pagina }) => (
          <GrupoDePendientes
            key={grupo}
            grupo={grupo}
            pagina={pagina}
            base={base}
            ahora={ahora}
            zona={zona}
            hasta={hasta}
            completar={completar}
          />
        ))
      )}
    </section>
  )
}
