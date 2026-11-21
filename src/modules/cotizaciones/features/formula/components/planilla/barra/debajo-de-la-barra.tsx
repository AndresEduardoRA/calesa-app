'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import type { FilaDeLaHoja } from '../../../../../entities/formula/hoja-de-la-planilla'
import type { Planilla } from '../../../hooks/use-planilla'
import { CamposDeLaFila } from '../comunes/campos-de-la-fila'
import { EstadoDelTexto } from '../comunes/estado-del-texto'

const SOLTADOS: Record<string, string> = {
  sobrescribible: 'se puede modificar',
  condicion: 'interruptor',
  solo_en: 'variantes',
  formato: 'formato',
}

type Props = {
  planilla: Planilla
  fila: FilaDeLaHoja
  // Lo que la celda activa no deja escribir (D, un tipo de cambio…), o nulo.
  motivo: string | null
  puedeCambiarTiposDeCambio: boolean
}

// Lo que va bajo la barra sin nada escrito: lo que el último cambio soltó de la fila, lo que dice su texto tras un ⚙ (reescrito o «ya no manda»), sus campos si la
// celda no se escribe y, en un tipo de cambio, el camino a Empresa › Monedas (no se versiona).
export function DebajoDeLaBarra({ planilla, fila, motivo, puedeCambiarTiposDeCambio }: Props) {
  const { aplicada, trabajo } = planilla.editor
  const soltados = aplicada?.id === fila.id ? aplicada.soltados : []
  const texto = planilla.editor.filas.find((f) => f.id === fila.id)?.texto
  return (
    <div className="grid min-w-0 gap-1 text-(length:--text-sm) text-(--color-ink-soft)">
      {soltados.length === 0 ? null : (
        <p>Al aplicar se soltó: {soltados.map((s) => SOLTADOS[s] ?? s).join(', ')}.</p>
      )}
      {texto === undefined || texto.modo === 'campos' ? null : (
        <EstadoDelTexto texto={texto} sinTexto />
      )}
      {motivo === null ? null : (
        <CamposDeLaFila nodo={fila.nodo} valor={trabajo.params.constantes[fila.id] ?? null} />
      )}
      {fila.tipo === 'tipo_de_cambio' && puedeCambiarTiposDeCambio ? (
        <p>
          El tipo de cambio no se versiona: cambia varias veces por semana.{' '}
          <Link
            href={RUTAS.monedasDeEmpresa as Route}
            className="text-(--color-primario-ink) underline"
          >
            Cambiar en Empresa › Monedas
          </Link>
        </p>
      ) : null}
    </div>
  )
}
