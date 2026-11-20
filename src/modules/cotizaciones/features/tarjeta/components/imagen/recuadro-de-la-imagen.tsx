'use client'

import { Button } from '@/shared/ui/button'
import { Monto } from '@/shared/ui/monto'

type Props = {
  total: { valor: number; moneda?: string | null } | null
  // Falló la imagen (o no hay red): se dice y se ofrece pedirla de nuevo.
  fallo: boolean
  alReintentar: () => void
  // Lo que dice si falla (por defecto, el de la imagen de la tarjeta).
  textoDelFallo?: string
  // La miniatura de una cabecera: sin respiro, con letra chica y, si falla, todo el recuadro es «Reintentar» (un botón no cabe en un marco de ~60 px).
  miniatura?: boolean
}

// Lo que ocupa el lugar de la imagen de la tarjeta mientras se arma o carga, o si falla: el total (con `<Monto>`, que respeta el Modo Live) y el estado. Va en el flujo del marco:
// con el texto al 200 % lo hace crecer en vez de salirse.
export function RecuadroDeLaImagen({
  total,
  fallo,
  alReintentar,
  textoDelFallo = 'No se pudo armar la imagen.',
  miniatura = false,
}: Props) {
  if (miniatura) {
    return <RecuadroDeMiniatura total={total} fallo={fallo} alReintentar={alReintentar} />
  }
  return (
    <div className="relative z-10 grid content-center justify-items-center gap-2 bg-(--color-paper-dim) p-4 text-center [overflow-wrap:anywhere]">
      {total === null ? null : (
        <p className="text-(length:--text-lg) font-medium">
          <Monto
            valor={total.valor}
            {...(total.moneda === undefined ? {} : { moneda: total.moneda })}
          />
        </p>
      )}
      {fallo ? (
        <>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{textoDelFallo}</p>
          <Button type="button" variant="outline" className="h-11 md:h-8" onClick={alReintentar}>
            Reintentar
          </Button>
        </>
      ) : (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          Preparando la imagen…
        </p>
      )}
    </div>
  )
}

function RecuadroDeMiniatura({ total, fallo, alReintentar }: Omit<Props, 'miniatura'>) {
  const contenido = (
    <>
      {total === null ? null : (
        <span className="text-(length:--text-sm) font-medium">
          <Monto
            valor={total.valor}
            {...(total.moneda === undefined ? {} : { moneda: total.moneda })}
          />
        </span>
      )}
      <span className="text-(length:--text-xs) text-(--color-ink-soft)">
        {fallo ? 'Reintentar' : 'Preparando…'}
      </span>
    </>
  )
  const clases =
    'relative z-10 grid content-center justify-items-center gap-0.5 bg-(--color-paper-dim) p-1 text-center [overflow-wrap:anywhere]'
  return fallo ? (
    <button
      type="button"
      onClick={alReintentar}
      aria-label="No se pudo armar la imagen. Reintentar"
      className={`${clases} outline-none focus-visible:shadow-(--shadow-focus)`}
    >
      {contenido}
    </button>
  ) : (
    <div role="status" className={clases}>
      {contenido}
    </div>
  )
}
