import type { NextRequest } from 'next/server'
import { requerirSesion } from '@/modules/equipo'
import { RUTAS } from '@/shared/lib/rutas'
import { CATALOGOS_DE_LOGISTICA } from '../catalogos/catalogos-de-logistica'
import { SECCION_DE_CATALOGOS } from '../catalogos/seccion'
import { deLaBusqueda, redireccionPermanente } from '../con-parametros'
import { conSubseccionesVisibles, primeraSubseccionAbierta } from '../secciones'
import { destinoDeLaUrlVieja } from './url-vieja'

// `/configuracion/logistica` ya no tiene página: un 308 al catálogo de logística de `?seccion=` (o al primero que la persona abre) en
// Catálogos, con sus `?panel=` (`url-vieja.ts`). Sin ninguno de logística, el primer catálogo que abre; sin ninguno, el inicio de
// Configuración. El destino depende de los permisos: no se guarda en el navegador.
export async function GET(peticion: NextRequest) {
  const { permisos } = await requerirSesion()
  const deLogistica = new Set(CATALOGOS_DE_LOGISTICA.map((catalogo) => catalogo.clave))
  const abiertos = conSubseccionesVisibles(SECCION_DE_CATALOGOS, permisos).subsecciones.filter(
    (sub) => !sub.apagada && deLogistica.has(sub.clave),
  )
  const destino =
    destinoDeLaUrlVieja(deLaBusqueda(peticion.nextUrl.searchParams), abiertos) ??
    primeraSubseccionAbierta(SECCION_DE_CATALOGOS, permisos) ??
    RUTAS.inicioDeConfiguracion
  return redireccionPermanente(destino, { porPersona: true })
}
