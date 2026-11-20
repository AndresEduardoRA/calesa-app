'use client'

import { PlusIcon } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { parseAsString, useQueryStates } from 'nuqs'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LA_LISTA_DE_ORIGENES } from '@/shared/lib/paginacion'
import { rutaDeParteDelOrigen } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import type { OrigenConUso } from '../../../entities/origen'
import { faltasDeLaTarjeta } from '../../../entities/pasos'
import { useOrigenes } from '../hooks/use-origenes'
import { PanelNuevoOrigen } from './panel-nuevo-origen'
import { TarjetaDeOrigen } from './tarjeta-de-origen'

type Props = {
  // Los que la persona abre, ya cortados al tope (`TOPE_DE_LA_LISTA_DE_ORIGENES`); `hayMas` dice si quedaron otros.
  origenes: readonly OrigenConUso[]
  hayMas: boolean
  puedeGestionar: boolean
  // Si la integración no se pudo leer, la página la da por activa: no se inventa una falta.
  apibaraActiva: boolean
}

const PANEL_NUEVO = 'nuevo'

function BotonNuevo({ puedeGestionar, alCrear }: { puedeGestionar: boolean; alCrear: () => void }) {
  return (
    <Button className="h-11 md:h-8" onClick={alCrear} disabled={!puedeGestionar}>
      <PlusIcon aria-hidden />
      Nuevo origen
    </Button>
  )
}

// Los orígenes que la persona abre como tarjetas, también los desactivados, con su estado y lo que les falta. Abrir uno lleva a su página;
// crear abre un panel con su URL (`?panel=nuevo`). Son decenas: se dibujan hasta el tope, con su aviso.
export function ListaDeOrigenes({ origenes, hayMas, puedeGestionar, apibaraActiva }: Props) {
  const router = useRouter()
  const ediciones = useOrigenes()
  const [{ panel }, setParametros] = useQueryStates({ panel: parseAsString }, { shallow: false })
  const cerrar = () => void setParametros({ panel: null })

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Orígenes</h1>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            De dónde vienen los vehículos: sus datos, sus campos y sus categorías.
          </p>
        </div>
        <BotonNuevo
          puedeGestionar={puedeGestionar}
          alCrear={() => void setParametros({ panel: PANEL_NUEVO })}
        />
      </div>
      {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_ORIGENES}</Aviso>}
      {origenes.length === 0 && !puedeGestionar ? (
        <EstadoVacio titulo="No hay orígenes que puedas abrir." />
      ) : origenes.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay orígenes"
          descripcion="Un origen es de dónde vienen los vehículos. Al crearlo nacen su flujo de logística y sus campos."
          accion={
            puedeGestionar ? (
              <Button onClick={() => void setParametros({ panel: PANEL_NUEVO })}>
                Crear el primer origen
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 @min-[40rem]/configuracion:grid-cols-2">
          {origenes.map((origen) => (
            <TarjetaDeOrigen
              key={origen.id}
              origen={origen}
              faltas={faltasDeLaTarjeta(origen, { apibaraActiva })}
            />
          ))}
        </ul>
      )}
      {hayMas ? (
        <AvisoDeTope texto={textoDelTope(TOPE_DE_LA_LISTA_DE_ORIGENES, { orden: 'primeros' })} />
      ) : null}
      <PanelNuevoOrigen
        abierto={panel === PANEL_NUEVO && puedeGestionar}
        ediciones={ediciones}
        alCerrar={cerrar}
        alCrear={(id) => {
          // Sin `cerrar()` antes: el cambio de `?panel=` y la navegación se pisarían, y gana el
          // último en llegar. La pantalla del origen no trae el panel.
          router.push(rutaDeParteDelOrigen(id, 'datos') as Route)
        }}
      />
    </div>
  )
}
