// Atajos globales de teclado (docs/UX.md › Reglas transversales). Acá vive el catálogo y la
// lectura de un evento; quién escucha y a quién le toca responder es de `src/shared/ui/atajos`.

export const ATAJOS = {
  cerrar: { combinacion: 'escape', descripcion: 'Cerrar el panel abierto' },
  buscar: { combinacion: 'mod+k', descripcion: 'Buscar y ejecutar comandos' },
  nuevo: { combinacion: 'n', descripcion: 'Nuevo, según la pantalla' },
  abrirNuevo: { combinacion: 'shift+n', descripcion: 'Abrir «Nuevo»: elegir qué crear' },
  guardar: { combinacion: 'mod+s', descripcion: 'Guardar' },
  guardarYSeguir: { combinacion: 'mod+enter', descripcion: 'Guardar y seguir' },
  plegarMenu: { combinacion: 'mod+b', descripcion: 'Plegar o desplegar el menú lateral' },
  ayuda: { combinacion: '?', descripcion: 'Ver la lista de atajos' },
} as const satisfies Record<string, { combinacion: string; descripcion: string }>

export type ClaveAtajo = keyof typeof ATAJOS

// Lo mínimo de un KeyboardEvent, para poder probarlo sin DOM.
export type Tecla = {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey?: boolean
}

const esLetra = (key: string) => key.length === 1 && key.toLowerCase() !== key.toUpperCase()

// `mod` es Ctrl en Windows y Linux y Cmd en macOS: se aceptan los dos en cualquier sistema. `shift` sólo cuenta con una letra suelta: `?` ya lleva el
// Mayús puesto en su `key`, `Ctrl+Shift+S` sigue siendo guardar, y con Bloq Mayús una `N` llega como `N` sin `shiftKey`: sigue siendo `n`.
export function combinacionDe(tecla: Tecla): string {
  const key = tecla.key.toLowerCase()
  const mod = tecla.ctrlKey || tecla.metaKey
  const mayus = tecla.shiftKey === true && esLetra(key) && !mod && !tecla.altKey
  return `${mod ? 'mod+' : ''}${tecla.altKey ? 'alt+' : ''}${mayus ? 'shift+' : ''}${key}`
}

export function atajoDe(tecla: Tecla): ClaveAtajo | null {
  const combinacion = combinacionDe(tecla)
  for (const clave of Object.keys(ATAJOS) as ClaveAtajo[]) {
    if (ATAJOS[clave].combinacion === combinacion) {
      return clave
    }
  }
  return null
}

// Los de una sola tecla (`N`, `?`) no se disparan mientras la persona escribe; los que llevan
// `mod` y `Esc` sí, que para eso existen. Salvo `Ctrl+B`: en un campo de texto enriquecido es la negrita.
export function valeMientrasSeEscribe(clave: ClaveAtajo): boolean {
  if (clave === 'plegarMenu') {
    return false
  }
  const { combinacion } = ATAJOS[clave]
  return combinacion.startsWith('mod+') || combinacion === 'escape'
}

export function esMac(plataforma: string): boolean {
  return /mac|iphone|ipad/i.test(plataforma)
}

const NOMBRE_DE_TECLA: Record<string, string> = { enter: 'Intro', escape: 'Esc', shift: 'Mayús' }

// Las teclas de un atajo como se muestran: `mod` es Ctrl, o ⌘ en macOS; una letra va en mayúscula.
export function teclasDelAtajo(clave: ClaveAtajo, { mac }: { mac: boolean }): string[] {
  return ATAJOS[clave].combinacion.split('+').map((parte) => {
    if (parte === 'mod') {
      return mac ? '⌘' : 'Ctrl'
    }
    return NOMBRE_DE_TECLA[parte] ?? parte.toUpperCase()
  })
}
