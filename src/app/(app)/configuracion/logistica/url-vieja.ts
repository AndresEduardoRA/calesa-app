import { conParametros, type ParametrosDeLaUrl } from '../con-parametros'

// Logística era una página con pestañas (`?seccion=puertos|navieras|categorias-de-gasto`): cada catálogo es ahora una sub-ruta. Esos enlaces
// siguen funcionando: `?seccion=` va a la sub-ruta del catálogo, con los `?panel=` que traiga. Un `seccion` que no es un catálogo que la persona
// puede abrir (o ninguno) va al primero, como antes. null si no hay ningún catálogo que abrir. Ningún destino lleva `seccion`: no vuelve a redirigir.
export function destinoDeLaUrlVieja(
  parametros: ParametrosDeLaUrl,
  abiertos: readonly { clave: string; ruta: string }[],
): string | null {
  const pedido = parametros['seccion']
  const destino = abiertos.find((sub) => sub.clave === pedido) ?? abiertos[0]
  return destino === undefined ? null : conParametros(destino.ruta, parametros)
}
