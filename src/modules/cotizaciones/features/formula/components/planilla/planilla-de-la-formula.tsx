'use client'

import { Button } from '@/shared/ui/button'
import { EstiloDeTonos } from '@/shared/ui/xcell'
import { usePlanilla } from '../../hooks/use-planilla'
import { GuardarBorrador } from '../editor/guardar-borrador'
import { RechazoDeArriba } from '../editor/rechazo-de-arriba'
import { BarraDeFormula } from './barra-de-formula'
import { TablaDeLaPlanilla } from './tabla-de-la-planilla'
import { TarjetaDeLaUnidad } from './tarjeta-de-la-unidad'
import type { PropsDeLaPlanilla } from './tipos'
import { TotalesDeLaUnidad } from './totales-de-la-unidad'

const SIN_TONOS: never[] = []

// Arriba de la planilla: sobre qué versión se edita, «Modo avanzado», «Guardar el borrador», la frase de V1 y, si las celdas de la fórmula esperan, por qué.
function CabeceraDeLaPlanilla(
  p: PropsDeLaPlanilla & { motivo: string | null; idDelMotivo: string },
) {
  const { guardado } = p.editor
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{p.sobre}</p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={p.alAbrirAvanzado}
        >
          Modo avanzado
        </Button>
      </div>
      <GuardarBorrador
        nombreDelOrigen={p.origen.nombre}
        enCurso={guardado.enCurso}
        estado={guardado.estado}
        motivo={guardado.motivo}
        avisoDelDiseno={guardado.avisoDelDiseno}
        recargando={p.recargando}
        alGuardar={() => {
          void guardado.guardar()
        }}
        alRecargar={p.alRecargar}
      />
      <p className="text-(length:--text-sm) text-(--color-ink)">
        Las celdas que se editan están marcadas. Todo lo demás se calcula, igual que en la planilla.
      </p>
      <p
        id={p.idDelMotivo}
        className={
          p.motivo === null ? 'sr-only' : 'text-(length:--text-sm) text-(--color-ink-soft)'
        }
      >
        {p.motivo === null ? '' : `Las celdas de la fórmula esperan: ${p.motivo}`}
      </p>
    </>
  )
}

// La planilla de la fórmula (glosario: «Planilla de la fórmula»; la vista por defecto de la pestaña): la fórmula de trabajo como la planilla de V1, con filas numeradas
// en bandas (A · concepto, B · %, C · valor, D · de dónde sale), las celdas que se editan marcadas y la barra de fórmula arriba; al costado (desde `xl`; debajo en
// pantallas más chicas), «Totales» y la tarjeta en vivo con la unidad de ejemplo. Hace lo que el Modo avanzado sobre la misma fórmula de trabajo: lo aplicado en uno
// se ve en el otro. «Guardar el borrador» arriba, como en el Modo avanzado.
export function PlanillaDeLaFormula(p: PropsDeLaPlanilla) {
  const { editor } = p
  const planilla = usePlanilla(p)
  const tonos = planilla.deLasBandas.tonos
  const motivo = planilla.ctx.motivo
  return (
    <section aria-label="Planilla de la fórmula" className="grid min-w-0 gap-3">
      <EstiloDeTonos tonos={tonos.tipo === 'listo' ? tonos.tonos : SIN_TONOS} />
      <CabeceraDeLaPlanilla {...p} motivo={motivo} idDelMotivo={planilla.ctx.idDelMotivo} />
      <RechazoDeArriba rechazo={editor.rechazo} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="grid min-w-0 content-start gap-3">
          <BarraDeFormula
            {...planilla.barra}
            alAbrir={editor.abrir}
            alAplicar={editor.aplicar}
            alCancelar={editor.cancelar}
            alSumarDebajo={editor.sumarDebajo}
          />
          <TablaDeLaPlanilla
            nombreDelOrigen={p.origen.nombre}
            bandas={planilla.bandas}
            ctx={planilla.ctx}
            deLasBandas={planilla.deLasBandas}
            busqueda={planilla.busqueda}
            alBuscar={planilla.setBusqueda}
            sinCoincidencias={planilla.visibles.sinCoincidencias}
            hayMas={planilla.visibles.hayMas}
          />
        </div>
        <aside aria-label="Totales y tarjeta" className="grid min-w-0 content-start gap-4">
          <TotalesDeLaUnidad
            lectura={editor.lectura}
            vista={planilla.vista}
            lineas={planilla.lineas}
            rechazo={editor.rechazo}
            nombreDelOrigen={p.origen.nombre}
            alReintentar={editor.reintentarLaLectura}
          />
          <TarjetaDeLaUnidad
            origenId={p.origen.id}
            tarjeta={p.tarjeta}
            TarjetaEnVivo={p.TarjetaEnVivo}
            vista={planilla.vista}
            modos={planilla.modos}
            modo={p.modo}
            alElegirModo={p.alElegirModo}
            verTotalBs={planilla.verTotalBs}
          />
        </aside>
      </div>
    </section>
  )
}
