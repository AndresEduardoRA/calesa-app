'use client'

import type { VistaGuardada } from '@/modules/equipo/client'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import type { VistaDeLista } from '@/shared/lib/vista-de-lista'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import type { GrupoDeVistaYOpciones } from '@/shared/ui/filtros'
import { ConmutadorDeVista } from '@/shared/ui/lista'
import { EnlaceAPapelera } from '../../papelera/components/enlace-a-papelera'
import { VistasDeVehiculos } from './vistas-de-vehiculos'

type Datos = {
  esquema: EsquemaDeFiltros
  origenId: string
  vistas: readonly VistaGuardada[]
  verPapelera: boolean
  vista: { vista: VistaDeLista; cambiar: (vista: VistaDeLista) => void }
}

const NOMBRE_DE_LA_VISTA: Record<VistaDeLista, string> = { tabla: 'Tabla', tarjetas: 'Tarjetas' }

// Los grupos de «Vista y opciones» del inventario: tabla o tarjetas (escritorio), las vistas guardadas y la papelera. «Ítems por página» lo
// suma `FilterShell`. Cambiar la vista no cierra el panel ni necesita red (se guarda en la cuenta con su aviso de siempre). «Tabla | Tarjetas»
// sólo en escritorio: por debajo de 768 px siempre van las tarjetas y no hay nada que elegir.
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
    clave: 'vistas',
    titulo: 'Vistas guardadas',
    contenido: (
      <VistasDeVehiculos esquema={datos.esquema} origenId={datos.origenId} vistas={datos.vistas} />
    ),
  })
  if (datos.verPapelera) {
    grupos.push({ clave: 'mas', titulo: 'Más', contenido: <EnlaceAPapelera /> })
  }
  return grupos
}
