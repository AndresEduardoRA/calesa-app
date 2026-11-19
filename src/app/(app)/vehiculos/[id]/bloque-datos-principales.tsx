import { connection } from 'next/server'
import { leerDatosClave, type LayoutDeOrigen, type OrigenResumen } from '@/modules/origenes'
import type { Vehiculo } from '@/modules/vehiculos'
import { DatosPrincipalesDelVehiculo } from '@/modules/vehiculos/pantallas/ficha'
import { datosO } from '@/shared/lib/errores'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  layout: LayoutDeOrigen
}

// Lo de adentro de «Datos principales»: los datos clave del origen (`leerDatosClave`, por PK y con `cache()`), leídos tras su `<Suspense>`. Un fallo
// cae en el límite del bloque. Al navegador viajan sólo los campos del layout que son datos clave (≤ 4), no el layout entero.
export async function BloqueDatosPrincipales({ vehiculo, origen, layout }: Props) {
  await connection()
  const datosClave = datosO(await leerDatosClave(origen.id))
  const idsDeCampos = new Set(
    datosClave.flatMap((dato) => (dato.de === 'campo' ? [dato.campoId] : [])),
  )
  return (
    <DatosPrincipalesDelVehiculo
      vehiculo={vehiculo}
      origen={origen}
      categorias={layout.categorias}
      datosClave={datosClave}
      camposClave={layout.campos.filter((campo) => idsDeCampos.has(campo.id))}
    />
  )
}
