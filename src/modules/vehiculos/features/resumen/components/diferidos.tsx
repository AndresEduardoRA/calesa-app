'use client'

import { diferido } from '@/shared/ui/diferido'

// El resumen entero llega recién al abrirse: el inventario no carga su drawer ni sus lecturas para mostrar sus filas. Sin
// red, el aviso va en una barra fija (un panel no tiene lugar propio hasta que abre).
export const ResumenDeVehiculoDiferido = diferido(() =>
  import('./resumen-de-vehiculo').then((modulo) => modulo.ResumenDeVehiculo),
)
