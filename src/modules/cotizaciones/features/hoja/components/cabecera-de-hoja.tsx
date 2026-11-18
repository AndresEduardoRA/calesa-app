'use client'

import { Interruptor } from '@/shared/ui/interruptor'
import { modosDelEncabezado, ofreceVerTotalBs } from '../../../entities/cabecera-de-la-hoja'
import type { HojaLista } from '../../../entities/hoja'
import { claseDeLaCabecera } from './clases-de-la-rejilla'
import { ModosDeLaHoja } from './modos-de-la-hoja'

type Props = {
  cabecera: HojaLista['cabecera']
  modoElegido: string | null
  alElegirModo: (clave: string) => void
  verTotalBs: boolean
  alCambiarVerTotalBs: (valor: boolean) => void
  // Sólo lectura (una cotización guardada que quien mira no puede guardar): los modos y «Ver total Bs» se ven y no se tocan.
  deshabilitado?: boolean
}

// Lo que es de la hoja entera y va arriba de las secciones (`docs/UX.md` › «Cotizar»). Los modos de tipo de cambio que se dibujan son los visibles más el elegido
// (`modosDelEncabezado()`), y sólo si quedan dos o más: con uno no hay qué elegir (el resumen dice cuál es) y sin modos no hay nada. «Ver total Bs» sólo si el diseño lo ofrece y hay con qué moneda escribirlo (P6); nace apagado (P5) y ningún texto fijo
// nombra una moneda: su código sale de la base. Si nada se dibuja, tampoco la caja. Su aspecto (tono, relleno, letra y énfasis) va en clases sobre el mismo nodo:
// con tono o relleno es una caja, y el tono pasa a los chips de los modos.
export function CabeceraDeHoja({
  cabecera,
  modoElegido,
  alElegirModo,
  verTotalBs,
  alCambiarVerTotalBs,
  deshabilitado = false,
}: Props) {
  const modos = modosDelEncabezado(cabecera, modoElegido)
  const conModos = modos.length >= 2
  const conTotalBs = ofreceVerTotalBs(cabecera)
  if (!conModos && !conTotalBs) {
    return null
  }
  return (
    <div data-cabecera="" data-tono={cabecera.tono} className={claseDeLaCabecera(cabecera)}>
      {conModos ? (
        <ModosDeLaHoja
          modos={modos}
          elegido={modoElegido}
          alElegir={alElegirModo}
          deshabilitado={deshabilitado}
        />
      ) : null}
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
