'use client'

import { Interruptor } from '@/shared/ui/interruptor'
import { TarjetaDeAjustes } from '@/shared/ui/tarjetas-de-ajustes'
import { estadoDeIntegracion, type Integracion } from '../../../entities/integraciones'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { usePushWeb } from '../hooks/use-push-web'
import { EstadoDeLaIntegracion } from './estado-de-la-integracion'

type Props = { pushWeb: Integracion; sinClavePublica: boolean; puedeEditar: boolean }

const AYUDA =
  'Con los avisos activos, las personas con permiso reciben en su navegador los avisos que ya ven en la campana. Cada persona los enciende en su perfil.'
const SIN_CLAVE = 'Falta la clave pública: sin ella nadie puede activar el aviso en su navegador.'

// La tarjeta «Avisos push»: su estado y el interruptor de la empresa, que guarda al instante; no tiene nada más que editar. Encenderlo no exige
// la clave pública; si falta, lo dice.
export function TarjetaDeAvisosPush({ pushWeb, sinClavePublica, puedeEditar }: Props) {
  const ediciones = usePushWeb(pushWeb.actualizadoEn)
  return (
    <TarjetaDeAjustes
      titulo="Avisos push"
      estado={<EstadoDeLaIntegracion estado={estadoDeIntegracion(pushWeb, { sinClavePublica })} />}
    >
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Manda a los navegadores de tu equipo los avisos de la campana.
      </p>
      <Interruptor
        titulo="Activos"
        ayuda={sinClavePublica ? `${AYUDA} ${SIN_CLAVE}` : AYUDA}
        valor={pushWeb.activa}
        alCambiar={(activa) => void ediciones.cambiarEstado(activa)}
        deshabilitado={!puedeEditar || ediciones.enCurso}
      />
      {puedeEditar ? null : (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          {MOTIVO_SIN_PERMISO_AJUSTES}
        </p>
      )}
    </TarjetaDeAjustes>
  )
}
