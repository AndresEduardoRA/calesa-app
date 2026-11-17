'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import type { FilaDeLead } from '../../../entities/listado'
import { ModalDeAccionDeFilaDiferido } from '../../listado/components/diferidos'
import { NuevaOportunidadDelLead } from '../../oportunidades/components/nueva-oportunidad-del-lead'
import { useDrawerDeLead } from '../hooks/use-drawer-de-lead'

// «Nueva oportunidad…» dentro del resumen (`?lead=<id>&panel=oportunidad-rapida`), también dentro del drawer por lo mismo que el panel de edición. Sólo con
// `leads.editar` y el lead en la cartera (como el «⋯» que lo pide).
function OportunidadDelDrawer(props: {
  lead: FilaDeLead | null
  puedeEditar: boolean
  pedida: boolean
  alCerrar: () => void
}) {
  const { lead, puedeEditar, pedida, alCerrar } = props
  if (lead === null || !puedeEditar || !lead.enCartera) {
    return null
  }
  return (
    <NuevaOportunidadDelLead
      leadId={lead.id}
      nombre={lead.nombre}
      abierto={pedida}
      alCerrar={alCerrar}
    />
  )
}

// «Anotar seguimiento…» y «Agendar recordatorio…» del «⋯» dentro del resumen (`?lead=<id>&panel=anotar-seguimiento|agendar-recordatorio`, sin
// `para`): el mismo modal que las filas, anidado en el drawer (Esc cierra sólo el modal). Sólo con `leads.editar` y el lead en la cartera, como
// el «⋯» que lo ofrece; si no, la URL no abre nada. Al guardar, el resumen relee su lead y la lista su página (la fila lo muestra).
function AccionDelDrawer(props: {
  accion: 'anotar' | 'agendar' | null
  lead: FilaDeLead | null
  puedeEditar: boolean
  alCerrar: () => void
  alGuardar: () => void
}) {
  const { lead, puedeEditar, alCerrar, alGuardar } = props
  const pedida = props.accion !== null && lead !== null && puedeEditar && lead.enCartera
  const accion = useUltimo(pedida ? props.accion : null)
  const apertura = useApertura(pedida)
  const montar = useAbiertoAlgunaVez(pedida)
  // Los tipos activos se piden la primera vez que se anota y quedan para las siguientes.
  const [tipos, setTipos] = useState<readonly TipoDeSeguimiento[] | null>(null)
  if (!montar || lead === null || accion === null) {
    return null
  }
  return (
    <ModalDeAccionDeFilaDiferido
      key={`${String(apertura)}:${accion}:${lead.id}`}
      accion={accion}
      lead={lead}
      abierto={pedida}
      alCerrar={alCerrar}
      alGuardar={alGuardar}
      tipos={tipos}
      alLeerTipos={setTipos}
    />
  )
}

// Los modales del «⋯» del resumen, dentro del drawer (Base UI los anida: Esc cierra sólo el de arriba). Al guardar un seguimiento o un
// recordatorio, el resumen vuelve a leer su lead (`alGuardar`) y la lista su página.
export function ModalesDelResumen({
  lead,
  puedeEditar,
  alGuardar,
}: {
  lead: FilaDeLead | null
  puedeEditar: boolean
  alGuardar: () => void
}) {
  const drawer = useDrawerDeLead()
  const router = useRouter()
  return (
    <>
      <OportunidadDelDrawer
        lead={lead}
        puedeEditar={puedeEditar}
        pedida={drawer.nuevaOportunidad}
        alCerrar={drawer.cerrarModal}
      />
      <AccionDelDrawer
        accion={drawer.accion}
        lead={lead}
        puedeEditar={puedeEditar}
        alCerrar={drawer.cerrarModal}
        alGuardar={() => {
          alGuardar()
          router.refresh()
        }}
      />
    </>
  )
}
