'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import { caminoAlEmbudo } from '../../../entities/ventana-de-oportunidades'

type Props = {
  hayMas: boolean
  enElTope: boolean
  cargando: boolean
  // Una movida está en vuelo: el cursor sale de la última fila, y una fila a medio mover tiene el grupo equivocado.
  ocupada: boolean
  alVerMas: () => void
  // Lo cargado: el camino a lo que el tope deja afuera es el embudo de la última, filtrado por el lead.
  lista: readonly OportunidadDelLead[]
  leadId: string
}

// Debajo de la lista: «Ver más» hasta el tope y, en el tope, el aviso. Sin más por leer, nada.
export function PieDeOportunidades(props: Props) {
  const { hayMas, enElTope, cargando, ocupada, alVerMas, lista, leadId } = props
  const embudoId = lista.at(-1)?.embudoId
  if (!hayMas) {
    return null
  }
  if (enElTope) {
    return (
      <AvisoDeTope
        texto={`Mostrando las ${String(TOPE_DE_LO_CARGADO)} más recientes, las abiertas primero.`}
        camino={
          embudoId ? (
            <Link
              href={caminoAlEmbudo(embudoId, leadId) as Route}
              className="inline-flex min-h-11 items-center text-(--color-primario) underline underline-offset-2 md:min-h-8"
            >
              Verlas en tu embudo
            </Link>
          ) : undefined
        }
      />
    )
  }
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 w-fit md:min-h-9"
      onClick={alVerMas}
      disabled={cargando || ocupada}
    >
      {cargando ? 'Cargando…' : 'Ver más'}
    </Button>
  )
}
