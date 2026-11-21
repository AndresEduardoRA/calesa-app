'use client'

import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { MOTIVO_SIN_PERMISO_PUSH } from '../../../entities/motivos'
import type { SuscripcionPropia } from '../../../entities/suscripcion'
import { PreferenciasPorTipo } from '../../preferencias/components/preferencias-por-tipo'
import type { PreferenciasPorTipo as Preferencias } from '../../preferencias/hooks/use-preferencias-por-tipo'
import { MisNavegadores } from './mis-navegadores'

type Props = {
  abierto: boolean
  alCerrar: () => void
  tienePermiso: boolean
  preferencias: Preferencias
  suscripciones: SuscripcionPropia[]
  esteNavegador: string | null
  ocupado: boolean
  alQuitar: (endpoint: string) => void
}

// «Notificaciones» (`?panel=notificaciones`, o `/perfil#notificaciones`): los avisos por tipo y «Tus navegadores». Cada cambio se guarda al hacerlo, así que
// no hay «Guardar»: sólo «Listo».
export function ModalDeNotificaciones({
  abierto,
  alCerrar,
  tienePermiso,
  preferencias,
  suscripciones,
  esteNavegador,
  ocupado,
  alQuitar,
}: Props) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Notificaciones"
      descripcion="Los avisos push llegan a tu navegador aunque tengas la app cerrada. Cada cambio se guarda al hacerlo."
      ancho="amplio"
      pie={<Button onClick={alCerrar}>Listo</Button>}
    >
      <PreferenciasPorTipo
        preferencias={preferencias}
        motivoSiNoPuede={tienePermiso ? null : MOTIVO_SIN_PERMISO_PUSH}
      />
      <MisNavegadores
        suscripciones={suscripciones}
        esteNavegador={esteNavegador}
        ocupado={ocupado}
        alQuitar={alQuitar}
      />
    </Modal>
  )
}
