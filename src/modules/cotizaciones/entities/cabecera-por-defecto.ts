// La configuración por defecto de la cabecera (docs/GLOSARIO.md › «Modo por defecto», «Modos visibles»): lo que edita el ⚙ de la cabecera en la hoja y la cabecera
// del diseño en Configuración, con el mismo texto. Reglas puras, cero I/O.

type Modo = { clave: string; nombre: string }

// Los valores efectivos: el modo por defecto, si «Ver total» sale encendido y los modos visibles, en el orden del diseño.
export type PorDefecto = { modo: string; verTotalBs: boolean; visibles: readonly string[] }

// Un nombre que ya termina en punto («Subasta EE. UU.») no lleva otro al cerrar la oración.
export const conPunto = (texto: string) => (texto.endsWith('.') ? texto : `${texto}.`)

export const TITULO_DEL_PANEL_POR_DEFECTO = (origen: string) =>
  `Configuración por defecto de ${origen}`
export const AVISO_DE_LA_CABECERA = (origen: string) =>
  `Con esto arrancan las cotizaciones nuevas de ${conPunto(origen)} El selector del encabezado sigue cambiando sólo la cotización abierta.`
export const MODO_POR_DEFECTO_VISIBLE = 'El modo por defecto debe quedar visible.'
export const MOTIVO_DE_SOLO_LECTURA = 'Sólo ves esta cotización: no cambia.'
export const AYUDA_DE_APLICAR =
  'Pone en esta cotización el modo y «Ver total» que elegiste, como si los cambiaras tú.'
export const MISMOS_VALORES_DE_LA_CABECERA = 'La cabecera ya tiene esos valores.'
export const motivoSinElModo = (version: number) =>
  `Esta cotización usa la versión ${String(version)}, que no tiene ese modo.`
export const noAplicar = (modoActual: string) =>
  `Si lo desmarcas, esta cotización se queda en ${modoActual}.`

// Lo efectivo de una cabecera: lo que falta vale el primer modo, falso y todos. Nulo sin modos (no hay qué configurar). Un modo visible que no es del diseño no
// cuenta; el modo por defecto, si no es del diseño, vale el primero.
export function porDefectoDe(cabecera: {
  modos: readonly Modo[]
  modoPorDefecto: string | null
  verTotalBsPorDefecto: boolean
  modosVisibles: readonly string[] | null
}): PorDefecto | null {
  const claves = cabecera.modos.map((m) => m.clave)
  const primero = claves[0]
  if (primero === undefined) {
    return null
  }
  const modo =
    cabecera.modoPorDefecto !== null && claves.includes(cabecera.modoPorDefecto)
      ? cabecera.modoPorDefecto
      : primero
  const visibles = cabecera.modosVisibles
  return {
    modo,
    verTotalBs: cabecera.verTotalBsPorDefecto,
    visibles: visibles === null ? claves : claves.filter((c) => visibles.includes(c)),
  }
}

const enOrden = (modos: readonly Modo[], claves: ReadonlySet<string>) =>
  modos.map((m) => m.clave).filter((c) => claves.has(c))

// Elegir el modo por defecto: queda visible (nunca se esconde el que abre las cotizaciones nuevas).
export function elegirModo(pd: PorDefecto, modo: string, modos: readonly Modo[]): PorDefecto {
  return { ...pd, modo, visibles: enOrden(modos, new Set([...pd.visibles, modo])) }
}

// Mostrar u ocultar un modo en el encabezado; el modo por defecto no se oculta.
export function alternarVisible(pd: PorDefecto, clave: string, modos: readonly Modo[]): PorDefecto {
  if (clave === pd.modo) {
    return pd
  }
  const visibles = new Set(pd.visibles)
  if (visibles.has(clave)) {
    visibles.delete(clave)
  } else {
    visibles.add(clave)
  }
  return { ...pd, visibles: enOrden(modos, visibles) }
}

export function mismosValores(a: PorDefecto, b: PorDefecto): boolean {
  return (
    a.modo === b.modo &&
    a.verTotalBs === b.verTotalBs &&
    a.visibles.length === b.visibles.length &&
    a.visibles.every((c, i) => b.visibles[i] === c)
  )
}

export type AplicarALaHoja = { puede: true } | { puede: false; motivo: string }

// Si «Aplicar también a esta cotización» se puede: no en una que sólo se ve, ni si la versión que dibuja la hoja no tiene el modo elegido.
export function aplicarALaHoja({
  modosDeLaHoja,
  version,
  soloLectura,
  modo,
}: {
  modosDeLaHoja: readonly { clave: string }[]
  version: number
  soloLectura: boolean
  modo: string
}): AplicarALaHoja {
  if (soloLectura) {
    return { puede: false, motivo: MOTIVO_DE_SOLO_LECTURA }
  }
  if (!modosDeLaHoja.some((m) => m.clave === modo)) {
    return { puede: false, motivo: motivoSinElModo(version) }
  }
  return { puede: true }
}
