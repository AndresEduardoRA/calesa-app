import { describe, expect, it } from 'vitest'
import {
  destinoEnElModulo,
  especificadoresDe,
  MODULO,
  type Archivo,
} from '../../../../../scripts/guardas/areas-de-cotizaciones'
import { archivosDelModulo } from '../../../../../scripts/guardas/areas-de-cotizaciones-arbol'

// Los paquetes de V1 (decenas de KB de JSON) son sólo del servidor: ningún archivo `'use client'` de `features/` alcanza, ni de paso, `plantillas-de-v1/index`
// ni un `plantillas-de-v1/*.json`. El botón y el modal conocen las claves (`claves.ts`) y los tipos (`tipos.ts`). Lee los imports como la guarda de las áreas
// (`especificadoresDe()`). docs/COTIZADOR.md › «Plantillas de V1».

const PROHIBIDO = /^entities\/plantillas-de-v1\/(index(\.ts)?|[^/]+\.json)$/

const conDirectiva = (directiva: string) => (texto: string) =>
  new RegExp(`^\\s*(?:\\/\\/[^\\n]*\\n\\s*)*['"]${directiva}['"]`).test(texto)
const esDeCliente = conDirectiva('use client')
// Una Server Action (`'use server'`): el bundler la cambia por una referencia, y lo que importa no viaja al navegador.
const esDeServidor = conDirectiva('use server')

// El archivo al que llega un destino del módulo, como lo resuelve TypeScript.
function resuelto(destino: string, existe: ReadonlySet<string>): string {
  const candidatos = [
    destino,
    `${destino}.ts`,
    `${destino}.tsx`,
    `${destino}/index.ts`,
    `${destino}/index.tsx`,
  ]
  return candidatos.find((c) => existe.has(c)) ?? destino
}

// Lo que alcanza `desde` siguiendo los imports adentro del módulo, con el camino hasta el primero prohibido.
function caminoProhibido(desde: string, archivos: readonly Archivo[]): string[] | null {
  const porRuta = new Map(archivos.map((a) => [a.ruta.slice(MODULO.length), a.texto]))
  const existe = new Set(porRuta.keys())
  const vistos = new Set<string>([desde])
  const cola: string[][] = [[desde]]
  for (let camino = cola.shift(); camino !== undefined; camino = cola.shift()) {
    const actual = camino[camino.length - 1] ?? desde
    if (PROHIBIDO.test(actual)) return camino
    const texto = porRuta.get(actual) ?? ''
    if (actual !== desde && esDeServidor(texto)) continue
    for (const e of especificadoresDe(texto)) {
      const destino = destinoEnElModulo(actual, e)
      if (destino === undefined) continue
      const siguiente = resuelto(destino, existe)
      if (vistos.has(siguiente)) continue
      vistos.add(siguiente)
      cola.push([...camino, siguiente])
    }
  }
  return null
}

describe('las plantillas de V1 no viajan al navegador', () => {
  const archivos = archivosDelModulo()

  it('ningún archivo «use client» de features/ alcanza los paquetes', () => {
    const caminos = archivos
      .filter((a) => a.ruta.startsWith(`${MODULO}features/`) && esDeCliente(a.texto))
      .map((a) => caminoProhibido(a.ruta.slice(MODULO.length), archivos))
      .filter((c) => c !== null)
      .map((c) => c.join(' → '))
    expect(caminos).toEqual([])
  })

  it('la guarda caza un import directo y uno de paso, y no sigue una Server Action', () => {
    const modulo = (rel: string, texto: string): Archivo => ({ ruta: `${MODULO}${rel}`, texto })
    const arbol = [
      modulo('features/x/a.tsx', "'use client'\nimport { b } from './b'\n"),
      modulo(
        'features/x/b.ts',
        "import { PLANTILLAS_DE_V1 } from '../../entities/plantillas-de-v1'\n",
      ),
      modulo('entities/plantillas-de-v1/index.ts', "import usa from './usa.json'\n"),
      modulo(
        'features/x/c.tsx',
        "'use client'\nimport type { PlantillaDeV1 } from '../../entities/plantillas-de-v1/tipos'\n",
      ),
      modulo('entities/plantillas-de-v1/tipos.ts', ''),
      modulo('features/x/d.tsx', "'use client'\nimport { aplicar } from './e'\n"),
      modulo(
        'features/x/e.ts',
        "'use server'\nimport { PLANTILLAS_DE_V1 } from '../../entities/plantillas-de-v1'\n",
      ),
    ]
    expect(caminoProhibido('features/x/a.tsx', arbol)).toEqual([
      'features/x/a.tsx',
      'features/x/b.ts',
      'entities/plantillas-de-v1/index.ts',
    ])
    expect(caminoProhibido('features/x/c.tsx', arbol)).toBeNull()
    // Una Server Action corta el camino.
    expect(caminoProhibido('features/x/d.tsx', arbol)).toBeNull()
  })
})
