// Lo que el servidor lee para un panel del «⋯» del vehículo cuando la URL lo nombra (`?panel=imagenes|vitrina&para=<id>` en el inventario,
// `?panel=imagenes` en la ficha): una lectura por apertura. `id` es el vehículo pedido, para que el panel no muestre otro mientras llega el nuevo;
// `disponible: false` cuando no existe, no se ve o es de otro origen (el panel lo dice igual que la ficha: no confirma que exista). Sin I/O.
import type { Galeria } from './foto'
import type { FotoDeSubasta } from './subasta-fotos'
import type { Vehiculo } from './vehiculo'
import type { VistaPreviaDeVitrina } from './vitrina'

type NoDisponible = { id: string; disponible: false }

export type DatosDelPanelDeImagenes =
  | NoDisponible
  | {
      id: string
      disponible: true
      titulo: string
      galeria: Galeria
      // Si quien mira puede cambiar las fotos de este vehículo (lo decide la base).
      puedeEditar: boolean
      // Las fotos de su subasta que apibara trajo y todavía no están (ya filtradas en el servidor: el bruto no cruza).
      deSubasta?: { origenId: string; fotas: readonly FotoDeSubasta[] }
    }

export type DatosDelPanelDeVitrina =
  | NoDisponible
  | { id: string; disponible: true; vehiculo: Vehiculo; previa: VistaPreviaDeVitrina | null }
