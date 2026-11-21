'use client'

import { useState } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { filaDe } from '../../../../../entities/formula/hoja-de-la-planilla'
import { ETIQUETA_DEL_TIPO } from '../../../../../entities/formula/tipo-de-celda'
import {
  CLAVE_DE_LA_FILA_DEL_TIPO,
  CLAVE_DEL_TIPO,
} from '../../../hooks/use-paneles-de-la-planilla'
import type { Planilla } from '../../../hooks/use-planilla'
import type { TipoDeCambioDeLaEmpresa } from '../tipos'
import { esTipoConPanel, FormularioDelTipo } from './formulario-del-tipo'

type Props = {
  planilla: Planilla
  origen: { id: string; nombre: string }
  tiposDeCambio: readonly TipoDeCambioDeLaEmpresa[]
}

// «Tipo de celda ›» de los tipos que piden algo (`?panel=tipo-de-celda&fila=<id>&tipo=<tipo>`, D11, D20): el dato del vehículo, el tipo de cambio, la tabla o
// las opciones de la variante. Aplicar cambia el tipo con `cambiarTipo()`; un rechazo queda en el panel con lo elegido.
export function PanelDelTipoDeCelda({ planilla, origen, tiposDeCambio }: Props) {
  const { tipo: panel } = planilla.paneles
  const { hoja } = planilla
  const id = panel.valor(CLAVE_DE_LA_FILA_DEL_TIPO)
  const tipo = panel.valor(CLAVE_DEL_TIPO)
  const numero = id === null ? undefined : hoja.numeroDe.get(id)
  const fila = numero === undefined ? undefined : filaDe(hoja, numero)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [apertura, setApertura] = useState(0)
  const [antes, setAntes] = useState(panel.abierto)
  if (panel.abierto !== antes) {
    setAntes(panel.abierto)
    if (panel.abierto) {
      setApertura((n) => n + 1)
      setMotivo(null)
    }
  }
  const conTipo = esTipoConPanel(tipo) ? tipo : null
  return (
    <Drawer
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      titulo={conTipo === null ? 'Tipo de celda' : `Tipo de celda: ${ETIQUETA_DEL_TIPO[conTipo]}`}
      {...(fila === undefined
        ? {}
        : { descripcion: `C${String(fila.numero)} · ${fila.nodo.etiqueta}` })}
    >
      {!panel.abierto ? null : fila === undefined ? (
        <p>Esa fila ya no está en la fórmula.</p>
      ) : conTipo === null ? (
        <p>Ese tipo de celda no se elige aquí: usa el menú «Tipo de celda» de la fila.</p>
      ) : (
        <FormularioDelTipo
          key={apertura}
          tipo={conTipo}
          fila={fila}
          hoja={hoja}
          origen={origen}
          tiposDeCambio={tiposDeCambio}
          tablas={planilla.editor.tablas}
          motivo={motivo}
          alAplicar={(pedido) => {
            const m = planilla.ops.cambiarTipo(fila.numero, pedido)
            if (m !== null) return void setMotivo(m)
            panel.cerrar()
            planilla.cuadricula.elegir({ id: fila.id, col: 'C' })
            planilla.enfocar()
          }}
          alCancelar={panel.cerrar}
        />
      )}
    </Drawer>
  )
}
