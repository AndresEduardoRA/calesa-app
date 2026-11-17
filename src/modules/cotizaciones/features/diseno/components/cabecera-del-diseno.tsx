'use client'

import { Interruptor } from '@/shared/ui/interruptor'
import type { Tono } from '@/shared/ui/xcell'
import type { Diseno } from '../../../entities/diseno'
import type { TipoDeCambioDelDiseno } from '../../../entities/diseno/edicion-de-la-cabecera'
import type { EdicionesDelDiseno } from '../hooks/use-ediciones-del-diseno'
import { CamposDelAspectoDeLaCabecera, type ErrorDelAspecto, type TonoDelCatalogo } from './aspecto'
import { ModoEditable } from './modo-editable'
import { SumarUnModo } from './sumar-un-modo'

export const SIN_TOTAL_EN = 'Esta fórmula no divide el total en Bs: sin eso no hay modos.'
export const SIN_TIPOS_DE_CAMBIO = 'La fórmula no tiene tipos de cambio para un modo.'

type Props = {
  cabecera: Diseno['cabecera']
  // Si la fórmula divide el total en Bs y qué tipos de cambio y buckets tiene: sin eso no se suma un modo.
  tieneTotalEn: boolean
  nBuckets: number
  tipos: readonly TipoDeCambioDelDiseno[]
  ediciones: EdicionesDelDiseno
  ocupado: boolean
  // El catálogo de tonos (nulo si no se pudo leer), sus colores y el rechazo de forma del aspecto de la cabecera, si es suyo.
  catalogo: readonly TonoDelCatalogo[] | null
  colores: readonly Tono[]
  error: ErrorDelAspecto
}

// La cabecera de la hoja: si ofrece «Ver total en moneda local», los modos de tipo de cambio y su aspecto. Los modos que ya hubiera siguen editables aunque la
// fórmula ya no los admita.
export function CabeceraDelDiseno({
  cabecera,
  tieneTotalEn,
  nBuckets,
  tipos,
  ediciones,
  ocupado,
  catalogo,
  colores,
  error,
}: Props) {
  const sinTipos = tipos.length === 0 || nBuckets === 0
  const motivo = !tieneTotalEn ? SIN_TOTAL_EN : sinTipos ? SIN_TIPOS_DE_CAMBIO : null
  return (
    <section
      className="@container grid min-w-0 gap-3 rounded-(--radius-lg) border border-(--color-line-strong) p-3"
      data-cabecera-del-diseno
      aria-labelledby="cabecera-del-diseno"
    >
      <h3
        id="cabecera-del-diseno"
        className="text-(length:--text-base) font-medium text-(--color-ink)"
      >
        Cabecera de la hoja
      </h3>
      <Interruptor
        titulo="Ofrecer «Ver total en moneda local»"
        ayuda="La hoja lo muestra apagado; quien cotiza lo enciende."
        valor={cabecera.ver_total_bs}
        deshabilitado={ocupado}
        alCambiar={ediciones.ponerVerTotalBs}
      />
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {cabecera.modos.map((modo) => (
          <ModoEditable
            key={modo.clave}
            modo={modo}
            tipos={tipos}
            ocupado={ocupado}
            alPonerModo={(cambios) => {
              ediciones.ponerModo(modo.clave, cambios)
            }}
            alQuitar={() => {
              ediciones.quitarModo(modo.clave)
            }}
          />
        ))}
      </ul>
      <SumarUnModo motivo={motivo} ocupado={ocupado} alSumar={ediciones.sumarModo} />
      <CamposDelAspectoDeLaCabecera
        cabecera={cabecera}
        catalogo={catalogo}
        colores={colores}
        ocupado={ocupado}
        error={error}
        alPoner={ediciones.ponerAspectoDeLaCabecera}
      />
    </section>
  )
}
