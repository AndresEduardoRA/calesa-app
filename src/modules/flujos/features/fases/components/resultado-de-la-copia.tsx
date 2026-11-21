'use client'

import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { textoDeLoSaltado, type RespuestaDeCopiarFases } from '../../../entities/fases/copiar-fases'

// Copiado, con lo que no se copió tal cual: una línea por cosa y, si la base cortó la lista, «Y más…».
export function ResultadoDeLaCopia({
  abierto,
  alCerrar,
  titulo,
  resultado,
}: {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  resultado: RespuestaDeCopiarFases
}) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={titulo}
      pie={<Button onClick={alCerrar}>Listo</Button>}
    >
      <div className="grid min-w-0 gap-2">
        <p className="text-(length:--text-sm) font-medium text-(--color-ink)">
          Listo. Esto no se copió:
        </p>
        <ul className="grid min-w-0 list-disc gap-1 pl-5 text-(length:--text-sm) text-(--color-ink)">
          {resultado.saltado.map((s, i) => (
            <li key={`${String(i)}-${s.motivo}`} className="min-w-0 break-words">
              {textoDeLoSaltado(s)}
            </li>
          ))}
          {resultado.saltadoHayMas ? <li>Y más…</li> : null}
        </ul>
      </div>
    </Modal>
  )
}
