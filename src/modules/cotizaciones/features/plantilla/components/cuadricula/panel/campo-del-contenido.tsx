'use client'

import { useId, useState, type RefObject } from 'react'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import {
  MAXIMO_DE_CARACTERES_DE_UN_TEXTO,
  type ContenidoDeLaCelda,
} from '../../../../../entities/cuadricula-de-la-tarjeta'
import { motivoDelTexto } from '../../../../../entities/plantilla/edicion/contenido'
import { caracteres } from '../../../../../entities/json-de-la-base'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { ElegirDato } from './elegir-dato'
import { OpcionesEnFila } from './opciones-en-fila'

type Tipo = ContenidoDeLaCelda['tipo']

type Props = {
  contenido: ContenidoDeLaCelda | null
  // La clave que junta en un solo paso lo que se escribe en esta celda.
  clave: string
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  // El primer control de «Contenido» (Enter o F2 sobre un dato o el logo lo enfocan).
  enfoque: RefObject<HTMLDivElement | null>
  alCambiar: (contenido: ContenidoDeLaCelda, clave?: string) => void
}

const TIPOS = [
  { valor: 'texto', texto: 'Texto' },
  { valor: 'dato', texto: 'Dato' },
  { valor: 'logo', texto: 'Logo' },
  { valor: 'foto_del_asesor', texto: 'Foto del asesor' },
  { valor: 'vacio', texto: 'Vacío' },
] as const

// El texto de la celda: lo que se escribe se manda si se puede guardar (≤ 300, sin «{{»); si no, queda aquí con su motivo. Lo que cambia afuera (deshacer) se trae.
function CampoDelTexto({
  texto,
  clave,
  alCambiar,
}: {
  texto: string
  clave: string
  alCambiar: Props['alCambiar']
}) {
  const id = useId()
  const [escrito, setEscrito] = useState(texto)
  const [previo, setPrevio] = useState(texto)
  if (texto !== previo) {
    setPrevio(texto)
    if (motivoDelTexto(escrito) === null) setEscrito(texto)
  }
  const motivo = motivoDelTexto(escrito)
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>Texto</Label>
      <Textarea
        id={id}
        value={escrito}
        rows={3}
        aria-invalid={motivo !== null}
        aria-describedby={`${id}-pie`}
        onChange={(e) => {
          setEscrito(e.target.value)
          if (motivoDelTexto(e.target.value) === null)
            alCambiar({ tipo: 'texto', texto: e.target.value }, clave)
        }}
      />
      <p id={`${id}-pie`} className="text-(length:--text-xs) text-(--color-ink-soft)">
        {caracteres(escrito)} de {MAXIMO_DE_CARACTERES_DE_UN_TEXTO}
        {motivo === null ? null : <span className="text-(--color-peligro-ink)"> · {motivo}</span>}
      </p>
    </div>
  )
}

const textoDe = (c: ContenidoDeLaCelda | null) => (c?.tipo === 'texto' ? c.texto : '')
const datoDe = (c: ContenidoDeLaCelda | null) => (c?.tipo === 'dato' ? c : null)

// Elegir el tipo: Texto (con el texto de antes si lo tenía), Logo, Foto del asesor o Vacío cambian la celda; Dato espera a que se elija uno.
function contenidoDelTipo(t: Tipo, actual: ContenidoDeLaCelda | null): ContenidoDeLaCelda | null {
  if (t === 'texto') return { tipo: 'texto', texto: textoDe(actual) }
  return t === 'logo' || t === 'foto_del_asesor' || t === 'vacio' ? { tipo: t } : null
}

// «Contenido» de lo elegido: Texto | Dato | Logo | Foto del asesor | Vacío. Elegir «Dato» muestra el selector y no cambia la celda hasta elegir uno; un texto que empieza con «=» es texto.
export function CampoDelContenido({
  contenido,
  clave,
  contexto,
  nombrados,
  enfoque,
  alCambiar,
}: Props) {
  const tipoDeLaCelda = contenido?.tipo ?? 'vacio'
  const [tipo, setTipo] = useState<Tipo>(tipoDeLaCelda)
  const [deLaCelda, setDeLaCelda] = useState(tipoDeLaCelda)
  if (tipoDeLaCelda !== deLaCelda) {
    setDeLaCelda(tipoDeLaCelda)
    setTipo(tipoDeLaCelda)
  }
  return (
    <div className="grid min-w-0 gap-2">
      <div
        ref={enfoque}
        tabIndex={-1}
        className="outline-none focus-visible:shadow-(--shadow-focus)"
        data-campo-del-contenido=""
      >
        <OpcionesEnFila
          etiqueta="Contenido"
          valor={tipo}
          opciones={TIPOS}
          alElegir={(t) => {
            setTipo(t)
            const nuevo = contenidoDelTipo(t, contenido)
            if (nuevo !== null) alCambiar(nuevo)
          }}
        />
      </div>
      {tipo === 'texto' ? (
        <CampoDelTexto texto={textoDe(contenido)} clave={clave} alCambiar={alCambiar} />
      ) : null}
      {tipo === 'dato' ? (
        <ElegirDato
          actual={datoDe(contenido)}
          contexto={contexto}
          nombrados={nombrados}
          alElegir={alCambiar}
        />
      ) : null}
    </div>
  )
}
