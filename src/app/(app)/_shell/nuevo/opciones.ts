import { puede, type Permisos } from '@/shared/lib/permisos'
import type { ClaveDeNuevo } from './catalogo'

// Lo que «Nuevo» ofrece a quien entró, calculado en el servidor con `puede()` (nunca por rol) y en el orden en que se muestra: «Lead» primero, que es donde
// abre el foco. Sólo las claves cruzan al navegador. Lo lleva `permisos` ya mirado desde la perspectiva de «Ver como»: son las opciones del rol mirado.
// - `vehiculo`: `vehiculos.crear` en algún origen; sin él, `vehiculo-al-cotizar` si puede dar de alta desde la hoja y cotizar.
// - `seguimiento` y `recordatorio`: `leads.editar` (el modal pide elegir un lead de la cartera).
// - `evento` y `tarea` van siempre: crearlos para uno mismo no pide permiso (el evento nace privado y la tarea es propia; publicar y asignar sólo amplían).
// Lo que acá se ofrece, la base lo sigue exigiendo.
export function opcionesDeNuevo(permisos: Permisos): ClaveDeNuevo[] {
  const alCotizar =
    !puede(permisos, 'vehiculos.crear') &&
    puede(permisos, 'vehiculos.crear.desde_cotizar') &&
    puede(permisos, 'cotizaciones.crear')
  const posibles: [boolean, ClaveDeNuevo][] = [
    [puede(permisos, 'leads.crear'), 'lead'],
    [puede(permisos, 'vehiculos.crear'), 'vehiculo'],
    [alCotizar, 'vehiculo-al-cotizar'],
    [puede(permisos, 'cotizaciones.crear'), 'cotizacion'],
    [puede(permisos, 'repuestos.editar'), 'proyecto'],
    [puede(permisos, 'leads.editar'), 'seguimiento'],
    [puede(permisos, 'leads.editar'), 'recordatorio'],
    [true, 'evento'],
    [true, 'tarea'],
  ]
  return posibles.flatMap(([ofrece, clave]) => (ofrece ? [clave] : []))
}
