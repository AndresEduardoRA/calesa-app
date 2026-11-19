'use client'

import { useState } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { TITULO_DEL_PANEL_POR_DEFECTO } from '../../../../entities/cabecera-por-defecto'
import type { PropsDelAjusteDeLaCabecera } from '../../../hoja/components/huecos'
import { CuerpoDelAjusteDeLaCabecera } from './cuerpo-del-ajuste-de-la-cabecera'

type Props = PropsDelAjusteDeLaCabecera & { origenId: string }

// El panel del ⚙ de la cabecera (`?ajuste=cabecera`): «Configuración por defecto de <Origen>», un `<Drawer>` como el ⚙ de una celda. Se monta la primera vez que se abre y
// queda montado (se va con su animación); el cuerpo lleva `key` por apertura: cada vez que se abre, vuelve a leer la publicada y empieza de cero.
export function PanelDelAjusteDeLaCabecera({ abierto, origenId, ...props }: Props) {
  const [apertura, setApertura] = useState(0)
  const [antes, setAntes] = useState(abierto)
  if (abierto !== antes) {
    setAntes(abierto)
    if (abierto) {
      setApertura((n) => n + 1)
    }
  }
  return (
    <Drawer
      abierto={abierto}
      alCerrar={props.cerrar}
      titulo={TITULO_DEL_PANEL_POR_DEFECTO(props.origen)}
    >
      {abierto ? (
        <CuerpoDelAjusteDeLaCabecera key={apertura} origenId={origenId} {...props} />
      ) : null}
    </Drawer>
  )
}
