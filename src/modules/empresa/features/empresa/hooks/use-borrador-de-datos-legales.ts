'use client'

import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import {
  borradorDeLaTarjeta,
  CAMPOS_DE_LA_TARJETA,
  type Escrito,
} from '../../../entities/tarjetas-de-la-empresa'
import type { FormularioDeTarjeta } from './use-guardar-tarjeta'

// El borrador de Datos legales en `sessionStorage` (siete campos, más de 6): lo escrito y no guardado vuelve al abrir el modal, con
// «Descartar»; guardar lo limpia. Lo que cambió es lo único que guarda.
export function useBorradorDeDatosLegales(
  formulario: FormularioDeTarjeta,
  ajustes: AjustesEmpresa,
) {
  const borrador = useBorradorDeEstado<Escrito>({
    clave: 'ajustes-empresa-legales',
    valores: formulario.escrito,
    guardado: borradorDeLaTarjeta('datos-legales', ajustes),
    alReponer: (cambios) => {
      for (const campo of CAMPOS_DE_LA_TARJETA['datos-legales']) {
        const valor = cambios[campo]
        if (valor !== undefined) {
          formulario.cambiar(campo, valor)
        }
      }
    },
  })
  return {
    ...formulario,
    descartarBorrador: borrador.limpiar,
    enviar: async () => {
      const guardada = await formulario.enviar()
      if (guardada) {
        borrador.limpiar()
      }
      return guardada
    },
  }
}
