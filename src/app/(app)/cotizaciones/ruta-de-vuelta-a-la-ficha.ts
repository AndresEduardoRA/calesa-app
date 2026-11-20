import { unParametro } from '@/shared/lib/rutas'

// Lo que abre el resumen y sus diálogos (además de su propia clave `?cotizacion=`): no vuelve con la persona a la ficha.
const CLAVES_DEL_RESUMEN = ['pestana', 'visor', 'foto', 'panel', 'para']

// La ficha como estaba antes de abrir el resumen: su ruta con lo que ya llevaba en la URL (la sección, el panel de la ficha) menos lo del resumen (`claveDelResumen` y sus diálogos).
export function rutaDeVueltaALaFicha(
  ruta: string,
  parametros: Readonly<Record<string, string | string[] | undefined>>,
  claveDelResumen: string,
): string {
  const consulta = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros)) {
    const uno = unParametro(valor)
    if (uno !== undefined && clave !== claveDelResumen && !CLAVES_DEL_RESUMEN.includes(clave)) {
      consulta.set(clave, uno)
    }
  }
  const texto = consulta.toString()
  return texto === '' ? ruta : `${ruta}?${texto}`
}
