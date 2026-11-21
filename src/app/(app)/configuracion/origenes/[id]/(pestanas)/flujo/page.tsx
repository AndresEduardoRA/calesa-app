import type { Metadata } from 'next'
import { CONSULTA_DE_LA_EDICION, enLaEdicion } from '@/shared/lib/edicion'
import { rutaDeParteDelOrigen, unParametro } from '@/shared/lib/rutas'
import {
  CaminoDeLaEdicion,
  EdicionAPantallaCompleta,
  EntrarALaEdicion,
} from '@/shared/ui/edicion-a-pantalla-completa'
import { EditorDelFlujo } from '../../../../_flujo/editor-del-flujo'
import { abrirOrigen } from '../../abrir-origen'
import { NoSeAbre } from '../../no-se-abre'

export const metadata: Metadata = { title: 'Flujo del origen' }

// Configuración › Orígenes › un origen › Flujo: las fases por las que pasa un vehículo de este origen, con sus reglas y sus tipos de documento en el panel; «Editar»
// lo abre a pantalla completa (`?editar=si`; `?fase=` y `?seccion=` solos no entran al modo: son enlaces de siempre). Pide `flujos.configurar` en este origen; nunca
// abre el flujo de otro.
export default async function PaginaFlujoDelOrigen({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]/flujo'>) {
  const [{ id }, parametros] = await Promise.all([params, searchParams])
  const abierto = await abrirOrigen(id, 'flujo')
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  const editor = (
    <EditorDelFlujo
      permisos={abierto.sesion.permisos}
      fijo={{ origenId: abierto.origen.id }}
      seccionPedida={unParametro(parametros['seccion'])}
    />
  )
  if (!enLaEdicion(parametros)) {
    return (
      <div className="grid min-w-0 gap-4">
        <div className="flex justify-end">
          <EntrarALaEdicion
            href={rutaDeParteDelOrigen(abierto.origen.id, 'flujo', CONSULTA_DE_LA_EDICION)}
            nombre="el flujo"
          />
        </div>
        {editor}
      </div>
    )
  }
  return (
    <EdicionAPantallaCompleta
      salirA={rutaDeParteDelOrigen(abierto.origen.id, 'flujo')}
      titulo="Flujo"
      camino={
        <CaminoDeLaEdicion
          pasos={[
            {
              nombre: abierto.origen.nombre,
              ruta: rutaDeParteDelOrigen(abierto.origen.id, 'datos'),
            },
          ]}
        />
      }
    >
      <div className="mx-auto grid max-w-7xl min-w-0 gap-4">{editor}</div>
    </EdicionAPantallaCompleta>
  )
}
