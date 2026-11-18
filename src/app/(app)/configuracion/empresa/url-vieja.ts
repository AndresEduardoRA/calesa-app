import { RUTAS } from '@/shared/lib/rutas'

// Empresa era una página con pestañas (`?seccion=`) y los paneles de Monedas tenían su URL en la raíz (`?tc=`, `?moneda=`, `?panel=`).
// Esos enlaces siguen funcionando: van a su sub-ruta. Monedas conserva sus paneles; lo demás no viaja. null si no hay nada que mover
// (también con un `seccion` que no existe: se dibuja Datos). Ningún destino vuelve a redirigir: ninguno lleva `seccion` y los paneles
// van a Monedas, que no redirige.
export type ParametrosViejos = {
  seccion?: string | undefined
  tc?: string | undefined
  moneda?: string | undefined
  panel?: string | undefined
}

const PANELES_DE_MONEDAS = new Set(['nuevo-tipo-cambio', 'nueva-moneda'])

// Los parámetros de Monedas que vienen en la URL vieja, en el orden de siempre; un `panel` que no es de Monedas no cuenta.
function parametrosDeMonedas({ tc, moneda, panel }: ParametrosViejos): URLSearchParams {
  const conservados = new URLSearchParams()
  for (const [nombre, valor] of [
    ['tc', tc],
    ['moneda', moneda],
    ['panel', panel !== undefined && PANELES_DE_MONEDAS.has(panel) ? panel : undefined],
  ] as const) {
    if (valor !== undefined) {
      conservados.set(nombre, valor)
    }
  }
  return conservados
}

export function destinoDeLaUrlVieja(parametros: ParametrosViejos): string | null {
  const { seccion } = parametros
  if (seccion === 'integraciones') {
    return RUTAS.integracionesDeEmpresa
  }
  if (seccion === 'comprobantes') {
    return RUTAS.comprobantesDeEmpresa
  }
  const busqueda = parametrosDeMonedas(parametros).toString()
  if (busqueda !== '') {
    return `${RUTAS.monedasDeEmpresa}?${busqueda}`
  }
  if (seccion === 'monedas') {
    return RUTAS.monedasDeEmpresa
  }
  return seccion === 'empresa' ? RUTAS.empresa : null
}
