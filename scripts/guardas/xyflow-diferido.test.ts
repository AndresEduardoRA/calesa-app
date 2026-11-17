import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// `@xyflow/react` (el diagrama del flujo, `docs/DECISIONES.md` › «Flujos») pesa: sólo lo paga quien abre el diagrama. Lo importan únicamente los archivos de
// `diagrama/` y a ese directorio sólo se llega por el `import()` de `diferidos.tsx` (`diferido()`), así ninguna otra pantalla ni el marco lo cargan en frío.
// Un import estático desde afuera de `diagrama/` (aunque sea de un tipo con `import type` no pesa, se exige igual por simple) rompe esta prueba.

const RAIZ = process.cwd()
const DIAGRAMA = 'src/modules/flujos/features/configuracion/components/diagrama/'
const DIFERIDOS = 'src/modules/flujos/features/configuracion/components/diferidos.tsx'

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (e.isDirectory()) {
      yield* archivos(ruta)
    } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
      yield ruta
    }
  }
}

const fuentes = [...archivos(join(RAIZ, 'src'))].map((ruta) => ({
  archivo: relative(RAIZ, ruta).replaceAll('\\', '/'),
  texto: readFileSync(ruta, 'utf8'),
}))

// Los `from '…'` y los `import('…')` de un archivo.
const especificadores = (texto: string) => [
  ...[...texto.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => ({
    esp: m[1] ?? '',
    dinamico: false,
  })),
  ...[...texto.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)].map((m) => ({
    esp: m[1] ?? '',
    dinamico: false,
  })),
  ...[...texto.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => ({
    esp: m[1] ?? '',
    dinamico: true,
  })),
]

const resolver = (desde: string, esp: string): string => {
  if (esp.startsWith('@/')) return `src/${esp.slice(2)}`
  if (!esp.startsWith('.')) return esp
  const partes = desde.split('/').slice(0, -1)
  for (const p of esp.split('/')) {
    if (p === '..') partes.pop()
    else if (p !== '.') partes.push(p)
  }
  return partes.join('/')
}

describe('@xyflow/react sólo detrás de diferido()', () => {
  it('el diagrama existe y es el que importa la librería', () => {
    const conLibreria = fuentes.filter((f) =>
      especificadores(f.texto).some(({ esp }) => esp.startsWith('@xyflow/react')),
    )
    expect(conLibreria.length).toBeGreaterThan(0)
    expect(conLibreria.map((f) => f.archivo).filter((a) => !a.startsWith(DIAGRAMA))).toEqual([])
  })

  it('fuera de diagrama/ nadie lo importa, salvo el import() de diferidos.tsx', () => {
    const problemas = fuentes
      .filter((f) => !f.archivo.startsWith(DIAGRAMA))
      .flatMap((f) =>
        especificadores(f.texto)
          .filter(({ esp }) => `${resolver(f.archivo, esp)}/`.startsWith(DIAGRAMA))
          .filter(({ dinamico }) => !(dinamico && f.archivo === DIFERIDOS))
          .map(({ esp }) => `${f.archivo}: ${esp}`),
      )
    expect(problemas).toEqual([])
    expect(
      especificadores(fuentes.find((f) => f.archivo === DIFERIDOS)?.texto ?? '').some(
        ({ esp, dinamico }) => dinamico && esp.startsWith('./diagrama/'),
      ),
    ).toBe(true)
  })
})
