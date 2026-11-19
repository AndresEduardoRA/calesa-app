import { puedeEnviarLaCotizacion } from '../../../entities/papelera/acceso'
import type { PropsDeUnHuecoDeLaGuardada } from '../../hoja/components/huecos'
import { EnviarALaPapeleraDelMenu } from './enviar-a-papelera-del-menu'

// «Enviar a la papelera» en el «⋯» de la cabecera de la guardada (4.24-3). Quién lo ve se decide aquí, en el servidor (la página dibuja los huecos): al navegador llega sólo
// la línea con el id y la versión, sin los permisos ni `permisos.ts` (el JS en frío de `/cotizaciones/[id]` está al tope, `e2e/presupuesto-js.spec.ts`).
export function EnviarLaGuardadaALaPapelera({
  cotizacion,
  puedeGuardar,
  permisos,
}: PropsDeUnHuecoDeLaGuardada) {
  if (!puedeEnviarLaCotizacion(cotizacion, puedeGuardar, permisos)) {
    return null
  }
  return <EnviarALaPapeleraDelMenu id={cotizacion.id} actualizadoEn={cotizacion.actualizadoEn} />
}
