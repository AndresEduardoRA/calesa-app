import { connection } from 'next/server'
import { puede, requerirSesion } from '@/modules/equipo'
import { leerResumenDeVehiculo } from '@/modules/repuestos'
import { ResumenRepuestos } from '@/modules/repuestos/pantallas/proyectos-vehiculo'
import { datosO } from '@/shared/lib/errores'

// El bloque «Repuestos» (8.09-4): el proyecto de repuestos del vehículo y sus ítems por fase (proyecto + 201), tras su `<Suspense>`. Un error de lectura queda en el límite del bloque
// («No pudimos cargar «Repuestos».» con «Reintentar»). «Crear proyecto de repuestos» sólo se ofrece con `repuestos.editar`.
export async function BloqueRepuestos({ vehiculoId }: { vehiculoId: string }) {
  await connection()
  const sesion = await requerirSesion()
  const lectura = datosO(await leerResumenDeVehiculo(vehiculoId))
  return (
    <ResumenRepuestos
      key={vehiculoId}
      vehiculoId={vehiculoId}
      lectura={lectura}
      puedeCrear={puede(sesion.permisos, 'repuestos.editar')}
    />
  )
}
