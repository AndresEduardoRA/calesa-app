import { puedeAbrirLaPapeleraDeCotizaciones } from '../../../entities/papelera/acceso'
import type { HuecosDelListado } from '../../hoja/components/huecos'
import { EnlaceAPapeleraDeCotizaciones } from './enlace-a-papelera'

// Lo que el área `papelera` llena en el listado `/cotizaciones`: el enlace a la papelera en el grupo «Más» de «Vista y opciones» (`Junto`, 4.24-2),
// sólo para quien puede abrirla.
export const HUECOS_DE_PAPELERA_EN_EL_LISTADO: HuecosDelListado = {
  Junto: EnlaceAPapeleraDeCotizaciones,
  hayJunto: puedeAbrirLaPapeleraDeCotizaciones,
}
