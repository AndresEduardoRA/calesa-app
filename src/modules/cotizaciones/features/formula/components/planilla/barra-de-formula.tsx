'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/shared/ui/button'
import { MasAcciones } from '@/shared/ui/lista'
import { Textarea } from '@/shared/ui/textarea'
import type { FilaAbierta } from '../../hooks/use-editor-de-la-formula'
import type { FilaParaDibujar } from '../../hooks/use-editor-de-la-formula.soporte'
import { CamposDeLaFila } from '../editor/campos-de-la-fila'
import { ErrorDeLaFila } from '../editor/error-de-la-fila'
import { EstadoDelTexto } from '../editor/estado-del-texto'

type Props = {
  // La fila elegida (o la que tiene texto sin aplicar) y su número; nula si no hay ninguna.
  fila: FilaParaDibujar | null
  numero: number | null
  // La fila abierta del editor, si es esta: hay texto sin aplicar (y, tras «Aplicar», su error).
  abierta: FilaAbierta | null
  // Se puede empezar a escribir (nada más abierto ni guardándose); si no, por qué espera.
  motivo: string | null
  // «Aplica o descarta el cambio de «X» antes de elegir otra fila.»: al intentar elegir otra con texto sin aplicar.
  aviso: string | null
  // Cambia cada vez que el foco debe volver al texto (el aviso de arriba).
  enfocar: number
  deDondeSale: string
  // Lo que el último «Aplicar» soltó de esta fila.
  soltados: readonly string[]
  alAbrir: (id: string) => void
  alAplicar: (texto: string, confirmaPisar?: boolean) => void
  alCancelar: () => void
  alSumarDebajo: (id: string) => void
}

const CAMPOS: Record<string, string> = {
  sobrescribible: 'se puede modificar',
  condicion: 'interruptor',
  solo_en: 'variantes',
  formato: 'formato',
}

const textoInicial = (fila: FilaParaDibujar) => ('texto' in fila.texto ? fila.texto.texto : '')

// Lo que va bajo el texto: por qué espera, el error del último «Aplicar» y, sin texto sin aplicar, sus campos o lo que se sabe de su texto (tras un ⚙).
function DebajoDelTexto({
  fila,
  abierta,
  uid,
  motivo,
}: {
  fila: FilaParaDibujar
  abierta: FilaAbierta | null
  uid: string
  motivo: string | null
}) {
  const error = abierta?.error ?? null
  return (
    <>
      {motivo === null ? null : (
        <p id={`${uid}-espera`} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </p>
      )}
      {error ? <ErrorDeLaFila id={`${uid}-error`} error={error} formatos={fila.formatos} /> : null}
      {abierta !== null ? null : fila.texto.modo === 'campos' ? (
        <CamposDeLaFila nodo={fila.nodo} valor={fila.valor} />
      ) : (
        <EstadoDelTexto texto={fila.texto} sinTexto />
      )}
    </>
  )
}

function BotonesDeLaBarra({
  pisa,
  alAplicar,
  alDescartar,
}: {
  pisa: boolean
  alAplicar: () => void
  alDescartar: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" className="min-h-11 md:min-h-9" onClick={alAplicar}>
        {pisa ? 'Pisar el valor' : 'Aplicar'}
      </Button>
      <Button type="button" variant="outline" className="min-h-11 md:min-h-9" onClick={alDescartar}>
        Descartar
      </Button>
    </div>
  )
}

// Lo que el texto dice al lector: si no compiló (salvo «Pisar el valor», que no es un error del texto), el error y por qué espera.
function ariaDelTexto(uid: string, conError: boolean, pisa: boolean, espera: boolean) {
  const describe = [conError ? `${uid}-error` : null, espera ? `${uid}-espera` : null].filter(
    Boolean,
  )
  return {
    'aria-invalid': conError && !pisa ? true : undefined,
    'aria-describedby': describe.length === 0 ? undefined : describe.join(' '),
  }
}

// Ctrl/Cmd+Enter aplica; Esc descarta el texto sin aplicar.
const teclasDeLaBarra =
  (conTexto: boolean, aplicar: () => void, descartar: () => void) =>
  (evento: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evento.key === 'Escape' && conTexto) {
      evento.preventDefault()
      descartar()
    } else if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault()
      aplicar()
    }
  }

