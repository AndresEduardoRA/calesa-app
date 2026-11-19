// Composición del área `listado` de `cotizaciones` en el servidor (4.15-4): las lecturas del listado, que sólo usa esta área. Sale por
// la `composicion.ts` de la raíz, que sólo la reexporta.
import 'server-only'
import { getAutoresDeCotizaciones } from '../../infra/listado/autores-del-listado'
import { getListadoDeCotizaciones } from '../../infra/listado/listado'
import { getListadoPorVehiculo } from '../../infra/listado/listado-por-vehiculo'
import { getModosDeCotizaciones } from '../../infra/listado/modos-del-listado'
import { getUnaDelListado } from '../../infra/listado/una-del-listado'

export const leerListadoDeCotizaciones = getListadoDeCotizaciones
// Quién hizo cada cotización de una página del listado (4.16-4a): los nombres por clave primaria de `perfiles`.
export const leerAutoresDeCotizaciones = getAutoresDeCotizaciones
// Una cotización del listado por su id, para el resumen `?cotizacion=` cuando no está en la página (4.16-4b).
export const leerUnaDelListado = getUnaDelListado
// La lista agrupada por vehículo (T319): una página de grupos y sueltas por cursor, y el nombre del modo de las cotizaciones de una página.
export const leerListadoPorVehiculo = getListadoPorVehiculo
export const leerModosDeCotizaciones = getModosDeCotizaciones
