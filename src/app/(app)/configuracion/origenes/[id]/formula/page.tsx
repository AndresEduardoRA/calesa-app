import type { Metadata } from 'next'
import { Suspense } from 'react'
import { leerLaTarjetaDeTrabajo } from '@/modules/cotizaciones'
import { SeccionDeLaFormula } from '@/modules/cotizaciones/pantallas/formula'
import { TarjetaEnVivoDiferida } from '@/modules/cotizaciones/pantallas/tarjeta-formula'
import { puede } from '@/shared/lib/permisos'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { abrirOrigen } from '../abrir-origen'
import { NoSeAbre } from '../no-se-abre'

export const metadata: Metadata = { title: 'Fórmula del origen' }

// Configuración › Orígenes › un origen › Fórmula › Fórmula: qué se calcula. Arriba la publicada, el borrador y las versiones (`?panel=publicar-formula`,
// `revertir-formula&version=`, `descartar-borrador`); abajo la planilla de la fórmula y, con `?panel=editar-formula`, el Modo avanzado. A todo el ancho: al
// costado de la planilla van «Totales» y la tarjeta en vivo. La tarjeta de trabajo (área `plantilla`) se pide aquí como promesa, sin esperarla: la sección
// la espera junto a la fórmula, y su dibujo (área `tarjeta`) entra por el hueco `TarjetaEnVivo`.
export default async function PaginaDeLaFormula({
  params,
}: PageProps<'/configuracion/origenes/[id]/formula'>) {
  const abierto = await abrirOrigen((await params).id, 'formula')
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  const { id, nombre, activo } = abierto.origen
  const origen = { id, nombre, activo }
  return (
    <Suspense fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
      <SeccionDeLaFormula
        origen={origen}
        tarjeta={leerLaTarjetaDeTrabajo(origen)}
        TarjetaEnVivo={TarjetaEnVivoDiferida}
        puedeCambiarTiposDeCambio={puede(abierto.sesion.permisos, 'empresa.tipos_cambio.gestionar')}
      />
    </Suspense>
  )
}
