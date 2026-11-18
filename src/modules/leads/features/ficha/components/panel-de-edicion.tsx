'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { SIN_NUMEROS } from '@/shared/lib/numeros-de-lead'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { useNumeroEscrito } from '@/shared/ui/numero-de-lead'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { LeadDeFicha } from '../../../entities/ficha'
import { telefonosDeLaFicha } from '../../../entities/telefonos'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'
import {
  ContenidoDeLaEdicion,
  type Datos,
  type SalidasFueraDeLaFicha,
} from './contenido-de-la-edicion'
import { TelefonosDelPanel } from './telefonos-del-panel'

type Props = Datos & {
  // Cartera y `leads.editar`: todo el formulario.
  puedeEditar: boolean
  // Cartera y `leads.telefonos_extra.editar`: los extras se administran desde el panel. Sin `puedeEditar`, el panel abre sólo con los
  // teléfonos (el «modo teléfonos»).
  puedeEditarExtras: boolean
  // `leads.configurar`: el enlace «Cambiar el máximo».
  puedeConfigurar: boolean
  // Cartera y `leads.editar`, en la ficha: «Cambiar el principal» en el bloque de teléfonos.
  puedeCambiarTelefono?: boolean
  // Abierto desde el «⋯» de la lista o del kanban (`?panel=editar-lead&para=<id>`): qué hacer donde la ficha no está debajo.
  fueraDeLaFicha?: SalidasFueraDeLaFicha
}

// El «modo teléfonos»: quien sólo administra los extras (sin `leads.editar`) ve los teléfonos y nada más; lo demás no se le ofrece.
function SoloTelefonos({
  ficha,
  puedeConfigurar,
  alCerrar,
}: {
  ficha: LeadDeFicha
  puedeConfigurar: boolean
  alCerrar: () => void
}) {
  const router = useRouter()
  return (
    <div className="grid gap-4">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Los demás datos los edita quien tiene el permiso.
      </p>
      <TelefonosDelPanel
        lead={telefonosDeLaFicha(ficha)}
        puedeEditarExtras
        puedeConfigurar={puedeConfigurar}
        alCambiar={router.refresh}
        cambiarElPrincipal={null}
      />
      <div className="flex justify-end border-t border-(--color-line) pt-3">
        <Button type="button" variant="outline" className="min-h-11 md:min-h-9" onClick={alCerrar}>
          Cerrar
        </Button>
      </div>
    </div>
  )
}

const tituloDelPanel = (ficha: LeadDeFicha | null, soloTelefonos: boolean) => {
  if (!ficha) {
    return 'Editar lead'
  }
  return soloTelefonos ? `Teléfonos de ${ficha.nombre}` : `Editar ${ficha.nombre}`
}

type PropsDelCuerpo = Omit<Props, 'puedeEditar' | 'puedeCambiarTelefono'> & {
  soloTelefonos: boolean
  alCerrar: () => void
  alCambiarElPrincipal: (() => void) | null
}

// Lo de adentro: el modo teléfonos o el formulario completo.
function CuerpoDelPanel({
  soloTelefonos,
  alCerrar,
  fueraDeLaFicha,
  puedeEditarExtras,
  puedeConfigurar,
  alCambiarElPrincipal,
  ...datos
}: PropsDelCuerpo) {
  const { ficha } = datos
  if (soloTelefonos) {
    return <SoloTelefonos ficha={ficha} puedeConfigurar={puedeConfigurar} alCerrar={alCerrar} />
  }
  return (
    <ContenidoDeLaEdicion
      // Otra versión de lo que se edita (se recargó tras un conflicto) arranca de nuevo.
      key={`${ficha.id}-${ficha.actualizadoEn}`}
      {...datos}
      alCerrar={alCerrar}
      fueraDeLaFicha={fueraDeLaFicha}
      puedeEditarExtras={puedeEditarExtras}
      puedeConfigurar={puedeConfigurar}
      alCambiarElPrincipal={alCambiarElPrincipal}
    />
  )
}

// Mientras se cierra, el panel sigue mostrando lo que tenía, con su número bajo el título.
function useFichaALaVista(abierto: boolean, ficha: LeadDeFicha) {
  const aLaVista = useUltimo(abierto ? ficha : null)
  const mostrada = abierto ? ficha : aLaVista
  const numero = useNumeroEscrito(mostrada?.numeros ?? SIN_NUMEROS)
  return { ficha: mostrada, descripcion: mostrada ? (numero.principal ?? undefined) : undefined }
}

// «Cambiar el principal»: pasa al panel del cambio reemplazando la entrada, y este panel se cierra sin devolver el foco (es del que abre).
function usePasoAlTelefono(panel: ReturnType<typeof usePanelDeLead>, habilitado: boolean) {
  const pasando = useRef(false)
  return {
    alCambiar: habilitado
      ? () => {
          pasando.current = true
          panel.telefono.reemplazar()
        }
      : null,
    focoAlCerrar: () => {
      const paso = pasando.current
      pasando.current = false
      return paso ? false : focoDeQuienAbrio()
    },
  }
}

// El panel de edición de la ficha (`?panel=editar-lead`). Abre con `leads.editar` (todo el formulario) o, sin él, con
// `leads.telefonos_extra.editar` (sólo los teléfonos), siempre con el lead en la cartera: sin permiso no hay botón y la URL no abre
// nada. Se queda a pantalla completa en el celular y con «Guardar» siempre a la vista. «Cambiar el principal» pasa al panel del cambio
// (`?panel=cambiar-telefono`, reemplazando la entrada del historial): éste se cierra sin devolver el foco, que es del que abre.
export function PanelDeEdicion({ puedeEditar, puedeCambiarTelefono, ...resto }: Props) {
  const panel = usePanelDeLead()
  const soloTelefonos = !puedeEditar && resto.puedeEditarExtras
  const abierto = (puedeEditar || resto.puedeEditarExtras) && panel.abierto
  const { ficha, descripcion } = useFichaALaVista(abierto, resto.ficha)
  const paso = usePasoAlTelefono(panel, Boolean(puedeCambiarTelefono) && !resto.fueraDeLaFicha)
  return (
    <Drawer
      abierto={abierto}
      alCerrar={panel.cerrar}
      titulo={tituloDelPanel(ficha, soloTelefonos)}
      descripcion={descripcion}
      ancho="amplio"
      focoAlCerrar={paso.focoAlCerrar}
    >
      {ficha ? (
        <CuerpoDelPanel
          {...resto}
          ficha={ficha}
          soloTelefonos={soloTelefonos}
          alCerrar={panel.cerrar}
          alCambiarElPrincipal={paso.alCambiar}
        />
      ) : null}
    </Drawer>
  )
}
