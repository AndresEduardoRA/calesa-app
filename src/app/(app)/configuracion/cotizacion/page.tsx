import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { redirigir } from '@/shared/lib/navegacion'
import { EsqueletoTabla } from '@/shared/ui/esqueletos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../_navegacion/encabezado-de-configuracion'
import { accesoDeCotizacion, puedeVerNiveles } from './acceso'
import { SECCION_DE_COTIZACION } from './seccion'
import { TarjetasDelInicio } from './tarjetas-del-inicio'
import { busquedaDe, destinoDeLaUrlVieja } from './url-vieja'

export const metadata: Metadata = { title: 'Configurar cotizaciones' }

// Configuración › Cotización: una tarjeta por origen que la persona configura (`cotizaciones.configurar`) y una «General». Entra quien
// configura algún origen o ve los roles (los niveles); sin ninguna, «No tienes permiso» (y la sección no figura en Configuración). Los enlaces
// de antes (`?seccion=…&origen=…`, `?panel=…`) van a su sub-ruta (`url-vieja.ts`).
export default async function PaginaDeCotizacion({
  searchParams,
}: PageProps<'/configuracion/cotizacion'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const configura = puede(sesion.permisos, 'cotizaciones.configurar')
  if (!configura && !puedeVerNiveles(sesion.permisos)) {
    return <EstadoSinPermiso />
  }
  const busqueda = busquedaDe(parametros)
  if (busqueda.size > 0) {
    const catalogo = configura ? datosO(await getOrigenes(true)) : []
    const destino = destinoDeLaUrlVieja(busqueda, accesoDeCotizacion(sesion.permisos, catalogo))
    if (destino !== null) {
      redirigir(destino)
    }
  }
  return (
    <div className="grid max-w-4xl gap-4">
      <EncabezadoDeConfiguracion
        titulo={SECCION_DE_COTIZACION.titulo}
        descripcion={SECCION_DE_COTIZACION.descripcion}
      />
      <Suspense fallback={<EsqueletoTabla filas={4} columnas={2} />}>
        <TarjetasDelInicio permisos={sesion.permisos} />
      </Suspense>
    </div>
  )
}
