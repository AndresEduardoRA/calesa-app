'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { HojaDeUnaGuardada } from '../../../entities/hoja-de-una-guardada'
import { MOTIVO_PRIVADA_SIN_GUARDAR, ofertaDePrivada } from '../../../entities/privada'
import { useAporteAlMenu } from '../../hoja/components/menu-de-la-guardada/use-aporte-al-menu'
import { useAprobadaAnotada } from '../hooks/aprobada-anotada'
import { cambiarLaPrivada } from '../hooks/cambiar-la-privada'

type Props = {
  hoja: Pick<HojaDeUnaGuardada, 'cotizacion'>
  // Quien mira de verdad (con «Ver como», la persona real: la base decide por ella).
  personaId: string
  // Lo tipeado y sin guardar, o un guardado pendiente: cambiar la marca mueve la versión y la hoja se vuelve a leer, así que espera.
  hayCambios: boolean
}

// «Hacer privada» / «Hacer pública» del «⋯» de la guardada (glosario: «Cotización privada»): sólo para quien la creó (`ofertaDePrivada()`). Si es la aprobada lo sabe por
// lo que anota el área `aprobada` (`useAprobadaAnotada()`); sin anotación, lo dice la base al intentarlo. Entró: vuelve a leer la página, que trae la versión nueva. No
// dibuja nada.
export function PrivadaDelMenu({ hoja, personaId, hayCambios }: Props) {
  const router = useRouter()
  const [enCurso, setEnCurso] = useState(false)
  const c = hoja.cotizacion
  const aprobada = useAprobadaAnotada(c.id)
  const oferta =
    c.creadoPor === undefined
      ? null
      : ofertaDePrivada({
          creadoPor: c.creadoPor,
          usuarioId: personaId,
          clase: c.clase,
          aprobada,
          privada: c.privada === true,
        })
  async function alElegir() {
    setEnCurso(true)
    const quedo = await cambiarLaPrivada({
      id: c.id,
      numero: c.numero,
      privada: c.privada !== true,
      actualizadoEn: c.actualizadoEn,
    })
    if (quedo !== null) {
      router.refresh()
    }
    setEnCurso(false)
  }
  useAporteAlMenu(
    oferta === null
      ? null
      : {
          [oferta.clave]: {
            tipo: 'accion',
            motivo: oferta.motivo ?? (hayCambios ? MOTIVO_PRIVADA_SIN_GUARDAR : null),
            ocupada: enCurso,
            alElegir: () => {
              void alElegir()
            },
          },
        },
  )
  return null
}
