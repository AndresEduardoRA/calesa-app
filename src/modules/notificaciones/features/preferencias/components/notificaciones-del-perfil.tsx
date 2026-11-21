import 'server-only'
import { leerApagadosDePush, leerMisSuscripciones } from '../../../composicion'
import { SeccionDeNotificacionesDiferida } from '../../push/components/diferidos'

type Props = {
  usuarioId: string
  tienePermiso: boolean
  integracionActiva: boolean
  clavePublica: string | null
}

// La tarjeta «Notificaciones» de `/perfil` (el ancla `#notificaciones` abre su modal). Lee sus dos cosas en el servidor y, si una falla, la
// tarjeta dibuja el error con «Reintentar» sin tumbar el perfil. Dibuja dentro del tablero de tarjetas de la página.
export async function NotificacionesDelPerfil({
  usuarioId,
  tienePermiso,
  integracionActiva,
  clavePublica,
}: Props) {
  const [suscripciones, apagados] = await Promise.all([
    leerMisSuscripciones(usuarioId),
    leerApagadosDePush(usuarioId),
  ])
  return (
    <SeccionDeNotificacionesDiferida
      tienePermiso={tienePermiso}
      integracionActiva={integracionActiva}
      clavePublica={clavePublica}
      suscripciones={suscripciones.ok ? suscripciones.data : null}
      apagados={apagados.ok ? apagados.data : null}
    />
  )
}
