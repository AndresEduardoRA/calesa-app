import type { SubseccionDeConfiguracion } from '../../secciones'
import { RUTAS } from '@/shared/lib/rutas'

// La sub-sección que el área de comprobantes suma a Configuración › Empresa. Pide `empresa.ajustes.gestionar`, la clave que ya abre
// Empresa: nadie nuevo entra a Empresa, y quien sólo emite comprobantes o sólo gestiona tipos de cambio la ve apagada con su motivo
// (y su URL lo lleva a la primera sub-sección que puede abrir). El tipo se trae con `import type`: el ciclo con `secciones.ts` se borra
// al compilar.
export const SUBSECCION_DE_COMPROBANTES = {
  clave: 'comprobantes',
  titulo: 'Comprobantes',
  descripcion: 'La serie de los comprobantes y el número del próximo.',
  palabras: ['recibo', 'factura', 'serie', 'número', 'correlativo'],
  ruta: RUTAS.comprobantesDeEmpresa,
  permisos: ['empresa.ajustes.gestionar'],
  motivoSinPermiso: 'Pide el permiso «Ajustes de la empresa».',
} as const satisfies SubseccionDeConfiguracion
