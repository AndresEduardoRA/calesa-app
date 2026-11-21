'use client'

import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'
import type { useArchivadas } from '../hooks/use-archivadas'
import { FilaDeFormula } from './fila-de-formula'

type Props = {
  origenId: string
  archivadas: ReturnType<typeof useArchivadas>
  menuDe: (formula: FormulaDeLaLista) => AccionDeMenu[]
}

// «Archivadas»: plegada; al abrirse lee la primera página desde el navegador y «Ver más» suma la siguiente. Una archivada sólo se renombra o se copia.
export function Archivadas({ origenId, archivadas, menuDe }: Props) {
  const [abierta, setAbierta] = useState(false)
  const { estado, formulas } = archivadas
  return (
    <section className="grid min-w-0 gap-2">
      <Button
        type="button"
        variant="ghost"
        aria-expanded={abierta}
        aria-controls="formulas-archivadas"
        className="min-h-11 w-fit md:min-h-9"
        onClick={() => {
          if (!abierta) archivadas.abrir()
          setAbierta(!abierta)
        }}
      >
        <ChevronDownIcon aria-hidden className={abierta ? 'size-4 rotate-180' : 'size-4'} />
        Archivadas
      </Button>
      <div id="formulas-archivadas" hidden={!abierta} className="grid min-w-0 gap-2">
        {formulas.length > 0 ? (
          <ul aria-label="Fórmulas archivadas" className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {formulas.map((formula) => (
              <FilaDeFormula
                key={formula.id}
                origenId={origenId}
                formula={formula}
                acciones={menuDe(formula)}
              />
            ))}
          </ul>
        ) : estado.tipo === 'lista' ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            No hay fórmulas archivadas.
          </p>
        ) : null}
        {estado.tipo === 'cargando' ? (
          <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
            Leyendo las archivadas…
          </p>
        ) : null}
        {estado.tipo === 'error' ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-(length:--text-sm)">
            <p className="min-w-0 text-(--color-peligro-ink)">{estado.error.mensaje}</p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 md:min-h-9"
              onClick={archivadas.reintentar ?? undefined}
            >
              Reintentar
            </Button>
          </div>
        ) : null}
        {archivadas.verMas ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-fit md:min-h-9"
            onClick={archivadas.verMas}
          >
            Ver más
          </Button>
        ) : null}
        {archivadas.enElTope ? (
          <AvisoDeTope
            texto={textoDelTope(TOPE_DE_LO_CARGADO, {
              sustantivo: 'archivadas',
              articulo: 'las',
              orden: 'más recientes',
            })}
          />
        ) : null}
      </div>
    </section>
  )
}
