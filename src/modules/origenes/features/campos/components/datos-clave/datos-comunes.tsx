'use client'

import type { DatoComun } from '../../../../entities/datos-clave'
import { EstrellaDeDatoClave } from './estrella-de-dato-clave'

type Props = {
  comunes: readonly DatoComun[]
  // Si cada uno es dato clave ahora, y si su estrella está apagada (con el motivo visible del bloque de arriba).
  marcado: (clave: DatoComun['clave']) => boolean
  apagada: (clave: DatoComun['clave']) => boolean
  idDelMotivo: string | undefined
  alAlternar: (clave: DatoComun['clave']) => void
}

// «Datos comunes»: los de todo vehículo del origen (columnas, no campos del layout), cada uno con su estrella para hacerlo dato clave.
export function DatosComunes({ comunes, marcado, apagada, idDelMotivo, alAlternar }: Props) {
  return (
    <section aria-labelledby="datos-comunes-titulo" className="grid gap-2">
      <h2
        id="datos-comunes-titulo"
        className="text-(length:--text-lg) font-medium text-(--color-ink)"
      >
        Datos comunes
      </h2>
      <ul className="grid grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) @min-[36rem]/configuracion:grid-cols-2 @min-[36rem]/configuracion:divide-y-0">
        {comunes.map((dato) => (
          <li key={dato.clave} className="flex min-w-0 items-center gap-2 px-3 py-1">
            <EstrellaDeDatoClave
              etiqueta={dato.etiqueta}
              marcado={marcado(dato.clave)}
              apagada={apagada(dato.clave)}
              idDelMotivo={idDelMotivo}
              alAlternar={() => {
                alAlternar(dato.clave)
              }}
            />
            <span className="min-w-0 truncate text-(length:--text-sm) text-(--color-ink)">
              {dato.etiqueta}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
