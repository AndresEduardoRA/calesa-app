'use client'

import { useId } from 'react'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import type { SimpleEnBorrador } from '../../../../../entities/plantilla/edicion/borradores-de-la-celda'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { CLASE_DEL_MOTIVO, DatoElegible } from './dato-elegible'
import { OpcionesEnFila } from './opciones-en-fila'

type Props = {
  // «Mostrar» o «Si no, mostrar»: el nombre del grupo de botones.
  etiqueta: string
  contenido: SimpleEnBorrador
  motivo: string | null
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  // El selector del dato, abierto (uno a la vez en el armador).
  abierto: boolean
  alAbrir: () => void
  alCerrar: () => void
  clave: string
  alCambiar: (c: SimpleEnBorrador, clave?: string) => void
}

const TIPOS = [
  { valor: 'texto', texto: 'Texto' },
  { valor: 'dato', texto: 'Dato' },
  { valor: 'vacio', texto: 'Nada' },
] as const

// Lo que muestra una rama o el «si no»: Texto (vacío vale: la celda queda en blanco), Dato (elegido en línea) o Nada.
export function MostrarDeLaRama({
  etiqueta,
  contenido,
  motivo,
  contexto,
  nombrados,
  abierto,
  alAbrir,
  alCerrar,
  clave,
  alCambiar,
}: Props) {
  const id = useId()
  return (
    <div className="grid min-w-0 gap-2">
      <OpcionesEnFila
        etiqueta={etiqueta}
        valor={contenido.tipo}
        opciones={TIPOS}
        alElegir={(t) => {
          if (t === contenido.tipo) return
          if (t === 'dato') alAbrir()
          alCambiar(
            t === 'texto'
              ? { tipo: 'texto', texto: '' }
              : t === 'dato'
                ? { tipo: 'dato', dato: null }
                : { tipo: 'vacio' },
          )
        }}
      />
      {contenido.tipo === 'texto' ? (
        <div className="grid min-w-0 gap-1">
          <Label htmlFor={id}>Texto que muestra</Label>
          <Textarea
            id={id}
            rows={2}
            value={contenido.texto}
            aria-invalid={motivo !== null}
            aria-describedby={motivo === null ? undefined : `${id}-motivo`}
            onChange={(e) => {
              alCambiar({ tipo: 'texto', texto: e.target.value }, clave)
            }}
          />
          {motivo === null ? null : (
            <p id={`${id}-motivo`} className={CLASE_DEL_MOTIVO}>
              {motivo}
            </p>
          )}
        </div>
      ) : null}
      {contenido.tipo === 'dato' ? (
        <DatoElegible
          etiqueta={`${etiqueta}: el dato`}
          dato={contenido.dato}
          contexto={contexto}
          nombrados={nombrados}
          abierto={abierto}
          alAbrir={alAbrir}
          alCerrar={alCerrar}
          alElegir={(dato) => {
            alCambiar({ tipo: 'dato', dato })
          }}
          motivo={motivo}
        />
      ) : null}
    </div>
  )
}
