import { RUTAS } from '@/shared/lib/rutas'
import { conParametros, type ParametrosDeLaUrl } from '../con-parametros'

// Repuestos era una página con dos pestañas (`?seccion=catalogos|cotizador`): cada una es ahora una sub-ruta. Esos enlaces siguen funcionando:
// `?seccion=cotizador` va a `/cotizador` y cualquier otro valor, o ninguno, a `/catalogos` (como antes: la primera). Los `?panel=` que traiga
// (`nuevo-valor&catalogo=`, `editar-valor&valor=`, `eliminar-valor&valor=`, `tramo`, `caja`) viajan con él. Ningún destino lleva `seccion`:
// no vuelve a redirigir.
export function destinoDeLaUrlVieja(parametros: ParametrosDeLaUrl): string {
  const ruta =
    parametros['seccion'] === 'cotizador' ? RUTAS.cotizadorDeRepuestos : RUTAS.catalogosDeRepuestos
  return conParametros(ruta, parametros)
}
