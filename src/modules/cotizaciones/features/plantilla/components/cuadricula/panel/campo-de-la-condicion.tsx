'use client'

import { useId, useMemo } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useRegional } from '@/shared/ui/regional'
import type { DatoDeLaCelda } from '../../../../../entities/cuadricula-de-la-tarjeta'
import {
  condicionCompleta,
  conSobre,
  datoQueYaNoEsta,
  operadoresPara,
  opcionesPara,
  type CondicionEnBorrador,
  type Motivos,
} from '../../../../../entities/plantilla/edicion/condiciones'
import {
  nodosParaElegir,
  VARIABLES_PARA_ELEGIR,
} from '../../../../../entities/plantilla/edicion/datos-para-elegir'
import {
  fraseDeLaCondicion,
  NOMBRES_DE_ES,
} from '../../../../../entities/plantilla/edicion/frases-de-las-condiciones'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { CLASE_DEL_MOTIVO, YA_NO_ESTA } from './dato-elegible'
import { CLASE_DE_LA_ELECCION, Eleccion } from './eleccion'

type Props = {
  // Su lugar en la regla, para los motivos: `si.0`, `ramas.1.si.2`.
  lugar: string
  numero: number
  condicion: CondicionEnBorrador
  motivos: Motivos
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  // La clave que junta en un solo paso lo que se tipea en su número.
  clave: string
  alCambiar: (c: CondicionEnBorrador, clave?: string) => void
}

const valorDe = (d: DatoDeLaCelda | null): string =>
  d === null ? '' : 'variable' in d ? `v:${d.variable}` : `n:${d.nodo}`

const datoDe = (valor: string): DatoDeLaCelda | null => {
  if (valor.startsWith('v:')) return { tipo: 'dato', variable: valor.slice(2) }
  if (valor.startsWith('n:')) return { tipo: 'dato', nodo: valor.slice(2), mostrar: 'monto' }
  return null
}

type PropsDeLoQueMira = Pick<Props, 'contexto' | 'nombrados'> & {
  sobre: DatoDeLaCelda | null
  motivo: string | null
  alElegir: (d: DatoDeLaCelda) => void
}

// «Lo que mira»: las variables de la cotización y los nodos por grupo, en un `<select>` con grupos (uno restringido, marcado). Uno que la fórmula ya no tiene se
// muestra con su aviso.
function LoQueMira({ sobre, motivo, contexto, nombrados, alElegir }: PropsDeLoQueMira) {
  const id = useId()
  const grupos = useMemo(() => nodosParaElegir(contexto, nombrados), [contexto, nombrados])
  const yaNoEsta = sobre !== null && datoQueYaNoEsta(sobre, contexto)
  const describe = [motivo === null ? null : `${id}-motivo`, yaNoEsta ? `${id}-aviso` : null]
    .filter((x) => x !== null)
    .join(' ')
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id}>Lo que mira</Label>
      <select
        id={id}
        className={`${CLASE_DE_LA_ELECCION} w-full`}
        value={valorDe(sobre)}
        aria-invalid={motivo !== null}
        aria-describedby={describe || undefined}
        onChange={(e) => {
          const d = datoDe(e.target.value)
          if (d !== null) alElegir(d)
        }}
      >
        {sobre === null ? <option value="">Elige</option> : null}
        {yaNoEsta ? <option value={valorDe(sobre)}>{valorDe(sobre).slice(2)}</option> : null}
        <optgroup label="De la cotización">
          {VARIABLES_PARA_ELEGIR.map((v) => (
            <option key={v.clave} value={`v:${v.clave}`}>
              {v.nombre}
            </option>
          ))}
        </optgroup>
        {grupos.map((g) => (
          <optgroup key={g.id ?? 'otros'} label={g.etiqueta}>
            {g.nodos.map((n) => (
              <option key={n.id} value={`n:${n.id}`}>
                {n.restringido ? `${n.etiqueta} (restringido)` : n.etiqueta}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {yaNoEsta ? (
        <p id={`${id}-aviso`} className="text-(length:--text-xs) text-(--color-aviso-ink)">
          {YA_NO_ESTA}
        </p>
      ) : null}
      {motivo === null ? null : (
        <p id={`${id}-motivo`} className={CLASE_DEL_MOTIVO}>
          {motivo}
        </p>
      )}
    </div>
  )
}

// El número contra el que compara, tipeado en el locale de la empresa; mal escrito o vacío, su motivo debajo.
function NumeroDeLaCondicion(props: {
  valor: string
  motivo: string | null
  alCambiar: (numero: string) => void
}) {
  const id = useId()
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id}>Número</Label>
      <Input
        id={id}
        inputMode="decimal"
        value={props.valor}
        aria-invalid={props.motivo !== null}
        aria-describedby={props.motivo === null ? undefined : `${id}-motivo`}
        className="min-h-11 tabular-nums md:min-h-9"
        onChange={(e) => {
          props.alCambiar(e.target.value)
        }}
      />
      {props.motivo === null ? null : (
        <p id={`${id}-motivo`} className={CLASE_DEL_MOTIVO}>
          {props.motivo}
        </p>
      )}
    </div>
  )
}

// Una condición como frase: [lo que mira] [qué pregunta] [número u opción]. Sólo se ofrece lo que la fórmula puede responder (`operadoresPara`); el grupo se nombra
// con la frase entera cuando está completa («Remate es mayor que 1.000»).
export function CampoDeLaCondicion({
  lugar,
  numero,
  condicion: c,
  motivos,
  contexto,
  nombrados,
  clave,
  alCambiar,
}: Props) {
  const { locale } = useRegional()
  const completa = condicionCompleta(c, locale, lugar, new Map())
  const operadores = operadoresPara(c.sobre, contexto)
  return (
    <div
      role="group"
      aria-label={
        completa === null
          ? `Condición ${String(numero)}`
          : fraseDeLaCondicion(completa, contexto, locale)
      }
      className="grid min-w-0 gap-2"
    >
      <LoQueMira
        sobre={c.sobre}
        motivo={motivos.get(`${lugar}.sobre`) ?? null}
        contexto={contexto}
        nombrados={nombrados}
        alElegir={(d) => {
          alCambiar(conSobre(c, d, contexto))
        }}
      />
      {c.sobre === null || c.es === null ? null : (
        <Eleccion
          etiqueta="Qué pregunta"
          valor={c.es}
          opciones={operadores.map((es) => ({ valor: es, texto: NOMBRES_DE_ES[es] }))}
          alCambiar={(es) => {
            alCambiar({ ...c, es })
          }}
        />
      )}
      {c.es === 'mayor' || c.es === 'menor' || c.es === 'igual' ? (
        <NumeroDeLaCondicion
          valor={c.numero}
          motivo={motivos.get(`${lugar}.numero`) ?? null}
          alCambiar={(n) => {
            alCambiar({ ...c, numero: n }, clave)
          }}
        />
      ) : null}
      {c.es === 'opcion' ? (
        <Eleccion
          etiqueta="Opción"
          valor={c.opcion ?? ''}
          opciones={opcionesPara(c.sobre, contexto).map((o) => ({
            valor: o.clave,
            texto: o.titulo || o.clave,
          }))}
          nota={motivos.get(`${lugar}.opcion`) ?? null}
          alCambiar={(opcion) => {
            alCambiar({ ...c, opcion })
          }}
        />
      ) : null}
    </div>
  )
}
