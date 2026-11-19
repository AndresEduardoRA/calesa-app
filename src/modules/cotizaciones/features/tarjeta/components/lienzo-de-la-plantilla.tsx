'use client'

import { useMemo, type CSSProperties } from 'react'
import { COLOR_TINTA } from '@/shared/config/app'
import { useRegional } from '@/shared/ui/regional'
import { calculoDeLaReferencia } from '../../../entities/referencia-de-la-tarjeta'
import { FONDO_AUTOMATICO } from '../../../entities/tarjeta/estilo-de-la-celda'
import { geometriaDeLaTarjeta } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import { paraEditar } from '../../../entities/tarjeta/geometria-para-editar'
import { lecturaDesdeLaPlana } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import {
  calculoDeEjemplo,
  CONTEXTO_DE_EJEMPLO,
} from '../../../entities/tarjeta/vista-previa-de-ejemplo'
import type {
  MargenDelLienzo,
  PropsDelLienzoDeLaPlantilla,
} from '../../../entities/vista-previa-de-la-plantilla'
import { useEscalaDeLaTarjeta } from '../hooks/use-escala-de-la-tarjeta'
import { CeldaDeLaTarjeta } from './celda-de-la-tarjeta'

const SIN_MARGEN: MargenDelLienzo = { arriba: 0, izquierda: 0 }

// El lienzo del editor de la plantilla (el hueco de `entities/vista-previa-de-la-plantilla.ts`): la cuadrícula de trabajo dibujada con **el mismo modelo de dibujo**
// que el PDF, la imagen y la vista previa de cotizar (`geometriaDeLaTarjeta()` y `<CeldaDeLaTarjeta>`), con lo guardado de la cotización de referencia o con las
// cifras de ejemplo. «Ajustar» achica la tarjeta para caber en su marco (nunca agranda; el margen de la capa no cuenta); «100 %» la deja a escala 1 y el marco se
// desplaza de costado. Encima, sin escalar, la capa del editor (cabeceras, asas y la grilla accesible): por eso la tarjeta dibujada va `aria-hidden` cuando hay
// capa. Sin capa es la tarjeta en sólo lectura. Debajo, fuera del marco que se desplaza, lo que el editor ponga (las filas ocultas con esta referencia). No lee ni
// escribe.
export function LienzoDeLaPlantilla({
  lectura,
  referencia,
  escala: modo,
  margen = SIN_MARGEN,
  capa,
  debajo,
}: PropsDelLienzoDeLaPlantilla) {
  const { locale } = useRegional()
  const leida = referencia?.estado === 'cotizacion' ? referencia : null
  const { geometria, logo } = useMemo(() => {
    const tarjeta = lecturaDesdeLaPlana(lectura)
    const contexto = leida === null ? CONTEXTO_DE_EJEMPLO : leida.contexto
    return {
      geometria: geometriaDeLaTarjeta({
        lectura: tarjeta,
        calculo: leida === null ? calculoDeEjemplo(tarjeta) : calculoDeLaReferencia(leida),
        contexto,
        monedaBs: leida === null ? null : leida.monedaBs,
        locale,
      }),
      logo: contexto.logo,
    }
  }, [lectura, leida, locale])
  const para = useMemo(() => paraEditar(geometria), [geometria])
  const { ref, escala: ajustada } = useEscalaDeLaTarjeta(geometria.ancho, margen.izquierda)
  const escala = modo === 'real' ? 1 : ajustada
  const lienzo = {
    width: geometria.ancho,
    height: geometria.alto,
    transform: escala === 1 ? undefined : `scale(${String(escala)})`,
    background: FONDO_AUTOMATICO,
    '--color-ink': COLOR_TINTA,
  } as CSSProperties
  return (
    <div className="grid min-w-0 gap-3">
      <div ref={ref} data-lienzo-marco="" className="w-full min-w-0 overflow-x-auto">
        <div
          className="relative"
          style={{
            width: margen.izquierda + geometria.ancho * escala,
            height: margen.arriba + geometria.alto * escala,
          }}
        >
          <div
            role="group"
            aria-label="Tarjeta de la cotización"
            data-tarjeta-de-cotizacion=""
            {...(geometria.porOmision ? { 'data-por-omision': '' } : {})}
            aria-hidden={capa === undefined ? undefined : true}
            className="absolute overflow-hidden"
            style={{
              left: margen.izquierda,
              top: margen.arriba,
              width: geometria.ancho * escala,
              height: geometria.alto * escala,
            }}
          >
            <div className="relative origin-top-left" style={lienzo}>
              {geometria.celdas.map((c) => (
                <CeldaDeLaTarjeta key={c.id} celda={c} logo={logo} />
              ))}
            </div>
          </div>
          {capa === undefined ? null : <div className="absolute inset-0">{capa(para, escala)}</div>}
        </div>
      </div>
      {debajo?.(para)}
    </div>
  )
}
