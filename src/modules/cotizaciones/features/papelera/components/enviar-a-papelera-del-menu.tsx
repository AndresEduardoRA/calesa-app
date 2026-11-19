'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RUTA_DEL_LISTADO } from '../../../entities/ruta-de-la-hoja'
import { useAporteAlMenu } from '../../hoja/components/menu-de-la-guardada'
import { enviarLaGuardadaALaPapelera } from '../hooks/envio-a-papelera'

// «Enviar a la papelera» de la guardada (4.24-3): la última línea del «⋯» de la cabecera, separada. Es reversible: sin preguntar, con «Deshacer» en el aviso (el tono
// destructivo queda para purgar). Al entrar lleva al listado: la guardada ya no existe para nadie. No mira lo tipeado sin guardar (P2 a del 4.24-3). Mientras envía, apagada.
// No dibuja nada: sólo suma su línea.
export function EnviarALaPapeleraDelMenu({
  id,
  actualizadoEn,
}: {
  id: string
  actualizadoEn: string
}) {
  const router = useRouter()
  const [enCurso, setEnCurso] = useState(false)
  async function alEnviar() {
    setEnCurso(true)
    const entro = await enviarLaGuardadaALaPapelera({ id, actualizadoEn })
    if (entro) {
      router.push(RUTA_DEL_LISTADO as Route)
    } else {
      setEnCurso(false)
    }
  }
  useAporteAlMenu({
    papelera: {
      tipo: 'accion',
      ocupada: enCurso,
      alElegir: () => {
        void alEnviar()
      },
    },
  })
  return null
}
