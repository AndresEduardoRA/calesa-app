'use client'

import { CheckIcon, CopyIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { avisar } from '@/shared/ui/toasts'
import type { AvisoDelTotal } from '../../../entities/tarjeta/aviso-del-total'
import type { Geometria } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { textoDeLaTarjeta } from '../../../entities/tarjeta/texto-de-la-tarjeta'

type Props = {
  geometria: Geometria | null
  lectura: LecturaDeLaTarjeta | null
  aviso: AvisoDelTotal
  // El id del «Total desactualizado.» que el cuerpo del modal dibuja: lo nombra el botón apagado.
  idDelDesactualizado: string
}

// «Copiar texto» (4.18-3b, C2 y C3): copia la tarjeta que dibuja el modal como texto (de su misma geometría), con cifras aunque Live esté encendido (P7 del 4.18-3). Apagado sin tarjeta (cargando,
// error, sin permiso), con el total desactualizado o sin total (P2): nunca le manda al cliente un total que no es el de la hoja.
export function CopiarTextoDeLaTarjeta({ geometria, lectura, aviso, idDelDesactualizado }: Props) {
  const [copiado, setCopiado] = useState(false)
  const idSinTotal = useId()
  const modelo = geometria === null || lectura === null ? null : { geometria, lectura }
  const apagado = modelo === null || aviso !== null
  async function copiar() {
    if (modelo === null) {
      return
    }
    try {
      await navigator.clipboard.writeText(textoDeLaTarjeta(modelo.geometria, modelo.lectura))
      setCopiado(true)
    } catch {
      avisar('No se pudo copiar el texto: tu navegador no lo permite.')
    }
  }
  // Sin tarjeta no hay aviso dibujado: el «Total desactualizado.» y el «Falta el total…» viven con ella, y nombrarlos dejaría la referencia colgando.
  const describe =
    modelo === null
      ? undefined
      : aviso === 'desactualizado'
        ? idDelDesactualizado
        : aviso === 'sin_total'
          ? idSinTotal
          : undefined
  return (
    <>
      {modelo !== null && aviso === 'sin_total' ? (
        <p id={idSinTotal} className="self-center text-(length:--text-sm) text-(--color-ink-soft)">
          Falta el total para copiarlo.
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={apagado}
        aria-describedby={describe}
        onClick={() => void copiar()}
        onBlur={() => {
          setCopiado(false)
        }}
      >
        {copiado ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        <span aria-live="polite">{copiado ? 'Copiado' : 'Copiar texto'}</span>
      </Button>
    </>
  )
}
