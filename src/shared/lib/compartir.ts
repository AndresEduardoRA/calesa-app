// Lo que el navegador deja hacer con lo que se comparte (una imagen, unas fotos, un texto): copiar, descargar y el menú de compartir del sistema. Cada capacidad se
// pregunta antes de ofrecerla (lo que no se puede, el botón se apaga con su motivo). Genérico: no sabe qué se comparte; lo usan «Compartir» de los tipos de cambio y
// «Compartir la cotización».

export const MOTIVO_SIN_PORTAPAPELES = 'Este navegador no permite copiar texto.'
export const MOTIVO_SIN_PORTAPAPELES_DE_IMAGENES = 'Este navegador no permite copiar imágenes.'
export const MOTIVO_SIN_COMPARTIR_ARCHIVOS = 'Este navegador no permite compartir imágenes.'

export type Capacidades = {
  portapapeles: boolean
  portapapelesDeImagenes: boolean
  // El menú de compartir del sistema, sólo donde es lo natural (el celular): en el escritorio se copia y se descarga.
  compartirDelSistema: boolean
  // Si ese menú acepta archivos (una imagen): sin eso comparte sólo el texto.
  compartirArchivos: boolean
}

const NINGUNA: Capacidades = {
  portapapeles: false,
  portapapelesDeImagenes: false,
  compartirDelSistema: false,
  compartirArchivos: false,
}

// Si el menú del sistema acepta una imagen: se pregunta con un archivo de prueba, vacío (lo que mira es el tipo).
function aceptaArchivos(): boolean {
  if (!('canShare' in navigator) || typeof File !== 'function') {
    return false
  }
  try {
    return navigator.canShare({ files: [new File([], 'prueba.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

export function capacidadesDelNavegador(): Capacidades {
  if (typeof navigator === 'undefined') {
    return NINGUNA
  }
  // `in`: lo que un navegador no trae no existe (no es `undefined` de un tipo que dice que siempre está).
  const hayPortapapeles = 'clipboard' in navigator
  const compartirDelSistema = 'share' in navigator && window.matchMedia('(pointer: coarse)').matches
  return {
    portapapeles: hayPortapapeles && 'writeText' in navigator.clipboard,
    portapapelesDeImagenes:
      hayPortapapeles &&
      'write' in navigator.clipboard &&
      typeof (globalThis as { ClipboardItem?: unknown }).ClipboardItem === 'function',
    compartirDelSistema,
    compartirArchivos: compartirDelSistema && aceptaArchivos(),
  }
}

export async function copiarTexto(texto: string): Promise<void> {
  await navigator.clipboard.writeText(texto)
}

// El portapapeles lleva una imagen PNG (lo único que aceptan todos): quien llama la tiene lista **antes** del toque (Safari pierde el gesto si se espera algo).
export async function copiarImagen(imagen: Blob): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': imagen })])
}

// Lo que tarda el navegador en tomar el archivo antes de soltar la URL que se armó para bajarlo.
export const ESPERA_PARA_SOLTAR_MS = 1000

// Baja un archivo sin salir de la página: un `<a download>` de un momento sobre la URL que se da o sobre una URL del blob (que después se suelta).
export function descargarArchivo(origen: Blob | string, nombre: string): void {
  const url = typeof origen === 'string' ? origen : URL.createObjectURL(origen)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  if (typeof origen !== 'string') {
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, ESPERA_PARA_SOLTAR_MS)
  }
}

// El menú de compartir del sistema con el texto y los archivos; si no comparte archivos (o no hay), sólo el texto (`conArchivos: false`). `null` si la persona
// cerró el menú.
export async function compartirConElSistema(
  texto: string,
  archivos: readonly File[],
): Promise<{ conArchivos: boolean } | null> {
  const lista = [...archivos]
  const conArchivos =
    lista.length > 0 && 'canShare' in navigator && navigator.canShare({ files: lista })
  try {
    await navigator.share(conArchivos ? { files: lista, text: texto } : { text: texto })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null
    }
    throw error
  }
  return { conArchivos }
}

// Una imagen como PNG (lo que pide el portapapeles): si ya lo es, la misma; si no (un WebP), se dibuja en un lienzo del navegador. Se baja con `fetch`, nunca desde
// un `<img>`: un lienzo con una imagen de otro origen queda «manchado» y no exporta.
export async function pngDesde(imagen: Blob): Promise<Blob> {
  if (imagen.type === 'image/png') {
    return imagen
  }
  const mapa = await createImageBitmap(imagen)
  try {
    const lienzo = document.createElement('canvas')
    lienzo.width = mapa.width
    lienzo.height = mapa.height
    const contexto = lienzo.getContext('2d')
    if (contexto === null) {
      throw new Error('Sin lienzo')
    }
    contexto.drawImage(mapa, 0, 0)
    return await new Promise<Blob>((resolver, rechazar) => {
      lienzo.toBlob((png) => {
        if (png === null) {
          rechazar(new Error('Sin PNG'))
        } else {
          resolver(png)
        }
      }, 'image/png')
    })
  } finally {
    mapa.close()
  }
}
