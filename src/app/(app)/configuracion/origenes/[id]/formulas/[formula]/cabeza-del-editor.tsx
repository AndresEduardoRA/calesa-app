import type { Route } from 'next'
import Link from 'next/link'
import { CLAVE_DE_LA_COPIA, PANEL_NUEVA_FORMULA } from '@/modules/cotizaciones'
import { CabezaDeLaFormulaDelOrigen } from '@/modules/cotizaciones/pantallas/formulas-del-origen-cabeza'
import { EmpezarDesdeUnaPlantilla } from '@/modules/cotizaciones/pantallas/plantilla-de-v1'
import { LienzoDeLaPlantillaDiferido } from '@/modules/cotizaciones/pantallas/tarjeta-plantilla'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { rutaDeLaFormula, rutaDeLasFormulas } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { buttonVariants } from '@/shared/ui/button'
import { SUBPESTANAS_DE_LA_FORMULA } from '../../../pestanas'
import { PestanasDeLaRuta } from '../../pestanas-de-la-ruta'
import { abrirFormula } from './abrir-formula'

export const AVISO_DE_LA_ARCHIVADA = 'Esta fórmula está archivada: cópiala para seguir editándola.'

// La cabeza del editor de una fórmula: la de la fórmula (del área `formulas-del-origen`) y debajo las sub-pestañas Planilla · Hoja · Tarjeta con «Empezar desde una
// plantilla» a la derecha (del área `plantilla`: un área no importa otra, las une `src/app`). Una archivada no se edita: en lugar de las sub-pestañas, su aviso con
// «Copiar» y «Volver a Fórmulas». A quien no abre la pestaña, nada: la página le dice por qué.
export async function CabezaDelEditor({
  origenId,
  formulaId,
}: {
  origenId: string
  formulaId: string
}) {
  const abierto = await abrirFormula(origenId, formulaId)
  if (abierto.tipo !== 'abierto') {
    return null
  }
  const { origen, abierta, formula } = abierto
  const delOrigen = { id: origen.id, nombre: origen.nombre }
  return (
    <div className="grid min-w-0 gap-3">
      <CabezaDeLaFormulaDelOrigen
        origen={delOrigen}
        formula={abierta.formula}
        activa={abierta.activa}
      />
      {abierto.archivada ? (
        <Aviso tono="aviso">
          <p>{AVISO_DE_LA_ARCHIVADA}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={rutaDeLasFormulas(origen.id, {
                [CLAVE_DE_PANEL]: PANEL_NUEVA_FORMULA,
                [CLAVE_DE_LA_COPIA]: formula.id,
              })}
              className={buttonVariants({ size: 'sm' })}
            >
              Copiar
            </Link>
            <Link
              href={rutaDeLasFormulas(origen.id) as Route}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Volver a Fórmulas
            </Link>
          </div>
        </Aviso>
      ) : (
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <PestanasDeLaRuta
              sinSegmento="planilla"
              pestanas={SUBPESTANAS_DE_LA_FORMULA.map(({ clave, titulo }) => ({
                clave,
                titulo,
                ruta: rutaDeLaFormula(origen.id, formula.id, clave),
              }))}
            />
          </div>
          <EmpezarDesdeUnaPlantilla
            origen={delOrigen}
            formula={{ id: formula.id, nombre: formula.nombre }}
            Lienzo={LienzoDeLaPlantillaDiferido}
          />
        </div>
      )}
    </div>
  )
}
