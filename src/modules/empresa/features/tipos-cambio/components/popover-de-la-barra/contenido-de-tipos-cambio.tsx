'use client'

import { CoinsIcon } from 'lucide-react'
import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { PopoverDescription, PopoverHeader, PopoverTitle } from '@/shared/ui/popover'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { TOPE_DEL_POPOVER } from '../../../../entities/tipos-cambio-vigentes'
import { useTiposCambioVigentes } from '../../hooks/use-tipos-cambio-vigentes'
import { FilaDeTipoCambio } from './fila-de-tipo-cambio'
import { PieDelPopover } from './pie-del-popover'

type Props = {
  // Quien gestiona los tipos de cambio tiene a mano ir a configurarlos.
  puedeGestionar: boolean
  alCerrar: () => void
}

function EsqueletoDeTipos() {
  return (
    <div aria-busy="true" aria-label="Cargando los tipos de cambio" className="grid gap-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

// Lo que se dibuja dentro del popover de la barra: todos los vigentes (el por defecto adelante, hasta 30), cada uno con su último cambio.
// Su código viaja diferido (`diferidos.tsx`) y lee al abrirse: el marco no lo paga hasta que alguien lo abre.
export function ContenidoDeTiposCambio({ puedeGestionar, alCerrar }: Props) {
  const { zonaHoraria } = useRegional()
  const { vigentes, reintentar } = useTiposCambioVigentes()

  return (
    <div className="grid min-w-0 gap-2">
      <PopoverHeader>
        <PopoverTitle>Tipos de cambio</PopoverTitle>
        <PopoverDescription>Las horas están en {zonaHoraria}.</PopoverDescription>
      </PopoverHeader>
      {vigentes.estado === 'leyendo' ? <EsqueletoDeTipos /> : null}
      {vigentes.estado === 'error' ? (
        <EstadoError
          compacto
          titulo="No se pudieron leer los tipos de cambio."
          descripcion={vigentes.error.mensaje}
          alReintentar={reintentar}
        />
      ) : null}
      {vigentes.estado === 'listo' && vigentes.filas.length === 0 ? (
        <EstadoVacio compacto Icono={CoinsIcon} titulo="No hay tipos de cambio activos" />
      ) : null}
      {vigentes.estado === 'listo' && vigentes.filas.length > 0 ? (
        <ul className="grid max-h-[60dvh] min-w-0 grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line) overflow-y-auto">
          {vigentes.filas.map((tipo) => (
            <FilaDeTipoCambio key={tipo.id} tipo={tipo} />
          ))}
        </ul>
      ) : null}
      {vigentes.estado === 'listo' && vigentes.hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DEL_POPOVER, {
            sustantivo: 'primeros tipos de cambio',
            orden: 'activos',
          })}
        />
      ) : null}
      <PieDelPopover puedeGestionar={puedeGestionar} alCerrar={alCerrar} />
    </div>
  )
}
