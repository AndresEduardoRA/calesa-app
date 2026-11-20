'use client'

import { parseAsString, useQueryStates } from 'nuqs'

// A dónde se va: lo que no se nombra se limpia (un solo panel a la vez).
export type DestinoDeMonedas = {
  tc?: string | undefined
  moneda?: string | undefined
  panel?: string | undefined
  par?: string | undefined
}

// Los paneles de Monedas en la URL, leídos por el servidor (`shallow: false`): `?tc=` un tipo de cambio, `?moneda=` una moneda,
// `?panel=nuevo-tipo-cambio|nueva-moneda` crear y `?par=USD-BOB` el par con el que nace el nuevo tipo de cambio.
export function useNavegacionDeMonedas() {
  const [{ tc, moneda, panel, par }, poner] = useQueryStates(
    { tc: parseAsString, moneda: parseAsString, panel: parseAsString, par: parseAsString },
    { shallow: false },
  )
  const ir = (destino: DestinoDeMonedas) =>
    void poner({
      tc: destino.tc ?? null,
      moneda: destino.moneda ?? null,
      panel: destino.panel ?? null,
      par: destino.par ?? null,
    })
  return { tc, moneda, panel, par, ir, cerrar: () => ir({}) }
}

export type NavegacionDeMonedas = ReturnType<typeof useNavegacionDeMonedas>
