'use client'

import { Button } from '@/shared/ui/button'
import { TITULO_DE_BLOQUE } from '@/shared/ui/ficha-en-bloques/estilos'
import { TEXTO_DE_ERROR, type PresentacionDeRelacionados } from '../../../entities/relacionados'

type Props = {
  alReintentar: () => void
  // En una línea no hay encabezado: la misma frase y su botón. Compacta, bajo el título «Relacionados».
  presentacion: PresentacionDeRelacionados
  // El título propio del bloque (la ficha del lead: «Vehículos»): el `h2` que enfoca el índice y la frase «No pudimos cargar «<título>».».
  titulo?: string
}

function Reintentar({ alReintentar }: { alReintentar: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11 md:min-h-8"
      onClick={alReintentar}
    >
      Reintentar
    </Button>
  )
}

// Un error de lectura deja el bloque en error con «Reintentar» y la pantalla sigue: es un bloque de arriba, no tumba la ficha.
export function ErrorDeRelacionados({ alReintentar, presentacion, titulo }: Props) {
  if (titulo !== undefined) {
    return (
      <section aria-labelledby="relacionados-titulo" className="grid min-w-0 gap-2">
        <h2 id="relacionados-titulo" tabIndex={-1} className={TITULO_DE_BLOQUE}>
          {titulo}
        </h2>
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink)">
            No pudimos cargar «{titulo}».
          </p>
          <Reintentar alReintentar={alReintentar} />
        </div>
      </section>
    )
  }
  return (
    <section aria-label="Relacionados" className="grid min-w-0 gap-2">
      {presentacion === 'linea' ? null : (
        <h2 className="text-(length:--text-sm) font-medium text-(--color-ink)">Relacionados</h2>
      )}
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink)">{TEXTO_DE_ERROR}</p>
        <Reintentar alReintentar={alReintentar} />
      </div>
    </section>
  )
}
