'use client'

import { useState } from 'react'
import { useRegional } from '@/shared/ui/regional'
import type { ContenidoDeLaCelda } from '../../../../../entities/cuadricula-de-la-tarjeta'
import {
  borradorDeCondiciones,
  cambiarEn,
  completarCondiciones,
  motivoParaQuitarRama,
  motivoParaSumarRama,
  moverEn,
  quitarRama,
  sumarRama,
  type CondicionesEnBorrador,
} from '../../../../../entities/plantilla/edicion/borradores-de-la-celda'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { useBorradorDeLaRegla } from '../../../hooks/use-borrador-de-la-regla'
import { BotonDeAgregar } from './boton-de-agregar'
import { MostrarDeLaRama } from './mostrar-de-la-rama'
import { RamaDeCondiciones } from './rama-de-condiciones'
import { SinTerminar } from './sin-terminar'

type Props = {
  contenido: ContenidoDeLaCelda | null
  // La clave que junta en un solo paso lo que se tipea en esta celda.
  clave: string
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  alCambiar: (contenido: ContenidoDeLaCelda, clave?: string) => void
}

const SI_NO = 'si_no'

// «Según condiciones» (glosario: «Condiciones de la tarjeta»): «Si… / Si no, si… / Si no…», hasta 5 ramas con el «si no», cada una con hasta 3 condiciones unidas con
// Y. Lo que falta queda aquí con su motivo y la celda no cambia hasta completarla; lo tipeado en un texto o un número se junta en un solo paso de deshacer.
export function ArmadorDeCondiciones({ contenido, clave, contexto, nombrados, alCambiar }: Props) {
  const { locale } = useRegional()
  const { borrador, cambiar, motivos, completo } = useBorradorDeLaRegla<
    CondicionesEnBorrador,
    ContenidoDeLaCelda | null
  >({
    valor: contenido,
    derivar: (c) => borradorDeCondiciones(c, locale),
    completar: (b) => completarCondiciones(b, locale),
    alCompletar: (v, k) => {
      if (v !== null) alCambiar(v, k)
    },
  })
  // El selector de dato abierto: `ramas.<j>` o `si_no` (uno a la vez).
  const [abierto, setAbierto] = useState<string | null>(null)
  const { ramas } = borrador
  return (
    <div className="grid min-w-0 gap-3" data-armador-de-condiciones="">
      {completo ? null : <SinTerminar />}
      {ramas.map((r, j) => (
        <RamaDeCondiciones
          // Las ramas no tienen id propio: su lugar es su clave (mover cierra el selector).
          key={j}
          indice={j}
          total={ramas.length}
          rama={r}
          motivos={motivos}
          motivoParaQuitar={motivoParaQuitarRama(borrador)}
          contexto={contexto}
          nombrados={nombrados}
          clave={clave}
          abierto={abierto === `ramas.${String(j)}`}
          alAbrir={(si) => {
            setAbierto(si ? `ramas.${String(j)}` : null)
          }}
          alCambiar={(rama, k) => {
            cambiar({ ...borrador, ramas: cambiarEn(ramas, j, rama) }, k)
          }}
          alMover={(hacia) => {
            setAbierto(null)
            cambiar({ ...borrador, ramas: moverEn(ramas, j, hacia) })
          }}
          alQuitar={() => {
            setAbierto(null)
            cambiar(quitarRama(borrador, j))
          }}
        />
      ))}
      <BotonDeAgregar
        texto="Agregar «si no, si…»"
        motivo={motivoParaSumarRama(borrador)}
        alAgregar={() => {
          cambiar(sumarRama(borrador))
        }}
      />
      <section
        aria-label="Si no"
        className="grid min-w-0 gap-2 border-t border-(--color-line) pt-3"
      >
        <h5 className="font-medium">Si no</h5>
        <MostrarDeLaRama
          etiqueta="Si no, mostrar"
          contenido={borrador.si_no}
          motivo={motivos.get(SI_NO) ?? null}
          contexto={contexto}
          nombrados={nombrados}
          abierto={abierto === SI_NO}
          alAbrir={() => {
            setAbierto(SI_NO)
          }}
          alCerrar={() => {
            setAbierto(null)
          }}
          clave={`${clave}:${SI_NO}`}
          alCambiar={(si_no, k) => {
            cambiar({ ...borrador, si_no }, k)
          }}
        />
      </section>
    </div>
  )
}
