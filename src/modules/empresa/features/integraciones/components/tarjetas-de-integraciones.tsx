'use client'

import type { ConteoAcotado } from '@/shared/lib/conteo'
import { Aviso } from '@/shared/ui/aviso'
import { TarjetasDeAjustes } from '@/shared/ui/tarjetas-de-ajustes'
import type { Integracion } from '../../../entities/integraciones'
import {
  MOTIVO_INTEGRACION_NO_INSTALADA,
  MOTIVO_SIN_PERMISO_AJUSTES,
} from '../../../entities/motivos'
import {
  usePanelesDeIntegraciones,
  type MotivosDeLosPaneles,
  type PanelesDeIntegraciones,
} from '../hooks/use-paneles-de-integraciones'
import {
  ModalDeApibaraDiferido,
  ModalDeSecretoDiferido,
  ModalDeWebPublicaDiferido,
} from './diferidos-de-integraciones'
import { TarjetaDeApibara } from './tarjeta-de-apibara'
import { TarjetaDeAvisosPush } from './tarjeta-de-avisos-push'
import { TarjetaDeWebPublica } from './tarjeta-de-web-publica'

type Props = {
  // La fila de apibara. Cada integración es una fila con su versión, y cada escritura (el interruptor, la configuración, la clave) usa la suya.
  apibara: Integracion
  // La fila de la web pública, si la instalación la tiene, y cuántos vehículos cambian al encenderla o apagarla (sólo para quien puede editar).
  webPublica?: Integracion | undefined
  // La fila de los avisos push, si la instalación la tiene, y si falta la clave pública (la lee el servidor de `app/`).
  pushWeb?: Integracion | undefined
  sinClavePublica: boolean
  vehiculosQueCambian: ConteoAcotado | null
  puedeEditar: boolean
}

type PropsDeModales = {
  apibara: Integracion
  webPublica?: Integracion | undefined
  paneles: PanelesDeIntegraciones
}

// Los modales, cada uno recién cuando se abre por primera vez.
function ModalesDeIntegraciones({ apibara, webPublica, paneles }: PropsDeModales) {
  return (
    <>
      {paneles.apibara.montar ? (
        <ModalDeApibaraDiferido
          abierto={paneles.apibara.abierto}
          alCerrar={paneles.cerrar}
          integracion={apibara}
        />
      ) : null}
      {paneles.claveApibara.montar ? (
        <ModalDeSecretoDiferido
          abierto={paneles.claveApibara.abierto}
          alCerrar={paneles.cerrar}
          integracion={apibara}
          clave="apibara"
        />
      ) : null}
      {webPublica && paneles.webPublica.montar ? (
        <ModalDeWebPublicaDiferido
          abierto={paneles.webPublica.abierto}
          alCerrar={paneles.cerrar}
          integracion={webPublica}
        />
      ) : null}
      {webPublica && paneles.secretoWeb.montar ? (
        <ModalDeSecretoDiferido
          abierto={paneles.secretoWeb.abierto}
          alCerrar={paneles.cerrar}
          integracion={webPublica}
          clave="web_publica"
        />
      ) : null}
    </>
  )
}

// La pantalla «Integraciones»: una tarjeta por integración con su estado. Los interruptores guardan al instante; la dirección y las
// plataformas de apibara, la clave y el secreto se editan en sus modales (`?panel=`), una escritura cada uno.
export function TarjetasDeIntegraciones({
  apibara,
  webPublica,
  pushWeb,
  sinClavePublica,
  vehiculosQueCambian,
  puedeEditar,
}: Props) {
  const motivo = puedeEditar ? null : MOTIVO_SIN_PERMISO_AJUSTES
  const sinWeb = motivo ?? MOTIVO_INTEGRACION_NO_INSTALADA
  const motivos: MotivosDeLosPaneles = {
    apibara: motivo,
    'clave-apibara': motivo,
    'web-publica': webPublica ? motivo : sinWeb,
    'secreto-web-publica': webPublica ? motivo : sinWeb,
  }
  const paneles = usePanelesDeIntegraciones(motivos)

  return (
    <>
      {puedeEditar ? null : <Aviso>{MOTIVO_SIN_PERMISO_AJUSTES}</Aviso>}
      <TarjetasDeAjustes etiqueta="Integraciones">
        <TarjetaDeApibara apibara={apibara} puedeEditar={puedeEditar} paneles={paneles} />
        {webPublica ? (
          <TarjetaDeWebPublica
            webPublica={webPublica}
            vehiculosQueCambian={vehiculosQueCambian}
            puedeEditar={puedeEditar}
            paneles={paneles}
          />
        ) : null}
        {pushWeb ? (
          <TarjetaDeAvisosPush
            pushWeb={pushWeb}
            sinClavePublica={sinClavePublica}
            puedeEditar={puedeEditar}
          />
        ) : null}
      </TarjetasDeAjustes>
      <ModalesDeIntegraciones apibara={apibara} webPublica={webPublica} paneles={paneles} />
    </>
  )
}
