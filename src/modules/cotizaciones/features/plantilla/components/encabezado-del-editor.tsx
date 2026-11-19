import type { ReactNode } from 'react'
import { formatearFechaHora } from '@/shared/lib/fechas'
import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'

type Props = Pick<PropsDelEditor, 'origen' | 'de' | 'esperada' | 'publicada'> & {
  // Los botones de las versiones, a la derecha.
  acciones: ReactNode
}

function DeDondeNace({ de, esperada, publicada }: Pick<Props, 'de' | 'esperada' | 'publicada'>) {
  if (de === 'borrador' && esperada !== null)
    return <>Sobre el borrador guardado el {formatearFechaHora(esperada)}.</>
  if (de === 'publicada')
    return <>Sin borrador: parte de la versión {publicada?.version} publicada.</>
  return <>Sin borrador ni publicada: parte de la de por omisión.</>
}

// «Tarjeta de <Origen>», de dónde nace lo que se edita y, si hay, la publicada con su nota; a la derecha, los botones de las versiones.
export function EncabezadoDelEditor({ origen, de, esperada, publicada, acciones }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid min-w-0 gap-0.5">
        <h3 className="font-semibold text-(--color-ink)">Tarjeta de {origen.nombre}</h3>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          <DeDondeNace de={de} esperada={esperada} publicada={publicada} />
          {publicada === null ? null : (
            <>
              {' '}
              Publicada: versión {publicada.version}
              {publicada.publicadoEn ? `, ${formatearFechaHora(publicada.publicadoEn)}` : ''}.
              {publicada.nota ? ` ${publicada.nota}` : ''}
            </>
          )}
        </p>
      </div>
      {acciones}
    </div>
  )
}
