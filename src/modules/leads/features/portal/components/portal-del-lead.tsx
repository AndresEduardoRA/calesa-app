'use client'

import { useAction } from 'next-safe-action/hooks'
import { KeyRoundIcon, LockOpenIcon } from 'lucide-react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Button } from '@/shared/ui/button'
import { TITULO_DE_BLOQUE } from '@/shared/ui/ficha-en-bloques'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  ETIQUETA_DEL_MENU_DEL_PORTAL,
  ETIQUETA_DEL_PRINCIPAL,
  accionesDelPortal,
  type AccesoDelCliente,
  type LineaDelMenuDelPortal,
  type PrincipalDelPortal,
} from '../../../entities/portal'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { desbloquearPortal } from '../actions/desbloquear-portal'
import { usePanelDePortal } from '../hooks/use-panel-de-portal'
import { BotonCopiar } from './boton-copiar'
import { DialogoDeOtorgarDiferido } from './diferidos'
import { DialogoDeRevocar } from './dialogo-de-revocar'
import { EstadoDelPortal } from './estado-del-portal'

type Props = {
  leadId: string
  leadNombre: string
  acceso: AccesoDelCliente
  // Para el texto de WhatsApp: el nombre de la empresa y la dirección de la web (nula si no hay).
  empresa: string
  direccion: string | null
  // El mensaje del portal de la empresa; nulo = el de fábrica.
  mensaje: string | null
}

const PRINCIPAL = 'h-11 w-full md:h-9'

// El botón principal del bloque, a todo el ancho: compartir el código del acceso que vale, desbloquearlo o dar uno.
function BotonPrincipal({
  acceso,
  principal,
  enCurso,
  alDarAcceso,
  alDesbloquear,
}: {
  acceso: AccesoDelCliente
  principal: PrincipalDelPortal
  enCurso: boolean
  alDarAcceso: () => void
  alDesbloquear: () => void
}) {
  if (principal === 'compartir_acceso' && acceso.estado !== 'sin_acceso') {
    return (
      <BotonCopiar
        texto={acceso.codigo}
        etiqueta={ETIQUETA_DEL_PRINCIPAL.compartir_acceso}
        copiado="Código copiado"
        variante="default"
        className={PRINCIPAL}
      />
    )
  }
  if (principal === 'desbloquear') {
    return (
      <Button className={PRINCIPAL} onClick={alDesbloquear} disabled={enCurso}>
        <LockOpenIcon aria-hidden />
        {ETIQUETA_DEL_PRINCIPAL.desbloquear}
      </Button>
    )
  }
  return (
    <Button className={PRINCIPAL} onClick={alDarAcceso}>
      <KeyRoundIcon aria-hidden />
      {ETIQUETA_DEL_PRINCIPAL.dar_acceso}
    </Button>
  )
}

// «Acceso al portal» de la ficha (sólo con el lead en la cartera y `leads.portal.gestionar`), de un vistazo: el título, una línea de estado
// y un botón principal a todo el ancho (`accionesDelPortal()`): «Dar acceso», «Compartir acceso» (copia el código) o «Desbloquear». Lo demás
// («Cambiar la clave», «Quitar el acceso») va en el «⋯» del título, que en el DOM sigue al botón: Tab llega antes a lo principal.
export function PortalDelLead({ leadId, leadNombre, acceso, empresa, direccion, mensaje }: Props) {
  const panel = usePanelDePortal()
  const desbloqueo = useAction(desbloquearPortal)
  const vigente = acceso.estado === 'activo' || acceso.estado === 'bloqueado'
  const montarOtorgar = useAbiertoAlgunaVez(panel.otorgando)
  const acciones = accionesDelPortal(acceso)

  async function desbloquear() {
    const envio = await enviarAccion(desbloqueo.executeAsync({ leadId }), MENSAJE_DE_VALIDACION)
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    avisarExito('Listo: ya puede volver a intentar.')
  }

  const alElegir: Record<LineaDelMenuDelPortal, () => void> = {
    cambiar_clave: panel.abrirOtorgar,
    quitar_acceso: panel.abrirRevocar,
  }
  const menu: AccionDeMenu[] = acciones.menu.map((clave) => ({
    tipo: 'accion',
    clave,
    etiqueta: ETIQUETA_DEL_MENU_DEL_PORTAL[clave],
    alElegir: alElegir[clave],
    despuesDeCerrar: true,
    destructiva: clave === 'quitar_acceso',
    deshabilitada: desbloqueo.isExecuting,
  }))

  return (
    <section
      aria-labelledby="titulo-portal"
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3"
    >
      <h2 id="titulo-portal" className={TITULO_DE_BLOQUE}>
        Acceso al portal
      </h2>
      <div className="col-span-2">
        <EstadoDelPortal acceso={acceso} />
      </div>
      <div className="col-span-2">
        <BotonPrincipal
          acceso={acceso}
          principal={acciones.principal}
          enCurso={desbloqueo.isExecuting}
          alDarAcceso={panel.abrirOtorgar}
          alDesbloquear={() => void desbloquear()}
        />
      </div>
      {menu.length > 0 ? (
        <div className="col-start-2 row-start-1 -my-2 -mr-2 flex">
          <MasAcciones nombre="acceso al portal" acciones={menu} />
        </div>
      ) : null}
      {montarOtorgar ? (
        <DialogoDeOtorgarDiferido
          abierto={panel.otorgando}
          alCerrar={panel.cerrar}
          leadId={leadId}
          leadNombre={leadNombre}
          acceso={acceso}
          empresa={empresa}
          direccion={direccion}
          mensaje={mensaje}
        />
      ) : null}
      {vigente ? (
        <DialogoDeRevocar
          abierto={panel.revocando}
          alCerrar={panel.cerrar}
          leadId={leadId}
          leadNombre={leadNombre}
          codigo={acceso.codigo}
        />
      ) : null}
    </section>
  )
}
