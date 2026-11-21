'use client'

import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  FAMILIAS_DE_LA_CONFIGURACION,
  type ClaveDeFamilia,
} from '../../../entities/paneles-de-la-configuracion'

// Los paneles de una tarjeta de Configuración › Leads en la URL: `abierto` es el de la lista o el editor de la tarjeta (`?panel=origenes`),
// `enLaFamilia` es cualquiera de los suyos (también uno de ítem: `?panel=editar-origen`). Dentro de una familia hay un solo modal abierto a la
// vez: el del ítem reemplaza al de la lista (`abierto` pasa a falso) y, al cerrarse, vuelve a ella. `montar` dice que ya se abrió alguno: el
// editor diferido se pide la primera vez y no se desmonta, así su estado sobrevive al pasar de la lista al ítem.
export function useFamiliaDelPanel(clave: ClaveDeFamilia) {
  const familia = FAMILIAS_DE_LA_CONFIGURACION[clave]
  const lista = usePanelPorUrl(familia.principal)
  const panel = lista.valor(CLAVE_DE_PANEL)
  const enLaFamilia = panel !== null && familia.paneles.includes(panel)
  const montar = useAbiertoAlgunaVez(enLaFamilia)
  return {
    abierto: lista.abierto,
    enLaFamilia,
    montar,
    abrir: () => {
      lista.abrir()
    },
    cerrar: lista.cerrar,
  }
}
