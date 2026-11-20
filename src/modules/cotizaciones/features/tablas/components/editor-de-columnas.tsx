'use client'

import { PlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import {
  useFocoTrasMover,
  type Movimiento,
} from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import {
  caminosDeLasColumnas,
  puedeQuitar,
  puedeSumar,
  type AccionDeColumnas,
  type EdicionDeColumnas,
} from '../../../entities/tablas/edicion-de-columnas'
import {
  AVISO_DEL_TOPE_DE_COLUMNAS,
  AYUDA_DE_LOS_TRAMOS,
  esTipoDeColumna,
} from '../../../entities/tablas/estructura'
import { FilaDeColumna } from './fila-de-columna'

type Props = {
  edicion: EdicionDeColumnas
  editar: (accion: AccionDeColumnas) => void
  porCampo: Readonly<Record<string, string>>
  enCurso: boolean
}

// Las columnas de una tabla en su orden (lo usan «Nueva tabla» y «Columnas»): cada fila con su nombre, flechas y «Quitar», y «Sumar una columna» hasta 20. El
// error de la base nombra la columna por su lugar en lo que se manda (`columnas.<i>.<campo>`, sin las que se quitan): cada fila viva lleva ese camino.
export function EditorDeColumnas({ edicion, editar, porCampo, enCurso }: Props) {
  const prefijo = useId()
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null)
  useFocoTrasMover(prefijo, movimiento)
  const sePuedeQuitar = puedeQuitar(edicion)
  const sePuedeSumar = puedeSumar(edicion)
  const ultima = edicion.columnas.length - 1
  const caminos = caminosDeLasColumnas(edicion)
  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="mb-1 text-(length:--text-sm) font-medium">Columnas</legend>
      <p className="text-(length:--text-xs) text-(--color-ink-soft)">{AYUDA_DE_LOS_TRAMOS}</p>
      {porCampo['columnas'] ? (
        <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{porCampo['columnas']}</p>
      ) : null}
      <ol className="grid min-w-0 gap-2">
        {edicion.columnas.map((columna, i) => {
          const llave = columna.llave
          return (
            <FilaDeColumna
              key={llave}
              columna={columna}
              camino={caminos.get(llave) ?? null}
              numero={i + 1}
              porCampo={porCampo}
              prefijo={prefijo}
              puedeSubir={i > 0}
              puedeBajar={i < ultima}
              puedeQuitar={sePuedeQuitar}
              enCurso={enCurso}
              alMover={(direccion) => {
                editar({ tipo: 'mover', llave, hacia: direccion === 'subir' ? -1 : 1 })
                setMovimiento((antes) => ({
                  id: llave,
                  direccion,
                  veces: (antes?.veces ?? 0) + 1,
                }))
              }}
              alQuitar={() => {
                editar({ tipo: 'quitar', llave })
              }}
              alNoQuitar={() => {
                editar({ tipo: 'no_quitar', llave })
              }}
              alEscribirEtiqueta={(etiqueta) => {
                editar({ tipo: 'escribir_etiqueta', llave, etiqueta })
              }}
              alEscribirClave={(clave) => {
                editar({ tipo: 'escribir_clave', llave, clave })
              }}
              alElegirTipo={(tipo) => {
                if (esTipoDeColumna(tipo))
                  editar({ tipo: 'elegir_tipo', llave, tipoDeColumna: tipo })
              }}
            />
          )
        })}
      </ol>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-8"
          disabled={!sePuedeSumar || enCurso}
          onClick={() => {
            editar({ tipo: 'sumar' })
          }}
        >
          <PlusIcon aria-hidden className="size-4" />
          Sumar una columna
        </Button>
        {sePuedeSumar ? null : (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            {AVISO_DEL_TOPE_DE_COLUMNAS}
          </p>
        )}
      </div>
    </fieldset>
  )
}
