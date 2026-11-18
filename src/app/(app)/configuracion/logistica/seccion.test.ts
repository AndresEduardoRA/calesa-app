import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { conSubseccionesVisibles, primeraSubseccionAbierta } from '../secciones'
import { CATALOGOS_DE_LOGISTICA } from './catalogos'
import { SECCION_DE_LOGISTICA, SUBSECCIONES_DE_LOGISTICA } from './seccion'

const gestiona: Permisos = [
  { clave: 'logistica.catalogos.gestionar', origenId: null, alcance: 'todos' },
]

describe('la sección «Logística» de Configuración', () => {
  it('tiene una sub-ruta por catálogo: puertos, navieras y categorías de gasto, con su frase', () => {
    expect(SUBSECCIONES_DE_LOGISTICA.map((sub) => [sub.titulo, sub.ruta, sub.descripcion])).toEqual(
      [
        [
          'Puertos',
          '/configuracion/logistica/puertos',
          'Los puertos de embarque y de llegada, con su país y su código.',
        ],
        [
          'Navieras',
          '/configuracion/logistica/navieras',
          'Las navieras con las que se embarca; las que no se usan se desactivan.',
        ],
        [
          'Categorías de gasto',
          '/configuracion/logistica/categorias-de-gasto',
          'En qué se gasta en cada vehículo y para qué sirve cada gasto.',
        ],
      ],
    )
  })

  it('cada catálogo lleva a una página que existe', () => {
    const app = path.join(process.cwd(), 'src/app/(app)')
    for (const catalogo of CATALOGOS_DE_LOGISTICA) {
      expect(
        existsSync(path.join(app, 'configuracion/logistica', catalogo.clave, 'page.tsx')),
        catalogo.clave,
      ).toBe(true)
    }
  })

  it('quien gestiona los catálogos abre los tres; el primero es adonde abre la sección', () => {
    expect(conSubseccionesVisibles(SECCION_DE_LOGISTICA, gestiona).subsecciones).toHaveLength(3)
    expect(primeraSubseccionAbierta(SECCION_DE_LOGISTICA, gestiona)).toBe(
      '/configuracion/logistica/puertos',
    )
  })

  it('sin la clave no hay sub-secciones que abrir', () => {
    expect(conSubseccionesVisibles(SECCION_DE_LOGISTICA, []).subsecciones).toEqual([])
    expect(primeraSubseccionAbierta(SECCION_DE_LOGISTICA, [])).toBeNull()
  })
})
