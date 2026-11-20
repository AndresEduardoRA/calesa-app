import type { Metadata } from 'next'
import { Suspense } from 'react'
import { leerLaTarjetaDeLaFormula } from '@/modules/cotizaciones'
import { SeccionDeLaFormula } from '@/modules/cotizaciones/pantallas/formula'
import { TarjetaEnVivoDiferida } from '@/modules/cotizaciones/pantallas/tarjeta-formula'
import { puede } from '@/shared/lib/permisos'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { NoSeAbre } from '../../../no-se-abre'
import { abrirFormula } from '../abrir-formula'

export const metadata: Metadata = { title: 'Planilla de la fórmula' }

// Configuración › Orígenes › un origen › Fórmulas › una fórmula › Planilla: qué se calcula. Arriba la publicada, el borrador y las versiones
// (`?panel=publicar-formula`, `revertir-formula&version=`, `descartar-borrador`); abajo la planilla y, con `?panel=editar-formula`, el Modo avanzado; con
// `?fila=<id>`, esa fila marcada. A todo el ancho: al costado de la planilla van «Totales» y la tarjeta en vivo. La tarjeta de la fórmula (área `plantilla`) se
// pide aquí como promesa, sin esperarla: la sección la espera junto a la fórmula, y su dibujo (área `tarjeta`) entra por el hueco `TarjetaEnVivo`.
export default async function PaginaDeLaPlanilla({
  params,
}: PageProps<'/configuracion/origenes/[id]/formulas/[formula]/planilla'>) {
  const pedida = await params
  return (
    <Suspense fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
      <Planilla origenId={pedida.id} formulaId={pedida.formula} />
    </Suspense>
  )
}

async function Planilla({ origenId, formulaId }: { origenId: string; formulaId: string }) {
  const abierto = await abrirFormula(origenId, formulaId)
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  if (abierto.archivada) {
    return null
  }
  const { id, nombre, activo } = abierto.origen
  const origen = { id, nombre, activo }
  return (
    <SeccionDeLaFormula
      origen={origen}
      formula={abierto.formula}
      tarjeta={leerLaTarjetaDeLaFormula(origen, abierto.formula.id)}
      TarjetaEnVivo={TarjetaEnVivoDiferida}
      puedeCambiarTiposDeCambio={puede(abierto.sesion.permisos, 'empresa.tipos_cambio.gestionar')}
    />
  )
}
