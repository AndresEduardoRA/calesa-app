'use client'

import { valorMostrado } from '@/shared/lib/campos'
import { ValorMostrado } from '@/shared/ui/campos'
import { useRegional } from '@/shared/ui/regional'
import type { CampoDeLead } from '../../../entities/campo'
import {
  necesitaElPaisDelTelefono,
  paisDeLosDatos,
  type DatoDelCampo,
} from '../../../entities/datos-clave-del-lead'
import { resolverTelefono, textoDelPais } from '../../../entities/pais-del-telefono'
import { usePaises } from '../../telefono/hooks/use-paises'
import { SoloLaCartera } from './solo-la-cartera'

type Props = {
  // El campo «País» del layout para quien mira (`datoDelCampo()`).
  dato: DatoDelCampo<CampoDeLead>
  // El teléfono principal como lo entregó la base (enmascarado fuera de la cartera).
  numero: string
}

// El país de los datos clave: el del campo «País» si dice algo; si no, el del teléfono principal (la tabla de países se pide sólo entonces,
// después de hidratar: hasta que llega se ve «—», igual que el número se ve sin país); si tampoco, «—». Un «País» privado no se adivina por
// el teléfono.
export function PaisDelLead({ dato, numero }: Props) {
  const { locale, zonaHoraria } = useRegional()
  const tabla = usePaises(necesitaElPaisDelTelefono(dato, numero))
  let paisDelTelefono: string | null = null
  if (tabla !== null && necesitaElPaisDelTelefono(dato, numero)) {
    const resuelto = resolverTelefono(tabla, {
      numero,
      internacional: true,
      empresa: { telefonoCc: null, pais: null },
    })
    paisDelTelefono = resuelto.pais.tipo === 'desconocido' ? null : textoDelPais(resuelto.pais)
  }
  const pais = paisDeLosDatos({ dato, paisDelTelefono })
  switch (pais.tipo) {
    case 'campo':
      return (
        <ValorMostrado
          valor={valorMostrado(pais.campo, pais.valor, { locale, zona: zonaHoraria })}
        />
      )
    case 'privado':
      return <SoloLaCartera />
    case 'telefono':
      return <>{pais.pais}</>
    case 'nada':
      return <span className="text-(--color-ink-faint)">—</span>
  }
}
