'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { useRegional } from '@/shared/ui/regional'
import { avisarError } from '@/shared/ui/toasts'
import { CLAVE_DE_ZONA_HORARIA } from '../../../entities/preferencias'
import { guardarPreferencia } from '../actions/guardar-preferencia'

const DE_LA_EMPRESA = ''
const sinSuscripcion = () => () => undefined

// «Zona horaria» en el modal «Preferencias» de `/perfil`: en qué zona ve las fechas de subasta (corren en la hora del patio). Sin elegir, la de la empresa. La lista de zonas
// la da el navegador y se arma recién al montar: así no viaja en el documento de `/perfil`.
export function CampoDeZonaHoraria({ elegida }: { elegida: string | null }) {
  const { zonaHoraria } = useRegional()
  const [valor, setValor] = useState(elegida ?? DE_LA_EMPRESA)
  const { executeAsync, isPending } = useAction(guardarPreferencia)
  const router = useRouter()
  const montado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  )
  const zonas = montado
    ? Intl.supportedValuesOf('timeZone')
    : valor === DE_LA_EMPRESA
      ? []
      : [valor]
  const opciones = [
    { valor: DE_LA_EMPRESA, etiqueta: `La de la empresa (${zonaHoraria})` },
    ...zonas.map((zona) => ({ valor: zona, etiqueta: zona.replaceAll('_', ' ') })),
  ]

  async function cambiar(nuevo: string) {
    const anterior = valor
    setValor(nuevo)
    const envio = await enviarAccion(
      executeAsync({ clave: CLAVE_DE_ZONA_HORARIA, valor: nuevo === DE_LA_EMPRESA ? null : nuevo }),
      'No se pudo guardar tu preferencia.',
    )
    if (envio.ok) {
      router.refresh()
    } else {
      setValor(anterior)
      avisarError(envio.error)
    }
  }

  return (
    <CampoSeleccion
      nombre="zona-horaria"
      etiqueta="Zona horaria de las subastas"
      ayuda="Sus fechas se ven en esta zona, con su abreviatura."
      opciones={opciones}
      value={valor}
      disabled={isPending}
      onChange={(evento) => void cambiar(evento.target.value)}
    />
  )
}
