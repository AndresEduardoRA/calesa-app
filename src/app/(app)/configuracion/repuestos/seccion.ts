import { WrenchIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion, SubseccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Repuestos en el registro (8.08-3), con sus tres sub-rutas: el flujo de repuestos, el cotizador y los catálogos. Se
// abre con `repuestos.configurar`, y con ella las tres. La sección no tiene índice: su ruta abre el flujo. El tipo se trae con `import type`: el
// ciclo con `secciones.ts` es sólo de tipos y se borra al compilar.
export const FLUJO_DE_REPUESTOS_EN_CONFIGURACION = {
  clave: 'flujo',
  titulo: 'Flujo de repuestos',
  descripcion: 'Las fases por las que avanza un ítem, quién las mueve y qué piden para entrar.',
  palabras: ['fases', 'reglas', 'requisitos', 'tipos de documento', 'mover'],
  ruta: RUTAS.flujoDeRepuestos,
  permisos: ['repuestos.configurar'],
} as const satisfies SubseccionDeConfiguracion

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
  descripcion: 'El flujo de los ítems, la configuración del cotizador y los catálogos.',
  palabras: ['piezas', 'flujo', 'fases', 'catálogos', 'cotizador', 'condición', 'país de origen'],
  ruta: RUTAS.configuracionDeRepuestos,
  Icono: WrenchIcon,
  permisos: ['repuestos.configurar'],
  grupo: 'operacion',
  subsecciones: [
    FLUJO_DE_REPUESTOS_EN_CONFIGURACION,
    COTIZADOR_DE_REPUESTOS_EN_CONFIGURACION,
    CATALOGOS_DE_REPUESTOS_EN_CONFIGURACION,
  ],
} as const satisfies SeccionDeConfiguracion
