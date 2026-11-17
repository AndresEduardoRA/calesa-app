'use client'

import { CoinsIcon } from 'lucide-react'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { useLive } from '@/shared/ui/live'
import { PopoverDescription, PopoverHeader, PopoverTitle } from '@/shared/ui/popover'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { useTiposCambioVigentes } from '../../hooks/use-tipos-cambio-vigentes'
import { ListaDeTiposCambio } from './lista-de-tipos-cambio'
import { PieDelPopover } from './pie-del-popover'

type Props = {
  // Quien gestiona los tipos de cambio cambia el valor ahí mismo y tiene a mano ir a configurarlos.
  puedeGestionar: boolean
  alCerrar: () => void
  // Lo pide el editor mientras tiene algo sin guardar: el popover no se cierra al tocar afuera ni con Esc.
  alRetener: (retener: boolean) => void
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

// Lo que se dibuja dentro del popover de la barra: todos los vigentes (el por defecto adelante, hasta 30), cada uno con su último cambio y,
// para quien los gestiona, el lápiz para cambiar el valor. Con el Modo Live no se ofrece: el campo mostraría la cifra, y un editor abierto
// se cierra. Su código viaja diferido (`diferidos.tsx`) y lee al abrirse: el marco no lo paga hasta que alguien lo abre.
export function ContenidoDeTiposCambio({ puedeGestionar, alCerrar, alRetener }: Props) {
  const { zonaHoraria } = useRegional()
  const { live } = useLive()
  const { vigentes, releer, reintentar } = useTiposCambioVigentes()

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
        <ListaDeTiposCambio
          filas={vigentes.filas}
          hayMas={vigentes.hayMas}
          puedeCambiar={puedeGestionar && !live}
          releer={releer}
          alRetener={alRetener}
        />
      ) : null}
      <PieDelPopover puedeGestionar={puedeGestionar} alCerrar={alCerrar} />
    </div>
  )
}
