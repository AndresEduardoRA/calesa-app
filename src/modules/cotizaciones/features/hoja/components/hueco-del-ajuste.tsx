'use client'

import { createContext, type ComponentType } from 'react'
import type { PropsDelAjuste, PropsDelAjusteDeLaCabecera } from './huecos'

// El hueco del ⚙ (4.15-6a): el `Proveedor` de un área (el del 4.20) lo llena con el panel que abre el ⚙ de una celda y, si lo trae, el del ⚙ de la cabecera. Sin
// proveedor es nulo y la hoja no dibuja ningún ⚙ ni monta ningún hook del ajuste. La hoja no decide quién lo ve: la base lo dice por celda y en la cabecera (`ajustes`).
export type AjusteDeArea = {
  Ajuste: ComponentType<PropsDelAjuste>
  AjusteDeLaCabecera?: ComponentType<PropsDelAjusteDeLaCabecera>
}

export const ContextoDelAjuste = createContext<AjusteDeArea | null>(null)
