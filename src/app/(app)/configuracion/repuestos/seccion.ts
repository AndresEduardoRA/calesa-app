import { WrenchIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion, SubseccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Repuestos en el registro (8.08-3), con sus dos sub-rutas. Se abre con `repuestos.configurar`, y con ella las dos.
// La sección no tiene índice: su ruta abre «Catálogos». El tipo se trae con `import type`: el ciclo con `secciones.ts` es sólo de tipos y se
// borra al compilar.
export const CATALOGOS_DE_REPUESTOS_EN_CONFIGURACION = {
  clave: 'catalogos',
  titulo: 'Catálogos',
  descripcion: 'Tipo de pieza, condición, vía de transporte y país de origen.',
  palabras: ['tipo de pieza', 'condición', 'vía', 'transporte', 'país'],
  ruta: RUTAS.catalogosDeRepuestos,
  permisos: ['repuestos.configurar'],
} as const satisfies SubseccionDeConfiguracion

export const COTIZADOR_DE_REPUESTOS_EN_CONFIGURACION = {
  clave: 'cotizador',
  titulo: 'Cotizador de repuestos',
  descripcion: 'La fórmula del cotizador de repuestos, sus tramos de logística y sus cajas.',
  palabras: ['fórmula', 'tramos', 'cajas', 'logística'],
  ruta: RUTAS.cotizadorDeRepuestos,
  permisos: ['repuestos.configurar'],
} as const satisfies SubseccionDeConfiguracion

export const SECCION_DE_REPUESTOS = {
  clave: 'repuestos',
  titulo: 'Repuestos',
  descripcion: 'Los catálogos de los ítems y la configuración del cotizador.',
  palabras: ['piezas', 'catálogos', 'cotizador', 'condición', 'país de origen'],
  ruta: RUTAS.configuracionDeRepuestos,
  Icono: WrenchIcon,
  permisos: ['repuestos.configurar'],
  grupo: 'operacion',
  subsecciones: [CATALOGOS_DE_REPUESTOS_EN_CONFIGURACION, COTIZADOR_DE_REPUESTOS_EN_CONFIGURACION],
} as const satisfies SeccionDeConfiguracion
