import 'server-only'
import { leerIntegraciones } from '@/modules/empresa'
import { leerOrigenes, pasosDe } from '@/modules/origenes'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { puedeAbrirOrigenes } from './origenes/acceso'
import { DESTINOS_DE_PASO, conDestino } from './origenes/pasos'
import { faltasPorSeccion, type FaltasPorSeccion } from './que-falta'

// Lo que falta para el inicio de Configuración, con las lecturas que ya existen (sin RPC nueva). Nunca lanza: si algo falla, no falta
// nada y cada tarjeta queda con su frase.
// - Los orígenes salen de `origenes_resumen()`, que exige poder abrir Orígenes (si no, `42501`): sin eso no se lee.
// - apibara se lee sólo si hay una subasta activa y la persona podría activarla. Si la lectura falla, cuenta como activa: decir que
//   falta algo que quizás está hecho sería inventarlo (`integracionActiva()` diría apagada).
export async function leerFaltas(permisos: Permisos): Promise<FaltasPorSeccion> {
  if (!puedeAbrirOrigenes(permisos)) {
    return {}
  }
  try {
    const origenes = await leerOrigenes()
    if (!origenes.ok) {
      return {}
    }
    const activos = origenes.data.filter((origen) => origen.activo)
    let apibaraActiva = true
    if (
      activos.some((origen) => origen.tipo === 'subasta') &&
      puede(permisos, DESTINOS_DE_PASO.apibara.permiso)
    ) {
      const integraciones = await leerIntegraciones()
      apibaraActiva =
        !integraciones.ok || integraciones.data.some((una) => una.clave === 'apibara' && una.activa)
    }
    return faltasPorSeccion(
      activos.map((origen) => ({
        origen,
        pasos: conDestino(pasosDe(origen, { apibaraActiva }), permisos, origen.id),
      })),
    )
  } catch (error) {
    console.error('No se pudo leer lo que falta en Configuración', error)
    return {}
  }
}
