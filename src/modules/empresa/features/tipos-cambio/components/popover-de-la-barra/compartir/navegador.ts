// Lo que el navegador deja hacer con lo que se comparte: copiar, descargar y el menú de compartir del sistema. Cada capacidad se pregunta antes de ofrecerla
// (lo que no se puede, el botón se apaga con su motivo); las funciones devuelven `true` si se hizo y `false` si la persona canceló.
export const NOMBRE_DEL_ARCHIVO = 'tipos-de-cambio.png'

export type Capacidades = {
  portapapeles: boolean
  portapapelesDeImagenes: boolean
  // El menú de compartir del sistema, sólo donde es lo natural (el celular): en el escritorio se copia y se descarga.
  compartirDelSistema: boolean
}

export function capacidadesDelNavegador(): Capacidades {
  if (typeof navigator === 'undefined') {
    return { portapapeles: false, portapapelesDeImagenes: false, compartirDelSistema: false }
  }
  // `in`: lo que un navegador no trae no existe (no es `undefined` de un tipo que dice que siempre está).
  const hayPortapapeles = 'clipboard' in navigator
  return {
    portapapeles: hayPortapapeles && 'writeText' in navigator.clipboard,
    portapapelesDeImagenes:
      hayPortapapeles &&
      'write' in navigator.clipboard &&
      typeof (globalThis as { ClipboardItem?: unknown }).ClipboardItem === 'function',
    compartirDelSistema: 'share' in navigator && window.matchMedia('(pointer: coarse)').matches,
  }
}

export async function copiarTexto(texto: string): Promise<void> {
  await navigator.clipboard.writeText(texto)
}

export async function copiarImagen(imagen: Blob): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': imagen })])
}

export function descargarImagen(url: string): void {
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = NOMBRE_DEL_ARCHIVO
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
}

// El menú de compartir del sistema con la imagen y el texto; si no comparte archivos, sólo el texto (`conImagen: false`). `null` si la persona cerró el menú.
export async function compartirConElSistema(
  texto: string,
  imagen: Blob | null,
): Promise<{ conImagen: boolean } | null> {
  const archivo =
    imagen === null ? null : new File([imagen], NOMBRE_DEL_ARCHIVO, { type: 'image/png' })
  const conImagen =
    archivo !== null && 'canShare' in navigator && navigator.canShare({ files: [archivo] })
  try {
    await navigator.share(conImagen ? { files: [archivo], text: texto } : { text: texto })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null
    }
    throw error
  }
  return { conImagen }
}
