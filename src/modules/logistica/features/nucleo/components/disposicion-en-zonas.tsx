'use client'

import type { ZonasDeLaUnidad } from '../../../entities/nucleo/zonas'
import { ProveedorDeZonas } from '../disposicion'
import type { SeccionDeLaUnidad } from './contenido-del-hueco'
import { EnvoltorioDelHueco } from './envoltorio-del-hueco'
import { ZonaDePestanas } from './zona-de-pestanas'

// Las zonas de la unidad en escritorio: a la izquierda «Qué falta» (con su destino y el formulario de mover) y, debajo, las pestañas (Documentos, Transporte, Repuestos, Aduana, Dinero); a la derecha, notas e
// historial. Desde 56 rem del contenedor (`@container/unidad`, de la página) ocupan el alto que fija `src/app`, cada zona con su desplazamiento; por debajo, una columna con alto natural. Una zona sin huecos no se
// dibuja y la grilla se reacomoda.
export function DisposicionEnZonas({ zonas }: { zonas: ZonasDeLaUnidad<SeccionDeLaUnidad> }) {
  const hayLateral = zonas.lateral.length > 0
  const hayPestanas = zonas.pestanas.length > 0
  const queFalta = zonas.principal[0]
  return (
    <ProveedorDeZonas value>
      <div
        className={`grid min-h-0 gap-3 @min-[56rem]/unidad:h-full @min-[56rem]/unidad:grid-rows-[minmax(0,1fr)] ${
          hayLateral
            ? '@min-[56rem]/unidad:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]'
            : '@min-[56rem]/unidad:grid-cols-[minmax(0,1fr)]'
        }`}
      >
        <div
          className={`grid min-h-0 content-start gap-3 ${
            queFalta && hayPestanas
              ? '@min-[56rem]/unidad:grid-rows-[fit-content(55%)_minmax(12rem,1fr)]'
              : '@min-[56rem]/unidad:grid-rows-[minmax(0,1fr)]'
          }`}
        >
          {queFalta ? (
            <section
              data-zona="principal"
              aria-labelledby="titulo-de-la-zona-principal"
              tabIndex={-1}
              className="min-h-0 overflow-y-auto rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3 outline-none focus-visible:shadow-(--shadow-focus)"
            >
              {/* El título es visual, no un encabezado: adentro, cada destino es un `h3`. */}
              <p
                id="titulo-de-la-zona-principal"
                className="mb-2 text-(length:--text-sm) font-medium text-(--color-ink-soft)"
              >
                {queFalta.titulo}
              </p>
              <EnvoltorioDelHueco
                clave={queFalta.clave}
                pestana={null}
                visible
                montado
                elegirPestana={() => undefined}
              >
                {queFalta.contenido}
              </EnvoltorioDelHueco>
            </section>
          ) : null}
          {hayPestanas ? (
            <div className="min-h-0 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3">
              <ZonaDePestanas etiqueta="Secciones de la unidad" pestanas={zonas.pestanas} />
            </div>
          ) : null}
        </div>
        {hayLateral ? (
          <div className="min-h-0 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3">
            <ZonaDePestanas etiqueta="Notas e historial" pestanas={zonas.lateral} respiroAbajo />
          </div>
        ) : null}
      </div>
    </ProveedorDeZonas>
  )
}
