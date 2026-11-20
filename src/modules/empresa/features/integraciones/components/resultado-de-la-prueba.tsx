import { formatearNumero } from '@/shared/lib/formato'
import type { Resultado } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { useRegional } from '@/shared/ui/regional'

export type Prueba = Resultado<{ codigo: number; conHttps: boolean }>

// Lo que respondió la dirección de la web pública a «Probar»: es la respuesta de lo que se pidió, va en la tarjeta y no en un toast.
export function ResultadoDeLaPrueba({ prueba }: { prueba: Prueba }) {
  const { locale } = useRegional()
  if (!prueba.ok) {
    return <Aviso tono="peligro">{prueba.error.mensaje}</Aviso>
  }
  const { codigo, conHttps } = prueba.data
  const respondio = `Respondió ${formatearNumero(codigo, { locale, decimales: 0 })}.`
  return (
    <Aviso tono={codigo >= 200 && codigo < 300 ? 'positivo' : 'aviso'}>
      {respondio}
      {conHttps
        ? null
        : ' Con http:// sólo se prueba: el aviso de cada minuto sale sólo a https://.'}
    </Aviso>
  )
}
