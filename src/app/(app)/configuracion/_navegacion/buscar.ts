import type { GrupoDelNavegador } from '../secciones'
import { rutaDelMenu } from './marca'

// La búsqueda de Configuración: sobre lo que el menú ya recibe (secciones y sub-secciones que la persona puede abrir, con las `palabras` que
// declara el registro), sin pedir nada más. Una sub-sección apagada (sin permiso) no se ofrece; una plantilla se rellena con la ruta actual o
// con su respaldo (`rutaDelMenu`). Se compara sin acentos ni mayúsculas y cada palabra escrita tiene que ser el comienzo de una palabra del título (con el de
// su sección) o de sus palabras: «logo» no encuentra «Catálogos».
export type ResultadoDeBusqueda = {
  clave: string
  // «Empresa › Datos de la empresa»; una sección, sólo su título.
  camino: string
  ruta: string
}

// Lo que se dibuja como mucho: el registro es corto, pero una lista sin tope no se escribe.
export const TOPE_DE_RESULTADOS = 12

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

type Candidata = ResultadoDeBusqueda & {
  esSub: boolean
  // Las palabras (ya normalizadas) de su título, del título con el de su sección y de sus palabras clave.
  propio: string[]
  titulos: string[]
  palabras: string[]
}

const separar = (texto: string) => normalizar(texto).split(' ').filter(Boolean)

function candidatas(grupos: readonly GrupoDelNavegador[], actual: string): Candidata[] {
  return grupos.flatMap((grupo) =>
    grupo.secciones.flatMap((seccion): Candidata[] => {
      const propia: Candidata = {
        clave: seccion.clave,
        camino: seccion.titulo,
        ruta: seccion.ruta,
        esSub: false,
        propio: separar(seccion.titulo),
        titulos: separar(seccion.titulo),
        palabras: separar((seccion.palabras ?? []).join(' ')),
      }
      const subs = seccion.subsecciones.flatMap((sub): Candidata[] => {
        const ruta = rutaDelMenu(sub, actual)
        if (ruta === null || sub.motivo !== undefined) {
          return []
        }
        return [
          {
            clave: `${seccion.clave}-${sub.clave}`,
            camino: `${seccion.titulo} › ${sub.titulo}`,
            ruta,
            esSub: true,
            propio: separar(sub.titulo),
            titulos: separar(`${seccion.titulo} ${sub.titulo}`),
            palabras: separar((sub.palabras ?? []).join(' ')),
          },
        ]
      })
      return [propia, ...subs]
    }),
  )
}

const empieza = (palabras: readonly string[], p: string) =>
  palabras.some((una) => una.startsWith(p))

// 0: todo lo escrito está en su título y empieza igual; 1: está en su título; 2: está en el título con el de su sección; 3: hacen falta sus palabras.
function puntaje(candidata: Candidata, escritas: readonly string[]): number | null {
  if (!escritas.every((p) => empieza(candidata.titulos, p) || empieza(candidata.palabras, p))) {
    return null
  }
  if (escritas.every((p) => empieza(candidata.propio, p))) {
    return candidata.propio[0]?.startsWith(escritas[0] ?? '') ? 0 : 1
  }
  return escritas.every((p) => empieza(candidata.titulos, p)) ? 2 : 3
}

export function buscarEnConfiguracion(
  grupos: readonly GrupoDelNavegador[],
  texto: string,
  actual: string,
): ResultadoDeBusqueda[] {
  const palabras = separar(texto)
  if (palabras.length === 0) {
    return []
  }
  const aciertos = candidatas(grupos, actual).flatMap((candidata, orden) => {
    const nota = puntaje(candidata, palabras)
    return nota === null ? [] : [{ candidata, nota, orden }]
  })
  // Dos que abren la misma pantalla (la sección y su sub-sección índice): se queda la sub-sección, que dice más, con el mejor puntaje de las dos
  // y el lugar de la primera.
  const porRuta = new Map<string, (typeof aciertos)[number]>()
  for (const acierto of aciertos) {
    const previo = porRuta.get(acierto.candidata.ruta)
    if (previo === undefined) {
      porRuta.set(acierto.candidata.ruta, acierto)
    } else {
      porRuta.set(acierto.candidata.ruta, {
        candidata: acierto.candidata.esSub ? acierto.candidata : previo.candidata,
        nota: Math.min(acierto.nota, previo.nota),
        orden: previo.orden,
      })
    }
  }
  return [...porRuta.values()]
    .sort((a, b) => a.nota - b.nota || a.orden - b.orden)
    .slice(0, TOPE_DE_RESULTADOS)
    .map(({ candidata }) => ({
      clave: candidata.clave,
      camino: candidata.camino,
      ruta: candidata.ruta,
    }))
}
