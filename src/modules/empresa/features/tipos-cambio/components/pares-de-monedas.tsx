'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import type { GrupoDePar, TipoCambio } from '../../../entities/tipos-cambio'
import type { UltimoCambio } from '../../../entities/tipos-cambio-vigentes'
import { GrupoDePar as GrupoDeUnPar } from './grupo-de-par'

type Props = {
  grupos: readonly GrupoDePar[]
  tipos: readonly TipoCambio[]
  ultimosCambios: Readonly<Record<string, UltimoCambio>>
  puedeGestionar: boolean
  // Quien gestiona y hay al menos dos monedas activas.
  puedeSumar: boolean
  enCurso: boolean
  alAbrir: (id: string) => void
  // Un par, o ninguno (el panel nace con la base y otra moneda).
  alCrear: (par: GrupoDePar | null) => void
  // Lo que se guarda desde la tarjeta: ser el por defecto o estar en la barra.
  alGuardar: (tipo: TipoCambio, cambio: { esDefault: true } | { enLaBarra: boolean }) => void
}

function BotonNuevo({ texto, alCrear }: { texto: string; alCrear: () => void }) {
  return (
    <Button variant="outline" className="h-11 md:h-8" onClick={alCrear}>
      <PlusIcon aria-hidden />
      {texto}
    </Button>
  )
}

// Un grupo por par de monedas, con su tarjeta por tipo de cambio; sin ninguno, el vacío dice cómo empezar; al final, el botón de otro par.
export function ParesDeMonedas({ grupos, puedeSumar, alCrear, ...resto }: Props) {
  if (grupos.length === 0) {
    return (
      <EstadoVacio
        compacto
        titulo="Todavía no hay tipos de cambio"
        descripcion="Con uno entre dos monedas, las cotizaciones pueden mostrar sus totales en las dos."
        accion={
          puedeSumar ? (
            <BotonNuevo
              texto="Nuevo tipo de cambio"
              alCrear={() => {
                alCrear(null)
              }}
            />
          ) : null
        }
      />
    )
  }
  return (
    <>
      {grupos.map((grupo) => (
        <GrupoDeUnPar
          key={grupo.clave}
          grupo={grupo}
          tipos={resto.tipos}
          ultimosCambios={resto.ultimosCambios}
          puedeGestionar={resto.puedeGestionar}
          puedeSumar={puedeSumar}
          enCurso={resto.enCurso}
          alAbrir={resto.alAbrir}
          alCrear={alCrear}
          alUsarPorDefecto={(tipo) => {
            resto.alGuardar(tipo, { esDefault: true })
          }}
          alCambiarEnLaBarra={(tipo, enLaBarra) => {
            resto.alGuardar(tipo, { enLaBarra })
          }}
        />
      ))}
      {puedeSumar ? (
        <div>
          <BotonNuevo
            texto="Nuevo tipo de cambio de otro par"
            alCrear={() => {
              alCrear(null)
            }}
          />
        </div>
      ) : null}
    </>
  )
}
