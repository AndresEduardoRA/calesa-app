'use client'

import { useEffect, useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { EstadoError } from '@/shared/ui/estados'
import { leerChoques } from '../../../composicion.client'
import type { PaginaDeChoques } from '../../../entities/ajustes-de-leads'
import { ChoquesDeTelefonos } from './choques-de-telefonos'

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  | { tipo: 'listo'; primera: PaginaDeChoques }

// Lo de adentro del modal de «Números repetidos»: lee la primera página al abrirse (cargando, error con «Reintentar», o la lista). Se monta con el
// modal abierto y se desmonta al cerrarse: cada apertura lee de nuevo.
export function CuerpoDeNumerosRepetidos() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    void leerChoques(null).then((lectura) => {
      if (vigente) {
        setEstado(
          lectura.ok
            ? { tipo: 'listo', primera: lectura.data }
            : { tipo: 'error', error: lectura.error },
        )
      }
    })
    return () => {
      vigente = false
    }
  }, [intento])

  if (estado.tipo === 'cargando') {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
        Buscando números repetidos…
      </p>
    )
  }
  if (estado.tipo === 'error') {
    return (
      <EstadoError
        compacto
        descripcion={estado.error.mensaje}
        alReintentar={() => {
          setEstado({ tipo: 'cargando' })
          setIntento((n) => n + 1)
        }}
      />
    )
  }
  return <ChoquesDeTelefonos primera={estado.primera} />
}
