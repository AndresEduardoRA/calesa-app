'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError } from '@/shared/ui/toasts'
import type { DatosDeVitrina } from '../../../entities/vitrina'
import { datosDeLaFila, type DeLaFila } from '../../../entities/vitrina-rapida'
import { MENSAJE_DE_VALIDACION } from '../../alta/resultado'
import { publicarEnVitrina } from '../actions/publicar-en-vitrina'

// Sacar de la web desde la lista, con un toque y «Deshacer» (`vehiculo_vitrina` con la versión de la fila; la base vuelve a comprobar
// `vehiculos.vitrina` del origen). Deshacer vuelve a publicar lo que había, con la versión nueva. Publicar abre el panel completo de la vitrina.
export function useSacarDeLaWeb() {
  const publicando = useAction(publicarEnVitrina)
  const router = useRouter()

  async function mandar(vehiculo: DeLaFila, actualizadoEn: string, datos: DatosDeVitrina) {
    return enviarAccion<{ actualizadoEn: string }>(
      publicando.executeAsync({
        vehiculoId: vehiculo.id,
        actualizadoEnEsperado: actualizadoEn,
        ...datos,
      }),
      MENSAJE_DE_VALIDACION,
    )
  }

  async function sacar(vehiculo: DeLaFila): Promise<boolean> {
    const antes = datosDeLaFila(vehiculo, vehiculo.publicadoWeb)
    const envio = await mandar(vehiculo, vehiculo.actualizadoEn, datosDeLaFila(vehiculo, false))
    if (!envio.ok) {
      avisarError(envio.error)
      return false
    }
    router.refresh()
    const version = envio.data.actualizadoEn
    avisarConDeshacer(`«${vehiculo.titulo}» salió de la web.`, () => {
      void mandar(vehiculo, version, antes).then((vuelta) => {
        if (vuelta.ok) router.refresh()
        else avisarError(vuelta.error)
      })
    })
    return true
  }

  return { sacar, enCurso: publicando.isPending }
}
