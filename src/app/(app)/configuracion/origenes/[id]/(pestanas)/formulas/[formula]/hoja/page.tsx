import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDelDiseno } from '@/modules/cotizaciones/pantallas/diseno'
import { CONSULTA_DE_LA_EDICION, enLaEdicion } from '@/shared/lib/edicion'
import { redirigir } from '@/shared/lib/navegacion'
import { rutaDeLaFormula } from '@/shared/lib/rutas'
import { EntrarALaEdicion } from '@/shared/ui/edicion-a-pantalla-completa'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { NoSeAbre } from '../../../../no-se-abre'
import { abrirFormula } from '../abrir-formula'
import { EdicionDeLaFormula } from '../edicion-de-la-formula'

export const metadata: Metadata = { title: 'Hoja de la fórmula' }

// Configuración › Orígenes › un origen › Fórmulas › una fórmula › Hoja: cómo se ve y se llena la cotización (el diseño de la hoja). Con `?vista=412|1280|200`, la
// vista previa en vivo; desde `xl`, al costado.
export default async function PaginaDeLaHoja({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]/formulas/[formula]/hoja'>) {
  const [pedida, parametros] = await Promise.all([params, searchParams])
  const enModo = enLaEdicion(parametros)
  const contenido = (
    <div
      className={enModo ? 'mx-auto grid max-w-7xl min-w-0 gap-4' : 'grid max-w-6xl min-w-0 gap-4'}
    >
      <Suspense fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
        <Hoja origenId={pedida.id} formulaId={pedida.formula} enModo={enModo} />
      </Suspense>
    </div>
  )
  return enModo ? (
    <EdicionDeLaFormula origenId={pedida.id} formulaId={pedida.formula} parte="hoja" titulo="Hoja">
      {contenido}
    </EdicionDeLaFormula>
  ) : (
    contenido
  )
}

async function Hoja({
  origenId,
  formulaId,
  enModo,
}: {
  origenId: string
  formulaId: string
  enModo: boolean
}) {
  const abierto = await abrirFormula(origenId, formulaId)
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  if (abierto.archivada) {
    return enModo ? redirigir(rutaDeLaFormula(origenId, formulaId, 'hoja')) : null
  }
  const { id, nombre, activo } = abierto.origen
  return (
    <>
      {enModo ? null : (
        <div className="flex justify-end">
          <EntrarALaEdicion
            href={rutaDeLaFormula(id, formulaId, 'hoja', CONSULTA_DE_LA_EDICION)}
            nombre="la hoja"
          />
        </div>
      )}
      <SeccionDelDiseno origen={{ id, nombre, activo }} formula={abierto.formula} />
    </>
  )
}
