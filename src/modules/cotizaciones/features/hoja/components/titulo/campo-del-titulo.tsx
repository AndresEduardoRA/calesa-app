'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Input } from '@/shared/ui/input'
import {
  AVISO_DEL_TOPE_DEL_TITULO,
  largoDelTitulo,
  TOPE_DEL_TITULO,
  tituloAutomatico,
} from '../../../../entities/titulo-de-la-cotizacion'
import {
  useTituloDeLaCotizacion,
  type TituloDeLaCotizacion,
} from '../../hooks/use-titulo-de-la-cotizacion'

export const AYUDA_DEL_AUTOMATICO = 'Automático: toma el título del vehículo.'

// Lo que se ve en el campo: el manual; automático, el del vehículo, salvo recién vaciado con el foco puesto (vacío).
function valorDelCampo(titulo: TituloDeLaCotizacion, automatico: string | null, vaciado: boolean) {
  if (titulo.estado.manual) {
    return titulo.estado.texto
  }
  return vaciado ? '' : (automatico ?? '')
}

// Lo de debajo: el rechazo de la base o, automático con un vehículo, de dónde sale.
function ayudaDelCampo(titulo: TituloDeLaCotizacion, automatico: string | null) {
  if (titulo.rechazo !== null) {
    return titulo.rechazo
  }
  return titulo.estado.manual || automatico === null ? null : AYUDA_DEL_AUTOMATICO
}

function Contador({ largo }: { largo: number }) {
  return largo >= AVISO_DEL_TOPE_DEL_TITULO ? (
    <span className="text-xs text-(--color-ink-soft) tabular-nums" aria-live="polite">
      {String(largo)}/{String(TOPE_DEL_TITULO)}
    </span>
  ) : null
}

function Campo({ titulo }: { titulo: TituloDeLaCotizacion }) {
  const id = useId()
  const idDeLaAyuda = useId()
  const campo = useRef<HTMLInputElement>(null)
  const [vaciado, setVaciado] = useState(false)
  const { focoPedido, soltarFoco } = titulo
  useEffect(() => {
    if (focoPedido) {
      campo.current?.focus()
      soltarFoco()
    }
  }, [focoPedido, soltarFoco])
  const automatico = tituloAutomatico(titulo.vehiculo)
  const valor = valorDelCampo(titulo, automatico, vaciado)
  const ayuda = ayudaDelCampo(titulo, automatico)
  const conRechazo = titulo.rechazo !== null
  return (
    <div data-campo-del-titulo="" className="grid min-w-0 gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-(length:--text-sm) font-medium text-(--color-ink)">
          Título de la cotización
        </label>
        <Contador largo={largoDelTitulo(valor)} />
      </div>
      <Input
        ref={campo}
        id={id}
        type="text"
        autoComplete="off"
        maxLength={TOPE_DEL_TITULO}
        placeholder={automatico ?? 'Escribe el título'}
        aria-describedby={ayuda === null ? undefined : idDeLaAyuda}
        aria-invalid={conRechazo ? true : undefined}
        className="h-11 min-w-0 md:h-9"
        value={valor}
        onChange={(evento) => {
          const texto = evento.target.value
          setVaciado(texto.trim() === '')
          titulo.escribir(texto)
        }}
        onBlur={() => {
          setVaciado(false)
        }}
      />
      {ayuda === null ? null : (
        <p
          id={idDeLaAyuda}
          className={
            conRechazo
              ? 'text-xs font-medium text-(--color-peligro-ink)'
              : 'text-xs text-(--color-ink-soft)'
          }
        >
          {ayuda}
        </p>
      )}
    </div>
  )
}

// «Título de la cotización», arriba del panel del vehículo (T307; V1: `quote-title-field.tsx`). Automático, muestra el del vehículo; escribir lo vuelve manual (cambiar de
// vehículo lo respeta) y vaciarlo lo devuelve a automático: con el foco puesto queda vacío, con el del vehículo de ejemplo y la ayuda. El contador aparece cerca del tope
// y el campo no deja pasar de 120. El rechazo de la base va debajo. Toma el foco sólo si «Escribir el título» lo pidió. Sin el proveedor o sin poder escribirlo, nada.
export function CampoDelTitulo() {
  const titulo = useTituloDeLaCotizacion()
  return titulo === null || !titulo.puede ? null : <Campo titulo={titulo} />
}
