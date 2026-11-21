'use client'

import { MENSAJE_SIN_CONEXION } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Confirmar } from '@/shared/ui/confirmar'
import type { useConfirmarEnLaFormula } from '../hooks/use-confirmar-en-la-formula'

type Props = {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  descripcion: string
  etiqueta: string
  estado: ReturnType<typeof useConfirmarEnLaFormula>
}

// El `<Confirmar>` de archivar o eliminar una fórmula del origen, con el conflicto y la falta de conexión adentro.
export function ConfirmarEnLaFormula({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  etiqueta,
  estado,
}: Props) {
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={estado.confirmar}
      titulo={titulo}
      descripcion={descripcion}
      etiquetaConfirmar={etiqueta}
      enCurso={estado.enCurso}
      deshabilitado={estado.conflicto !== null}
    >
      {estado.conflicto ? (
        <AvisoDeConflicto
          mensaje={estado.conflicto}
          enCurso={estado.recargando}
          alRecargar={estado.recargar}
        />
      ) : null}
      {estado.sinRed ? (
        <Aviso tono="aviso">
          <p>{MENSAJE_SIN_CONEXION}</p>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