// El texto de la fila elegida, como la barra de fórmula de Excel: muestra su texto vigente; el primer cambio la abre en el editor («hay texto sin aplicar»), «Aplicar»
// o Ctrl/Cmd+Enter la compila con `compilarFila()` y Esc o «Descartar» vuelven al texto de la fila. El error queda debajo, con lo tipeado; `pisa_un_valor` pide
// «Pisar el valor». Una fila a la vez, como el editor.
function TextoDeLaBarra(p: Props & { fila: FilaParaDibujar }) {
  const { fila, abierta } = p
  const [tipeado, setTipeado] = useState<string | null>(null)
  const campo = useRef<HTMLTextAreaElement>(null)
  const uid = useId()
  const error = abierta?.error ?? null
  const pisa = error?.codigo === 'pisa_un_valor'
  const valor = abierta !== null && tipeado !== null ? tipeado : textoInicial(fila)
  const espera = abierta === null ? p.motivo : null
  useEffect(() => {
    if (p.enfocar > 0 || error !== null) campo.current?.focus()
  }, [p.enfocar, error])
  const aplicar = (confirmaPisar = false) => {
    if (abierta !== null) p.alAplicar(valor, confirmaPisar)
  }
  const alAplicarSinPisar = () => {
    aplicar()
  }
  const descartar = () => {
    setTipeado(null)
    p.alCancelar()
  }
  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={`${uid}-texto`} className="sr-only">
        Texto de {fila.etiqueta}
      </label>
      <Textarea
        ref={campo}
        id={`${uid}-texto`}
        rows={2}
        className="min-h-11 font-mono"
        spellCheck={false}
        value={valor}
        readOnly={espera !== null}
        {...ariaDelTexto(uid, error !== null, pisa, espera !== null)}
        onChange={(evento) => {
          if (espera !== null) return
          if (abierta === null) p.alAbrir(fila.id)
          setTipeado(evento.target.value)
        }}
        onKeyDown={teclasDeLaBarra(abierta !== null, alAplicarSinPisar, descartar)}
      />
      <DebajoDelTexto fila={fila} abierta={abierta} uid={uid} motivo={espera} />
      {abierta === null ? null : (
        <BotonesDeLaBarra
          pisa={pisa}
          alAplicar={() => {
            aplicar(pisa)
          }}
          alDescartar={descartar}
        />
      )}
    </div>
  )
}

// La barra de fórmula de la planilla, arriba de la tabla: el número, la etiqueta y el id de la fila elegida y su texto. Una fila que no se escribe (un dato, un tipo
// de cambio, una tabla) dice de dónde sale. «Sumar fila debajo» va en su «⋯».
export function BarraDeFormula(p: Props) {
  const { fila } = p
  return (
    <section
      aria-label="Barra de fórmula"
      className="grid min-w-0 gap-2 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)"
    >
      {fila === null ? (
        <p className="text-(--color-ink-soft)">Elige una fila para ver su fórmula.</p>
      ) : (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {p.numero === null ? null : (
              <span className="font-mono text-(length:--text-xs) text-(--color-ink-faint)">
                {p.numero}
              </span>
            )}
            <span className="font-semibold break-words text-(--color-ink)">{fila.etiqueta}</span>
            <code className="break-all text-(--color-ink-soft)">{fila.id}</code>
            <span className="ml-auto">
              <MasAcciones
                nombre={`Más acciones de ${fila.etiqueta}`}
                conBorde
                acciones={[
                  {
                    tipo: 'accion',
                    clave: 'sumar',
                    etiqueta: 'Sumar fila debajo',
                    deshabilitada: p.motivo !== null,
                    alElegir: () => {
                      p.alSumarDebajo(fila.id)
                    },
                  },
                ]}
              />
            </span>
          </div>
          {p.aviso === null ? null : (
            <p
              role="alert"
              className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(--color-aviso-ink)"
            >
              {p.aviso}
            </p>
          )}
          {fila.texto.modo === 'solo_lectura' ? (
            <p className="text-(--color-ink)">Esta fila no se escribe: {p.deDondeSale}.</p>
          ) : (
            <TextoDeLaBarra key={fila.id} {...p} fila={fila} />
          )}
          {p.soltados.length === 0 ? null : (
            <p className="text-(--color-ink-soft)">
              Esta fila dejó de llevar: {p.soltados.map((c) => CAMPOS[c] ?? c).join(', ')}.
            </p>
          )}
        </>
      )}
    </section>
  )
}
