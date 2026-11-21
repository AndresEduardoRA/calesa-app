'use client'

import type { ComponentType } from 'react'
import { Modal } from '@/shared/ui/modal'
import type { PropsDelLienzoDeLaPlantilla } from '../../../../entities/vista-previa-de-la-plantilla'
import { useEleccionDePlantillaDeV1 } from '../../hooks/use-eleccion-de-plantilla-de-v1'
import { CuerpoDeLasPlantillas } from './cuerpo-de-las-plantillas'
import { PieDeLasPlantillas } from './pie-de-las-plantillas'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origen: { id: string; nombre: string }
  // La fórmula del origen que se edita: recibe los borradores.
  formula: { id: string; nombre: string }
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
}

// «Empezar desde una plantilla» (`?panel=plantillas-de-v1`): elegir una de las cuatro plantillas de V1 y, si el origen ya tiene borradores o le falta algo, confirmarlo;
// después crea los borradores de la fórmula y de la tarjeta (no publica) y lleva a la Fórmula del origen. Lo que se dibuja se pide al abrirse; cada apertura empieza de
// cero (quien lo monta le da una `key` por apertura). No guarda nada tipeado: cerrarlo no pregunta. docs/UX.md › «Cotización: empezar desde una plantilla».
export function ModalDePlantillasDeV1({ abierto, alCerrar, origen, formula, Lienzo }: Props) {
  const eleccion = useEleccionDePlantillaDeV1(origen, formula)
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Empezar desde una plantilla"
      descripcion={`Crea los borradores de la fórmula y de la tarjeta de «${formula.nombre}» como en V1. No publica nada.`}
      ancho="grande"
      bloqueado={eleccion.enviando}
      pie={
        eleccion.lectura.estado === 'lista' ? (
          <PieDeLasPlantillas eleccion={eleccion} alCerrar={alCerrar} />
        ) : undefined
      }
    >
      <CuerpoDeLasPlantillas eleccion={eleccion} Lienzo={Lienzo} />
    </Modal>
  )
}
