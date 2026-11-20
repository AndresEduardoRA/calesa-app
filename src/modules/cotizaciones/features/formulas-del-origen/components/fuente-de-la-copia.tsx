'use client'

import { Button } from '@/shared/ui/button'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { motivoDeLaPieza } from '../../../entities/formulas-del-origen/copiar'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'
import type { useNuevaFormula } from '../hooks/use-nueva-formula'

type Formulario = ReturnType<typeof useNuevaFormula>

type Props = {
  formulario: Formulario
  // Los orígenes de los que se puede copiar (sin el abierto), si se copia de otro.
  origenes: readonly { id: string; nombre: string }[]
}

const NINGUNA = ''

function primeraOpcion(leyendo: boolean, cuantas: number) {
  if (leyendo) return 'Leyendo las fórmulas…'
  return cuantas === 0 ? 'Ese origen no tiene fórmulas' : 'Elige una fórmula'
}

function CampoDeLaFormula({ formulario: f }: { formulario: Formulario }) {
  const leyendo = f.lectura.estado === 'leyendo'
  return (
    <CampoSeleccion
      nombre="formula-copia"
      etiqueta="Fórmula"
      disabled={leyendo}
      value={f.copia?.id ?? NINGUNA}
      onChange={(e) => {
        f.elegirCopia(e.target.value === NINGUNA ? null : e.target.value)
      }}
      opciones={[
        { valor: NINGUNA, etiqueta: primeraOpcion(leyendo, f.formulas.length) },
        ...f.formulas.map((formula) => ({
          valor: formula.id,
          etiqueta: formula.archivadaEn ? `${formula.nombre} (archivada)` : formula.nombre,
        })),
      ]}
      error={f.errores['copia']}
    />
  )
}

// La versión de una fórmula de este origen: la que no existe, apagada con su motivo.
function CampoDeLaVersion({
  formulario: f,
  copia,
}: {
  formulario: Formulario
  copia: FormulaDeLaLista
}) {
  const sinPublicada = motivoDeLaPieza(copia, 'publicada')
  const sinBorrador = motivoDeLaPieza(copia, 'borrador')
  return (
    <CampoSeleccion
      nombre="formula-pieza"
      etiqueta="Versión"
      value={f.pieza ?? 'publicada'}
      onChange={(e) => {
        f.elegirPieza(e.target.value === 'borrador' ? 'borrador' : 'publicada')
      }}
      opciones={[
        { valor: 'publicada', etiqueta: 'Publicada', deshabilitada: sinPublicada !== null },
        { valor: 'borrador', etiqueta: 'Borrador', deshabilitada: sinBorrador !== null },
      ]}
      ayuda={sinPublicada ?? sinBorrador ?? undefined}
      error={f.errores['pieza']}
    />
  )
}

// Qué se copia: el origen (si es otro), la fórmula y, en una de este origen, la versión.
export function FuenteDeLaCopia({ formulario: f, origenes }: Props) {
  const sinOrigen = f.como === 'otro' && f.otroOrigenId === null
  return (
    <>
      {f.como === 'otro' ? (
        <CampoSeleccion
          nombre="formula-origen"
          etiqueta="Origen"
          value={f.otroOrigenId ?? NINGUNA}
          onChange={(e) => {
            f.elegirOtroOrigen(e.target.value === NINGUNA ? null : e.target.value)
          }}
          opciones={[
            { valor: NINGUNA, etiqueta: 'Elige un origen' },
            ...origenes.map((o) => ({ valor: o.id, etiqueta: o.nombre })),
          ]}
          error={f.errores['origen']}
        />
      ) : null}
      {f.lectura.estado === 'fallo' ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-(length:--text-sm)">
          <p className="min-w-0 text-(--color-peligro-ink)">{f.lectura.error.mensaje}</p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={f.reintentarLaLectura}
          >
            Reintentar
          </Button>
        </div>
      ) : sinOrigen ? null : (
        <CampoDeLaFormula formulario={f} />
      )}
      {f.como === 'este' && f.copia ? <CampoDeLaVersion formulario={f} copia={f.copia} /> : null}
    </>
  )
}
