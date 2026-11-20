import { leerMatriz } from '@/modules/equipo'
import { QuienCreaYQuienVe } from '@/modules/equipo/pantallas/quien-crea-y-quien-ve'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'

type Props = { misPermisos: Permisos; puedeGestionar: boolean }

// Los roles con sus concesiones y los orígenes, como los lee la matriz de Roles: también los orígenes desactivados (lo que se les otorgó sigue valiendo y
// no se esconde). Si la lectura falla, `datosO` lanza y la pantalla de error ofrece «Reintentar».
export async function SeccionQuienCreaYQuienVe({ misPermisos, puedeGestionar }: Props) {
  const [matriz, origenes] = await Promise.all([leerMatriz(), getOrigenes(true)])
  return (
    <QuienCreaYQuienVe
      roles={datosO(matriz).roles}
      origenes={datosO(origenes).map(({ id, nombre, activo }) => ({
        id,
        nombre: activo ? nombre : `${nombre} (inactivo)`,
      }))}
      misPermisos={misPermisos}
      puedeGestionar={puedeGestionar}
    />
  )
}
