'use client'

import { useId, type ReactNode } from 'react'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import type { VistaDeLista } from '@/shared/lib/vista-de-lista'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import type { GrupoDeVistaYOpciones } from '@/shared/ui/filtros'
import { ConmutadorDeVista } from '@/shared/ui/lista'
import { Switch } from '@/shared/ui/switch'

type Datos = {
  vista: { vista: VistaDeLista; cambiar: (vista: VistaDeLista) => void }
  agrupar: { agrupar: boolean; cambiar: (valor: boolean) => void; cambiando: boolean }
  vistas: ReactNode
  junto?: ReactNode
}

const NOMBRE_DE_LA_VISTA: Record<VistaDeLista, string> = { tabla: 'Tabla', tarjetas: 'Tarjetas' }

// «Agrupar por vehículo»: el interruptor con su nombre y lo que hace (`aria-describedby`). Cambiarlo relee la lista.
function AgruparPorVehiculo({ agrupar }: Pick<Datos, 'agrupar'>) {
  const id = useId()
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span id={id} className="text-(length:--text-sm) text-(--color-ink)">
        Una tarjeta por vehículo, con las demás desplegables.
      </span>
      <Switch
        aria-label="Agrupar por vehículo"
        aria-describedby={id}
        data-agrupar-por-vehiculo=""
        checked={agrupar.agrupar}
        disabled={agrupar.cambiando}
        onCheckedChange={agrupar.cambiar}
      />
    </div>
  )
}

// Los grupos de «Vista y opciones» de la lista de cotizaciones: tabla o tarjetas (sólo en escritorio: por debajo de 768 px siempre van las tarjetas), «Agrupar por
// vehículo», las vistas guardadas y «Más» (si la página lo pasó). «Ítems por página» lo suma `FilterShell`. Cambiar la vista no cierra el panel ni necesita red.
export function useOpcionesDelListado(datos: Datos): GrupoDeVistaYOpciones[] {
  const enEscritorio = useAlMenos(CORTE_DE_LA_TABLA)
  const grupos: GrupoDeVistaYOpciones[] = []
  if (enEscritorio) {
    grupos.push({
      clave: 'vista',
      titulo: 'Vista',
      contenido: <ConmutadorDeVista vista={datos.vista.vista} alCambiar={datos.vista.cambiar} />,
      resumen: NOMBRE_DE_LA_VISTA[datos.vista.vista],
      sinRed: 'sigue',
    })
  }
  grupos.push({
    clave: 'agrupar',
    titulo: 'Agrupar por vehículo',
    contenido: <AgruparPorVehiculo agrupar={datos.agrupar} />,
  })
  grupos.push({ clave: 'vistas', titulo: 'Vistas guardadas', contenido: datos.vistas })
  if (datos.junto !== undefined) {
    grupos.push({ clave: 'mas', titulo: 'Más', contenido: datos.junto })
  }
  return grupos
}
