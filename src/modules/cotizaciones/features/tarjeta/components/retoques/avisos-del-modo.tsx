'use client'

import { useRouter } from 'next/navigation'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { textoDelAvisoDeNoAplican } from '../../../../entities/tarjeta/retoques/modo-de-la-tarjeta'
import type { ModoRetocar } from '../../hooks/use-modo-retocar'

const BOTON = 'mt-2 min-h-11 md:min-h-7'

// El fallo que no va junto a una celda o una fila: el PT409 con quién y cuándo, lo que ya no se puede retocar, lo que no se pudo guardar o una regla sin lugar.
function FalloDelModo({ modo, recargar }: { modo: ModoRetocar; recargar: () => void }) {
  const { fallo } = modo
  if (fallo === null || (fallo.tipo === 'regla' && fallo.donde !== null)) return null
  if (fallo.tipo === 'conflicto') {
    return (
      <AvisoDeConflicto
        mensaje={fallo.mensaje}
        alRecargar={recargar}
        enCurso={modo.enCurso}
        detalle="Recargar trae la versión nueva y descarta tus retoques sin guardar."
      />
    )
  }
  return (
    <Aviso tono="peligro">
      <p>{fallo.mensaje}</p>
      {fallo.tipo === 'sin_permiso' ? (
        <Button
          variant="outline"
          size="sm"
          className={BOTON}
          disabled={modo.enCurso}
          onClick={recargar}
        >
          Recargar
        </Button>
      ) : null}
      {fallo.tipo === 'sin_guardar' ? (
        <Button
          variant="outline"
          size="sm"
          className={BOTON}
          disabled={modo.enCurso}
          onClick={modo.reintentar}
        >
          Reintentar
        </Button>
      ) : null}
    </Aviso>
  )
}

// Lo que el modo dice arriba de la tarjeta: cómo se usa, los retoques guardados que ya no aplican (se quitarán al guardar) y el fallo del último envío.
export function AvisosDelModo({ modo }: { modo: ModoRetocar }) {
  const router = useRouter()
  const noAplican = textoDelAvisoDeNoAplican(modo.noAplican)
  const recargar = () => {
    modo.recargando()
    router.refresh()
  }
  return (
    <div className="grid gap-2">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Toca un texto para cambiarlo; con el ojo de cada fila, ocúltala.
      </p>
      {noAplican === null ? null : (
        <Aviso tono="aviso">
          <p data-retoques-no-aplican="">{noAplican}</p>
        </Aviso>
      )}
      <FalloDelModo modo={modo} recargar={recargar} />
    </div>
  )
}
