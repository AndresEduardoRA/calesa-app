import type { Metadata } from 'next'
import { Suspense } from 'react'
import { leerLaTarjetaDeTrabajo } from '@/modules/cotizaciones'
import { SeccionDeLaFormula } from '@/modules/cotizaciones/pantallas/formula'
import { TarjetaEnVivoDiferida } from '@/modules/cotizaciones/pantallas/tarjeta-formula'
import { requerirSesion } from '@/modules/equipo'
import { puede } from '@/shared/lib/permisos'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { PaginaPorOrigen } from '../pagina-por-origen'

export const metadata: Metadata = { title: 'Fórmula' }

// Configuración › Cotización › un origen › Fórmula: qué se calcula. Arriba la publicada, el borrador y las versiones (`?panel=publicar-formula`,
// `revertir-formula&version=`, `descartar-borrador`); abajo la planilla de la fórmula y, con `?panel=editar-formula`, el Modo avanzado. A todo el ancho: al costado de la
// planilla van «Totales» y la tarjeta en vivo. La tarjeta de trabajo (área `plantilla`) se pide aquí como promesa, sin esperarla: la sección la espera junto a la
// fórmula, y su dibujo (área `tarjeta`) entra por el hueco `TarjetaEnVivo`.
export default async function PaginaDeLaFormula({
  params,
}: PageProps<'/configuracion/cotizacion/[origen]/formula'>) {
  const [{ origen: id }, sesion] = await Promise.all([params, requerirSesion()])
  return (
    <PaginaPorOrigen
      id={id}
      pestana="formula"
      ancho="completo"
      contenido={(origen) => (
        <Suspense key={origen.id} fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
          <SeccionDeLaFormula
            origen={origen}
            tarjeta={leerLaTarjetaDeTrabajo(origen)}
            TarjetaEnVivo={TarjetaEnVivoDiferida}
            puedeCambiarTiposDeCambio={puede(sesion.permisos, 'empresa.tipos_cambio.gestionar')}
          />
        </Suspense>
      )}
    />
  )
}
