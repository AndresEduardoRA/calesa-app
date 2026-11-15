'use client'

import { useState } from 'react'
import { PestanasDelResumen } from '@/shared/ui/lista/pestanas-del-resumen'
import type { PestanaDeLaUnidad } from '../../../entities/nucleo/zonas'
import { usePestanaDeLaZona } from '../hooks/use-pestana-de-la-zona'
import type { SeccionDeLaUnidad } from './contenido-del-hueco'
import { EnvoltorioDelHueco } from './envoltorio-del-hueco'

type Props = {
  // El nombre de la lista de pestañas: «Secciones de la unidad», «Notas e historial».
  etiqueta: string
  pestanas: readonly PestanaDeLaUnidad<SeccionDeLaUnidad>[]
  // La zona lateral deja un respiro abajo para que la burbuja del chat no tape «Ver más» ni el campo de la nota.
  respiroAbajo?: boolean
}

// Una zona de pestañas de la unidad (escritorio): las pestañas arriba y, debajo, un marco por pestaña con su propio desplazamiento. Sólo se ve el de la elegida; su contenido se monta la primera vez que
// se elige y queda montado. La pestaña elegida vive en `?hueco=` (`usePestanaDeLaZona`).
export function ZonaDePestanas({ etiqueta, pestanas, respiroAbajo = false }: Props) {
  const { activa, elegir } = usePestanaDeLaZona(pestanas)
  const [montadas, setMontadas] = useState<ReadonlySet<string>>(() => new Set([activa]))
  if (!montadas.has(activa)) {
    setMontadas(new Set([...montadas, activa]))
  }
  return (
    <PestanasDelResumen
      etiqueta={etiqueta}
      pestanas={pestanas.map(({ clave, titulo }) => ({ clave, titulo }))}
      activa={activa}
      alElegir={elegir}
      alto="lleno"
    >
      {pestanas.map((pestana) => {
        const visible = pestana.clave === activa
        return (
          <div
            key={pestana.clave}
            role="region"
            aria-label={pestana.titulo}
            tabIndex={0}
            hidden={!visible}
            data-zona-de-pestana={pestana.clave}
            className={`h-full min-h-0 overflow-y-auto rounded-(--radius-md) outline-none focus-visible:shadow-(--shadow-focus) ${
              respiroAbajo ? 'pb-16' : ''
            }`}
          >
            <div className="grid gap-4">
              {pestana.huecos.map((seccion) => (
                <EnvoltorioDelHueco
                  key={seccion.clave}
                  clave={seccion.clave}
                  pestana={pestana.clave}
                  visible={visible}
                  montado={montadas.has(pestana.clave) || visible}
                  elegirPestana={() => {
                    elegir(pestana.clave)
                  }}
                >
                  {seccion.contenido}
                </EnvoltorioDelHueco>
              ))}
            </div>
          </div>
        )
      })}
    </PestanasDelResumen>
  )
}
