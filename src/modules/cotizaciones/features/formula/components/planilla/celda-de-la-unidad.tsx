'use client'

import { useId } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import { leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import { Switch } from '@/shared/ui/switch'
import { useRegional } from '@/shared/ui/regional'
import { textoInicial, valorTipeado } from '../../../../entities/formula/ajuste'
import type { ValorDelVehiculo } from '../../../../entities/formula/unidad-de-ejemplo'
import { formatoDe, type Nodo, type NodoOpcion } from '../../../../entities/nodos'
import type { Lectura } from '../../hooks/use-edicion-de-celda'
import { ValorDeConstante } from '../editor/valor-de-constante'
import { CajaEditable } from './caja-editable'

// Lo que cambia la unidad de ejemplo: estable (los `set` de la sesión), para las filas `memo`.
export type AccionesDeLaUnidad = {
  alCambiarInput: (id: string, valor: number) => void
  alCambiarBandera: (id: string, valor: boolean) => void
  alCambiarCampo: (campo: string, valor: ValorDelVehiculo) => void
  alElegirVariante: (clave: string) => void
}

export type ValorDeLaUnidad = number | boolean | string | null

const MAXIMO_DEL_TEXTO = 200
const SIEMPRE = { ok: true } as const

type Props = {
  nodo: Nodo
  valor: ValorDeLaUnidad
  acciones: AccionesDeLaUnidad
  // La unidad no toca la fórmula de trabajo: nunca espera. El motivo es el de la tabla (no se usa).
  idDelMotivo: string
}

function LoQueEscribeElAsesor({
  nodo,
  valor,
  acciones,
  idDelMotivo,
}: Props & { nodo: Extract<Nodo, { tipo: 'input' }> }) {
  const { locale } = useRegional()
  const f = formatoDe(nodo)
  const actual = typeof valor === 'number' ? valor : 0
  return (
    <CajaEditable<number>
      concepto={nodo.etiqueta}
      contenido={<ValorDeConstante valor={actual} formato={f} decimales={2} />}
      bloqueada={false}
      idDelMotivo={idDelMotivo}
      textoInicial={() => textoInicial(actual, f, locale)}
      leer={(texto): Lectura<number> => {
        const r = valorTipeado(texto, f, locale, null)
        return r.ok ? r : { ok: false, aviso: r.aviso }
      }}
      alConfirmar={(n) => {
        acciones.alCambiarInput(nodo.id, n)
        return SIEMPRE
      }}
    />
  )
}

// Un dato del vehículo: un número si el lector lo lee como número; si no, un texto de hasta 200 caracteres; vacío, sin dato.
function DatoDelVehiculo({
  nodo,
  valor,
  acciones,
  idDelMotivo,
}: Props & { nodo: Extract<Nodo, { tipo: 'campo_vehiculo' }> }) {
  const { locale } = useRegional()
  const actual = typeof valor === 'number' || typeof valor === 'string' ? valor : null
  const leer = (texto: string): Lectura<ValorDelVehiculo> => {
    const numero = leerNumeroTipeado(texto, locale)
    if (numero.ok) return { ok: true, valor: numero.valor }
    const limpio = texto.trim()
    if (limpio.length > MAXIMO_DEL_TEXTO) {
      return { ok: false, aviso: `Hasta ${String(MAXIMO_DEL_TEXTO)} caracteres.` }
    }
    return { ok: true, valor: limpio }
  }
  return (
    <CajaEditable<ValorDelVehiculo>
      concepto={nodo.etiqueta}
      contenido={
        actual === null
          ? '—'
          : typeof actual === 'number'
            ? formatearNumero(actual, { locale, decimales: 6 })
            : actual
      }
      bloqueada={false}
      idDelMotivo={idDelMotivo}
      textoInicial={() =>
        actual === null
          ? ''
          : typeof actual === 'number'
            ? textoInicial(actual, 'raw', locale)
            : actual
      }
      leer={leer}
      alConfirmar={(v) => {
        acciones.alCambiarCampo(nodo.campo, v)
        return SIEMPRE
      }}
    />
  )
}

// La variante como chips (radios nativos: las flechas eligen); con «Se cotiza en par», las dos juntas y la nota: la planilla calcula la elegida.
function ChipsDeLaVariante({ nodo, valor, acciones }: Props & { nodo: NodoOpcion }) {
  const nombre = useId()
  const elegida = typeof valor === 'string' ? valor : nodo.por_defecto
  return (
    <fieldset className="flex flex-wrap justify-end gap-1.5">
      <legend className="sr-only">{nodo.etiqueta}, valor</legend>
      {nodo.opciones.map((o) => (
        <label
          key={o.clave}
          className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-(--color-line-strong) px-3 text-(length:--text-sm) has-[:checked]:border-(--color-primario-ink) has-[:checked]:bg-(--color-primario-soft) has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-(--color-primario-ink) md:pointer-fine:min-h-8"
        >
          <input
            type="radio"
            className="sr-only"
            name={nombre}
            value={o.clave}
            checked={elegida === o.clave}
            onChange={() => {
              acciones.alElegirVariante(o.clave)
            }}
          />
          {o.etiqueta}
        </label>
      ))}
      {nodo.en_par === true ? (
        <span className="basis-full text-right text-(length:--text-xs) text-(--color-ink-soft)">
          Se cotiza en par: el cliente recibe las dos.
        </span>
      ) : null}
    </fieldset>
  )
}

// La celda C de la unidad de ejemplo: lo que se tipea al cotizar. No se guarda; cambia sólo el cálculo de la planilla.
export function CeldaDeLaUnidad(p: Props) {
  const { nodo } = p
  switch (nodo.tipo) {
    case 'input':
      return <LoQueEscribeElAsesor {...p} nodo={nodo} />
    case 'campo_vehiculo':
      return <DatoDelVehiculo {...p} nodo={nodo} />
    case 'bandera':
      return (
        <Switch
          aria-label={`${nodo.etiqueta}, valor`}
          checked={p.valor === true}
          onCheckedChange={(v) => {
            p.acciones.alCambiarBandera(nodo.id, v)
          }}
        />
      )
    case 'opcion':
      return <ChipsDeLaVariante {...p} nodo={nodo} />
    case 'constante':
    case 'tipo_cambio':
    case 'tabla':
    case 'tramo':
    case 'calculo':
      return null
    default: {
      const _: never = nodo
      return _
    }
  }
}
