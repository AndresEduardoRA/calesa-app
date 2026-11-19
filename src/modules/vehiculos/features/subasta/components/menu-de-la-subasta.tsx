'use client'

import { CalendarClockIcon } from 'lucide-react'
import { useState } from 'react'
import { diferido } from '@/shared/ui/diferido'
import { MasAcciones } from '@/shared/ui/lista'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { FechasDeSubasta } from '../../../entities/fechas-de-subasta'

// El formulario se pide recién al abrirse: la ficha no carga su código para mostrarse.
const ModalDeFechasDeSubastaDiferido = diferido(() =>
  import('./modal-de-fechas-de-subasta').then((modulo) => modulo.ModalDeFechasDeSubasta),
)

// `?panel=fechas-de-subasta`: lo nombra también el enlace viejo del resumen (`entities/enlace-viejo-del-resumen.ts`).
const PANEL_DE_FECHAS_DE_SUBASTA = 'fechas-de-subasta'

type Props = {
  vehiculoId: string
  actualizadoEn: string
  fechas: FechasDeSubasta
  ahora: string
}

// El «⋯» de «Subasta», para quien puede editar el vehículo: «Editar fechas» (A4b), que abre su modal por la URL cuando el menú terminó de cerrarse (si
// no, el foco que vuelve al botón lo cierra). La URL abre el modal también sin pasar por el menú (recargar, el enlace viejo).
export function MenuDeLaSubasta({ vehiculoId, actualizadoEn, fechas, ahora }: Props) {
  const panel = usePanelPorUrl(PANEL_DE_FECHAS_DE_SUBASTA)
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const [apertura, setApertura] = useState(0)
  return (
    <>
      <MasAcciones
        nombre="la subasta"
        id={`${vehiculoId}-subasta`}
        acciones={[
          {
            tipo: 'accion',
            clave: 'editar-fechas',
            etiqueta: 'Editar fechas',
            icono: <CalendarClockIcon aria-hidden />,
            despuesDeCerrar: true,
            alElegir: () => {
              setApertura((antes) => antes + 1)
              panel.abrir()
            },
          },
        ]}
      />
      {montado ? (
        <ModalDeFechasDeSubastaDiferido
          key={apertura}
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          vehiculoId={vehiculoId}
          actualizadoEn={actualizadoEn}
          fechas={fechas}
          ahora={ahora}
        />
      ) : null}
    </>
  )
}
