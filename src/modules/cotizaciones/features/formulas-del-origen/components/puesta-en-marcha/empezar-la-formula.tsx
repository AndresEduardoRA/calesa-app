'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_DEL_COMO,
  COMO_DESDE_LA_URL,
  PANEL_NUEVA_FORMULA,
} from '../../../../entities/formulas-del-origen/rutas'
import { ModalDeNuevaFormulaDiferido } from './diferidos'

type Props = {
  origen: { id: string; nombre: string }
  // Los orígenes de los que la persona puede copiar (sin éste); sin ninguno, no se ofrece copiar.
  origenesParaCopiar: readonly { id: string; nombre: string }[]
}

export const SIN_FORMULA = 'Este origen todavía no tiene fórmula.'

const CLAVES = { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DEL_COMO]: parseAsString }

function comoDeLaUrl(valor: string | null) {
  return COMO_DESDE_LA_URL.find((como) => como === valor) ?? null
}

// El paso «Fórmula» de la puesta en marcha mientras el origen no tiene ninguna: «Empezar en blanco» (la acción principal) o «Copiar la de otro origen».
// Cada una abre «Nueva fórmula» por su URL (`?panel=nueva-formula&como=blanco|otro`) con el nombre del origen propuesto. Al crearla se queda en el paso:
// cierra el panel y vuelve a leer la pantalla en una sola navegación (`shallow: false`), que ahora dibuja la planilla.
export function EmpezarLaFormula({ origen, origenesParaCopiar }: Props) {
  const nueva = usePanelPorUrl(PANEL_NUEVA_FORMULA, [CLAVE_DEL_COMO])
  const apertura = useApertura(nueva.abierto)
  const montada = useAbiertoAlgunaVez(nueva.abierto)
  const [, escribir] = useQueryStates(CLAVES)
  return (
    <div className="grid min-w-0 gap-3">
      <p className="text-(length:--text-sm) text-(--color-ink)">{SIN_FORMULA}</p>
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <Button
          type="button"
          className="min-h-11 md:min-h-9"
          onClick={() => {
            nueva.abrir({ [CLAVE_DEL_COMO]: 'blanco' })
          }}
        >
          Empezar en blanco
        </Button>
        {origenesParaCopiar.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={() => {
              nueva.abrir({ [CLAVE_DEL_COMO]: 'otro' })
            }}
          >
            Copiar la de otro origen
          </Button>
        ) : null}
      </div>
      {montada ? (
        <ModalDeNuevaFormulaDiferido
          key={apertura}
          abierto={nueva.abierto}
          alCerrar={nueva.cerrar}
          origen={origen}
          origenesParaCopiar={origenesParaCopiar}
          copiaInicial={null}
          comoInicial={comoDeLaUrl(nueva.valor(CLAVE_DEL_COMO))}
          nombreInicial={origen.nombre}
          sinCopiaDeEste
          alCrear={() => {
            void escribir(
              { [CLAVE_DE_PANEL]: null, [CLAVE_DEL_COMO]: null },
              { shallow: false, scroll: false },
            )
          }}
        />
      ) : null}
    </div>
  )
}
