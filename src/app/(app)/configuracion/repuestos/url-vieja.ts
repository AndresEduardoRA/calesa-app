import { RUTAS } from '@/shared/lib/rutas'
import { conParametros, type ParametrosDeLaUrl } from '../con-parametros'

// Repuestos era una página con dos pestañas (`?seccion=catalogos|cotizador`): cada una es ahora una sub-ruta. Esos enlaces siguen funcionando:
// `?seccion=cotizador` va a `/cotizador` y `?seccion=catalogos`, o un `?panel=` de los catálogos sin sección, a `/catalogos`; sin nada, al flujo de
// repuestos (la primera sub-sección); cualquier otro valor, a `/catalogos` (como antes). Los `?panel=` que traiga
// (`nuevo-valor&catalogo=`, `editar-valor&valor=`, `eliminar-valor&valor=`, `tramo`, `caja`) viajan con él. Ningún destino lleva `seccion`:
// no vuelve a redirigir.
export function destinoDeLaUrlVieja(parametros: ParametrosDeLaUrl): string {
  return conParametros(rutaDe(parametros), parametros)
}

function rutaDe(parametros: ParametrosDeLaUrl): string {
  const seccion = parametros['seccion']
  if (seccion === 'cotizador') {
    return RUTAS.cotizadorDeRepuestos
  }
  if (seccion === undefined && parametros['panel'] === undefined) {
    return RUTAS.flujoDeRepuestos
  }
  return RUTAS.catalogosDeRepuestos
}
