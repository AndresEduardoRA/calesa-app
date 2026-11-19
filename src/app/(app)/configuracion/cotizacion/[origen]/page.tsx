import type { Metadata } from 'next'
import { redirigir } from '@/shared/lib/navegacion'
import { rutaDeConfiguracionDeCotizacion } from '@/shared/lib/rutas'
import { consultaDe } from '../url-vieja'

export const metadata: Metadata = { title: 'Cotización' }

// `/configuracion/cotizacion/<origen>` sola abre «Fórmula» de ese origen, con lo que traiga. La página de la fórmula comprueba el permiso y el
// origen (uno ajeno o que no es un uuid va al primero que configura).
export default async function PaginaDelOrigenDeCotizacion({
  params,
  searchParams,
}: PageProps<'/configuracion/cotizacion/[origen]'>) {
  const [{ origen }, parametros] = await Promise.all([params, searchParams])
  redirigir(rutaDeConfiguracionDeCotizacion(origen, 'formula', consultaDe(parametros)))
}
