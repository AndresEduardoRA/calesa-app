'use client'

import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { ok } from '@/shared/lib/errores'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerCatalogosDeEdicion, leerFichaDelLead } from '../../../composicion.client'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import { PanelDeEdicion } from './panel-de-edicion'
import { PanelSinFormulario } from './panel-sin-formulario'

export type PermisosDeEdicionFueraDeLaFicha = {
  // Como si el lead estuviera en la cartera: el panel los combina con la del lead leído.
  editar: boolean
  telefonos: boolean
  // `leads.configurar`: el enlace «Cambiar el máximo» de los teléfonos.
  configurar: boolean
}

type Props = {
  leadId: string
  // Mientras llega la ficha, el panel se llama «Editar lead».
  abierto: boolean
  alCerrar: () => void
  permisos: PermisosDeEdicionFueraDeLaFicha
}

const ES_GUID = z.guid()

// La ficha (`lead_ficha`: la versión, lo que quien mira recibe, los teléfonos) y el layout y los catálogos, en paralelo y una vez por
// apertura. Un id que no es un id no se pide: es un lead que no se ve.
async function leerLoDelPanel(leadId: string) {
  if (!ES_GUID.safeParse(leadId).success) {
    return ok(null)
  }
  const [ficha, catalogos] = await Promise.all([leerFichaDelLead(leadId), leerCatalogosDeEdicion()])
  if (!ficha.ok) {
    return ficha
  }
  if (!catalogos.ok) {
    return catalogos
  }
  return ok(ficha.data === null ? null : { ficha: ficha.data, catalogos: catalogos.data })
}

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando el lead" className="grid gap-3">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  )
}

function SinLead({ fallo, alReintentar }: { fallo: boolean; alReintentar: () => void }) {
  return (
    <div role="alert" className="grid gap-3">
      <p className="text-(length:--text-sm) text-(--color-ink)">
        {fallo ? 'No se pudo cargar el lead.' : MENSAJE_DE_LEAD_NO_DISPONIBLE}
      </p>
      {fallo ? (
        <Button
          type="button"
          variant="outline"
          onClick={alReintentar}
          className="min-h-11 w-fit md:min-h-9"
        >
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}

// El panel de edición de la ficha abierto desde el «⋯» de la lista o del kanban (`?panel=editar-lead&para=<id>`): lee el lead al abrirse
// (un pedido, con los catálogos) y dibuja el mismo panel, en modo teléfonos para quien sólo los administra. Se monta de nuevo en cada
// apertura (`key`): cada una arranca de lo guardado. Un lead que ya no se ve, ajeno o fuera de la cartera lo dice en el panel, igual que uno
// que no existe. Al guardar, la acción vuelve a leer la lista (`revalidatePath`); si quien edita lo pierde, el panel se cierra y la lista se relee.
export function EdicionFueraDeLaFicha({ leadId, abierto, alCerrar, permisos }: Props) {
  const router = useRouter()
  const { zonaHoraria } = useRegional()
  const { lectura, reintentar } = useLecturaAlMontar(() => leerLoDelPanel(leadId), leadId)
  const leido = lectura.estado === 'leido' ? lectura.dato : null
  const puedeEditar = leido !== null && permisos.editar && leido.ficha.enCartera
  const puedeEditarExtras = leido !== null && permisos.telefonos && leido.ficha.enCartera
  if (leido === null || !(puedeEditar || puedeEditarExtras)) {
    return (
      <PanelSinFormulario nombre="lead" abierto={abierto} alCerrar={alCerrar}>
        {lectura.estado === 'leyendo' ? (
          <Cargando />
        ) : (
          <SinLead fallo={lectura.estado === 'fallo'} alReintentar={reintentar} />
        )}
      </PanelSinFormulario>
    )
  }
  return (
    <PanelDeEdicion
      ficha={leido.ficha}
      campos={leido.catalogos.campos}
      origenes={leido.catalogos.origenes}
      tipos={leido.catalogos.tipos}
      zona={zonaHoraria}
      puedeEditar={puedeEditar}
      puedeEditarExtras={puedeEditarExtras}
      puedeConfigurar={permisos.configurar}
      fueraDeLaFicha={{ alRecargar: reintentar, alPerderElLead: router.refresh }}
    />
  )
}
