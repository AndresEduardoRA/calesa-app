import type { ErrorApp } from '@/shared/lib/errores'
import { avisarError } from '@/shared/ui/toasts'
export { comoResultado } from './como-resultado'

export const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

// Lo que un formulario hace con un rechazo: un conflicto (`PT409`) ofrece «Recargar», un motivo por campo va junto a su campo y lo demás, un aviso.
export function rechazarEnvio(
  error: ErrorApp,
  porCampo: Record<string, string> | undefined,
  alConflicto: (mensaje: string) => void,
  alCampos: (porCampo: Record<string, string>) => void,
): void {
  if (error.codigo === 'conflicto') {
    alConflicto(error.mensaje)
  } else if (porCampo) {
    alCampos(porCampo)
  } else {
    avisarError(error)
  }
}
