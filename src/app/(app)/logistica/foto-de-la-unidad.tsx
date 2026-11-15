import { leerVehiculo } from '@/modules/vehiculos'
import { FotosEnElLugar } from '@/modules/vehiculos/pantallas/unidad-de-logistica'
import { datosO } from '@/shared/lib/errores'

// La portada de la cabecera de la unidad: una fila por su PK, tras su `Suspense` (la cabecera no espera por ella). Si no se lee, la cabecera sigue sin foto. Del mismo tamaño que su esqueleto (4:3, 7 rem).
export async function FotoDeLaUnidad({ id }: { id: string }) {
  const vehiculo = datosO(await leerVehiculo(id))
  if (!vehiculo) return null
  return (
    <FotosEnElLugar
      vehiculo={{ id: vehiculo.id, titulo: vehiculo.titulo, portadaRuta: vehiculo.portadaRuta }}
      className="w-28 shrink-0"
    />
  )
}
