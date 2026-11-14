import 'server-only'
import { getAjustes } from '@/modules/empresa'
import { leerCampoPrincipal } from '@/modules/origenes'
import { identidadDeVehiculo, identidadEnUnaLinea } from '@/modules/vehiculos'
import type { LectorDeAtributos } from '../../entities/nucleo/repositorios'

// Los vehículos nombrados por el campo principal de su origen, «<principal> · <título>» (6.13), con el formato de la empresa. Los atributos se leen sólo si el origen tiene campo principal y
// bajo la RLS de quien mira. Si algo falla (el principal, los ajustes, una tanda de atributos) o a un vehículo no le llegan atributos, queda el título: no tumba la pantalla.
// Lo usan la lista de una fase, la bandeja del día y «dónde está»: lo compartido va al núcleo (un área no importa otra).
export async function nombrarVehiculos<T extends { id: string; titulo: string }>(
  origenId: string,
  filas: readonly T[],
  leerAtributos: LectorDeAtributos,
): Promise<Array<T & { nombre: string }>> {
  const conTitulo = (fila: T) => ({ ...fila, nombre: fila.titulo })
  if (filas.length === 0) return []
  const principal = await leerCampoPrincipal(origenId)
  if (!principal.ok || principal.data === null) return filas.map(conTitulo)
  const [atributos, ajustes] = await Promise.all([
    leerAtributos(filas.map((fila) => fila.id)),
    getAjustes(),
  ])
  if (!atributos.ok) return filas.map(conTitulo)
  const campo = principal.data
  return filas.map((fila) => {
    const deLaFila = atributos.data.get(fila.id)
    if (deLaFila === undefined) return conTitulo(fila)
    const identidad = identidadDeVehiculo({ titulo: fila.titulo, atributos: deLaFila }, campo, {
      locale: ajustes.locale,
      zona: ajustes.zonaHoraria,
    })
    return { ...fila, nombre: identidadEnUnaLinea(identidad) }
  })
}
