'use client'

import { useMemo, type CSSProperties } from 'react'
import { COLOR_TINTA } from '@/shared/config/app'
import { useRegional } from '@/shared/ui/regional'
import type { PropsDeLaTarjetaEnVivo } from '../../../../entities/tarjeta-en-vivo'
import { FONDO_AUTOMATICO } from '../../../../entities/tarjeta/estilo-de-la-celda'
import { geometriaDeLaTarjeta } from '../../../../entities/tarjeta/geometria-de-la-tarjeta'
import { lecturaDesdeLaPlana } from '../../../../entities/tarjeta/lectura-de-la-tarjeta'
import { CONTEXTO_DE_EJEMPLO } from '../../../../entities/tarjeta/vista-previa-de-ejemplo'
import { useEscalaDeLaTarjeta } from '../../hooks/use-escala-de-la-tarjeta'
import { CeldaDeLaTarjeta } from '../celda-de-la-tarjeta'

// La tarjeta en vivo de la planilla de la fórmula (el hueco de `entities/tarjeta-en-vivo.ts`): la plantilla de trabajo del origen dibujada con **el mismo modelo de
// dibujo** que el PDF, la imagen y la vista previa de cotizar (`geometriaDeLaTarjeta()` y `<CeldaDeLaTarjeta>`), con las cifras de la unidad de ejemplo y los textos
// de ejemplo de la cotización (sin logo). Se achica para caber en su columna y nunca agranda. No lee ni escribe: cada cambio de la unidad o del modo la redibuja.
export function TarjetaEnVivo({ lectura, calculo, monedaBs }: PropsDeLaTarjetaEnVivo) {
  const { locale } = useRegional()
  const geometria = useMemo(
    () =>
      geometriaDeLaTarjeta({
        lectura: lecturaDesdeLaPlana(lectura),
        calculo,
        contexto: CONTEXTO_DE_EJEMPLO,
        monedaBs,
        locale,
      }),
    [lectura, calculo, monedaBs, locale],
  )
  const { ref, escala } = useEscalaDeLaTarjeta(geometria.ancho)
  const lienzo = {
    width: geometria.ancho,
    height: geometria.alto,
    transform: escala === 1 ? undefined : `scale(${String(escala)})`,
    background: FONDO_AUTOMATICO,
    '--color-ink': COLOR_TINTA,
  } as CSSProperties
  return (
    <div ref={ref} className="w-full min-w-0">
      <div
        role="group"
        aria-label="Tarjeta de la cotización"
        data-tarjeta-de-cotizacion=""
        {...(geometria.porOmision ? { 'data-por-omision': '' } : {})}
        className="relative overflow-hidden"
        style={{ width: geometria.ancho * escala, height: geometria.alto * escala }}
      >
        <div className="relative origin-top-left" style={lienzo}>
          {geometria.celdas.map((c) => (
            <CeldaDeLaTarjeta key={c.id} celda={c} logo={CONTEXTO_DE_EJEMPLO.logo} />
          ))}
        </div>
      </div>
    </div>
  )
}
