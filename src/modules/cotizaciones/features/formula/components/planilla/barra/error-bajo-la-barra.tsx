'use client'

import { Button } from '@/shared/ui/button'
import type { ErrorDeLaCelda } from '../../../../../entities/formula/escrito-en-la-celda'
import type { Nodo } from '../../../../../entities/nodos'
import { ValorDeConstante } from '../comunes/valor-de-constante'

type Props = {
  id: string
  error: ErrorDeLaCelda
  nodos: ReadonlyMap<string, Nodo>
  alMover: () => void
  alPisar: () => void
}

const BOTON = 'min-h-[44px] md:pointer-fine:min-h-8'

// El error de lo tipeado bajo la barra de fórmula (D6, D11), con su salida: «Mover esta fila debajo de la N» (una referencia hacia abajo) o «Pisar el valor» (lo
// que se pisaría, con lo guardado y lo nuevo). Lo tipeado queda como estaba.
export function ErrorBajoLaBarra({ id, error, nodos, alMover, alPisar }: Props) {
  return (
    <div id={id} role="alert" className="grid min-w-0 gap-1.5 text-(--color-peligro-ink)">
      <p className="break-words">{error.mensaje}</p>
      {error.pisa === null ? null : (
        <ul className="grid gap-0.5 text-(--color-ink)">
          {error.pisa.map((p) => (
            <li key={p.id} className="break-words">
              {p.nombre}: <ValorDeConstante valor={p.guardado} formato={nodos.get(p.id)?.formato} />
              {p.nuevo === null ? null : (
                <>
                  {' → '}
                  <ValorDeConstante valor={p.nuevo} formato={nodos.get(p.id)?.formato} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {error.moverDebajoDe === null ? null : (
          <Button type="button" className={BOTON} onClick={alMover}>
            Mover esta fila debajo de la {error.moverDebajoDe}
          </Button>
        )}
        {error.pisa === null ? null : (
          <Button type="button" className={BOTON} onClick={alPisar}>
            Pisar el valor
          </Button>
        )}
      </div>
    </div>
  )
}
