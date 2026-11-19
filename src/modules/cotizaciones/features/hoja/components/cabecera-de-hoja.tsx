'use client'

import { use } from 'react'
import { Interruptor } from '@/shared/ui/interruptor'
import { modosDelEncabezado, ofreceVerTotalBs } from '../../../entities/cabecera-de-la-hoja'
import type { HojaLista } from '../../../entities/hoja'
import { AjusteDeLaCabeceraEnLaHoja } from './ajuste-de-la-cabecera-en-la-hoja'
import { claseDeLaCabecera } from './clases-de-la-rejilla'
import { ContextoDelAjuste } from './hueco-del-ajuste'
import { ModosDeLaHoja } from './modos-de-la-hoja'

type Props = {
  cabecera: HojaLista['cabecera']
  modoElegido: string | null
  alElegirModo: (clave: string) => void
  verTotalBs: boolean
  alCambiarVerTotalBs: (valor: boolean) => void
  // Sólo lectura (una cotización guardada que quien mira no puede guardar): los modos y «Ver total Bs» se ven y no se tocan.
  deshabilitado?: boolean
  // Para el ⚙ de la cabecera: el nombre del origen y la versión que dibuja la hoja. Sin ellos (la vista previa del diseño) no hay ⚙.
  origen?: string
  formula?: HojaLista['formula']
}

// El panel del ⚙ de la cabecera que llenó el área, si la base dio `ajustes` y la hoja sabe su origen y su versión; si no, nulo.
function useAjusteDeLaCabecera(
  cabecera: HojaLista['cabecera'],
  origen: string | undefined,
  formula: unknown,
) {
  const AjusteDeLaCabecera = use(ContextoDelAjuste)?.AjusteDeLaCabecera
  return cabecera.ajustes && origen !== undefined && formula !== undefined
    ? (AjusteDeLaCabecera ?? null)
    : null
}

// Lo que es de la hoja entera y va arriba de las secciones (`docs/UX.md` › «Cotizar»). Los modos de tipo de cambio que se dibujan son los visibles más el elegido
// (`modosDelEncabezado()`), y sólo si quedan dos o más: con uno no hay qué elegir (el resumen dice cuál es) y sin modos no hay nada. «Ver total Bs» sólo si el diseño lo
// ofrece y hay con qué moneda escribirlo (P6); ningún texto fijo nombra una moneda: su código sale de la base. El ⚙ de la cabecera va junto a los modos, como en V1,
// si la base dio `ajustes` y un área llenó el hueco. Si nada se dibuja, tampoco la caja. Su aspecto (tono, relleno, letra y énfasis) va en clases sobre el mismo nodo:
// con tono o relleno es una caja, y el tono pasa a los chips de los modos.
export function CabeceraDeHoja({
  cabecera,
  modoElegido,
  alElegirModo,
  verTotalBs,
  alCambiarVerTotalBs,
  deshabilitado = false,
  origen,
  formula,
}: Props) {
  const AjusteDeLaCabecera = useAjusteDeLaCabecera(cabecera, origen, formula)
  const modos = modosDelEncabezado(cabecera, modoElegido)
  const conModos = modos.length >= 2
  const conTotalBs = ofreceVerTotalBs(cabecera)
  if (!conModos && !conTotalBs && AjusteDeLaCabecera === null) {
    return null
  }
  const selector = conModos ? (
    <ModosDeLaHoja
      modos={modos}
      elegido={modoElegido}
      alElegir={alElegirModo}
      deshabilitado={deshabilitado}
    />
  ) : null
  return (
    <div data-cabecera="" data-tono={cabecera.tono} className={claseDeLaCabecera(cabecera)}>
      {AjusteDeLaCabecera !== null && origen !== undefined && formula !== undefined ? (
        <div className="flex min-w-0 items-end justify-between gap-2">
          {selector ?? <span />}
          <AjusteDeLaCabeceraEnLaHoja
            AjusteDeLaCabecera={AjusteDeLaCabecera}
            origen={origen}
            hoja={{
              formula,
              cabecera,
              modoElegido,
              verTotalBs,
              soloLectura: deshabilitado,
              alElegirModo,
              alCambiarVerTotalBs,
            }}
          />
        </div>
      ) : (
        selector
      )}
      {conTotalBs ? (
        <Interruptor
          titulo="Ver total en moneda local"
          ayuda="Suma al resumen el total en moneda local y se guarda con la cotización."
          valor={verTotalBs}
          alCambiar={alCambiarVerTotalBs}
          deshabilitado={deshabilitado}
        />
      ) : null}
    </div>
  )
}
