'use client'

import { Button } from '@/shared/ui/button'
import type { EleccionDePlantillaDeV1 } from '../../hooks/use-eleccion-de-plantilla-de-v1'

const ID_DEL_MOTIVO = 'motivo-de-la-plantilla-de-v1'

function etiquetaDelPrimario(e: EleccionDePlantillaDeV1): string {
  if (e.enviando) return 'Creando los borradores…'
  return e.paso === 'confirmar' && e.pregunta !== null ? 'Reemplazar' : 'Usar esta plantilla'
}

// El pie del modal: «Cancelar» (o «Volver» en el paso de confirmar, que no escribe nada) y el primario, apagado sin elegir, mientras crea o si los colores de la
// elegida no caben (con ese motivo a la vista).
export function PieDeLasPlantillas({
  eleccion: e,
  alCerrar,
}: {
  eleccion: EleccionDePlantillaDeV1
  alCerrar: () => void
}) {
  return (
    <>
      {e.motivo === null ? null : (
        <p
          id={ID_DEL_MOTIVO}
          className="w-full text-(length:--text-sm) text-(--color-aviso-ink) sm:mr-auto sm:w-auto sm:flex-1"
        >
          {e.motivo}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={e.enviando}
        onClick={e.paso === 'confirmar' ? e.volver : alCerrar}
      >
        {e.paso === 'confirmar' ? 'Volver' : 'Cancelar'}
      </Button>
      <Button
        type="button"
        disabled={e.plantilla === null || e.motivo !== null || e.enviando}
        aria-describedby={e.motivo === null ? undefined : ID_DEL_MOTIVO}
        onClick={e.usar}
      >
        {etiquetaDelPrimario(e)}
      </Button>
    </>
  )
}
