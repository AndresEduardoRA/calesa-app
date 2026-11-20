import type { NextRequest } from 'next/server'
import { requerirSesion } from '@/modules/equipo'
import { RUTAS } from '@/shared/lib/rutas'
import { conParametros, deLaBusqueda, redireccionPermanente } from '../con-parametros'
import { primeraSubseccionAbierta } from '../secciones'
import { SECCION_DE_CATALOGOS } from './seccion'

// Configuración › Catálogos, sin más: no tiene página propia. Un 308 al primer catálogo que la persona puede abrir, con su consulta; sin
// ninguno, al inicio de Configuración (que sólo muestra lo que abre). El destino depende de los permisos: no se guarda en el navegador.
export async function GET(peticion: NextRequest) {
  const { permisos } = await requerirSesion()
  const destino =
    primeraSubseccionAbierta(SECCION_DE_CATALOGOS, permisos) ?? RUTAS.inicioDeConfiguracion
  return redireccionPermanente(
    conParametros(destino, deLaBusqueda(peticion.nextUrl.searchParams)),
    {
      porPersona: true,
    },
  )
}
