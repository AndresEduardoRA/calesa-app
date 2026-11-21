'use client'

import type {
  FilaDeLaHoja,
  HojaDeLaPlanilla,
} from '../../../../../entities/formula/hoja-de-la-planilla'
import { varianteInicial } from '../../../../../entities/formula/opciones-de-la-variante'
import type { PedidoDeTipo } from '../../../../../entities/formula/tipo-de-celda'
import type { CatalogoDeTablas } from '../../../../../entities/compilador'
import type { Nodo } from '../../../../../entities/nodos'
import type { TipoDeCambioDeLaEmpresa } from '../tipos'
import { FormularioDeLaTabla, type TablaElegida } from './formulario-de-la-tabla'
import { FormularioDeLaVariante } from './formulario-de-la-variante'
import { FormularioDelDato } from './formulario-del-dato'
import { FormularioDelTipoDeCambio } from './formulario-del-tipo-de-cambio'

// Los tipos de celda que piden algo antes de cambiar (D11).
export const TIPOS_CON_PANEL = [
  'dato_del_vehiculo',
  'tipo_de_cambio',
  'de_una_tabla',
  'variante',
] as const
export type TipoConPanel = (typeof TIPOS_CON_PANEL)[number]

export const esTipoConPanel = (tipo: string | null): tipo is TipoConPanel =>
  TIPOS_CON_PANEL.some((t) => t === tipo)

type Props = {
  tipo: TipoConPanel
  fila: FilaDeLaHoja
  hoja: HojaDeLaPlanilla
  origen: { id: string; nombre: string }
  tiposDeCambio: readonly TipoDeCambioDeLaEmpresa[]
  tablas: CatalogoDeTablas
  motivo: string | null
  alAplicar: (pedido: PedidoDeTipo) => void
  alCancelar: () => void
}

function tablaInicial(nodo: Nodo): TablaElegida {
  if (nodo.tipo === 'tabla') return { tabla: nodo.tabla, columna: nodo.columna, match: nodo.match }
  if (nodo.tipo === 'tramo') return { tabla: nodo.tabla, columna: nodo.columna, match: {} }
  return { tabla: '', columna: '', match: {} }
}

// El formulario del tipo elegido, con lo que la fila ya tiene de ese tipo (abrirlo sobre una fila del mismo tipo edita lo suyo).
export function FormularioDelTipo({ tipo, fila, hoja, ...p }: Props) {
  const { nodo } = fila
  const comunes = { motivo: p.motivo, alAplicar: p.alAplicar, alCancelar: p.alCancelar }
  switch (tipo) {
    case 'dato_del_vehiculo':
      return (
        <FormularioDelDato
          {...comunes}
          origen={p.origen}
          inicial={nodo.tipo === 'campo_vehiculo' ? nodo.campo : ''}
        />
      )
    case 'tipo_de_cambio':
      return (
        <FormularioDelTipoDeCambio
          {...comunes}
          tiposDeCambio={p.tiposDeCambio}
          inicial={nodo.tipo === 'tipo_cambio' ? nodo.clave : ''}
        />
      )
    case 'de_una_tabla':
      return (
        <FormularioDeLaTabla
          {...comunes}
          tablas={p.tablas}
          nombreDelOrigen={p.origen.nombre}
          anteriores={hoja.filas
            .filter((f) => f.numero < fila.numero)
            .map((f) => ({ id: f.id, numero: f.numero, etiqueta: f.nodo.etiqueta }))}
          inicial={tablaInicial(nodo)}
        />
      )
    case 'variante':
      return <FormularioDeLaVariante {...comunes} inicial={varianteInicial(nodo)} />
  }
}
