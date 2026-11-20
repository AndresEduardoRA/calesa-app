import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const lecturas: unknown[][] = []
let yo: string | null = 'usuario-1'
let fila: { data: unknown; error: unknown } = { data: [], error: null }
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getClaims: () => Promise.resolve({ data: yo === null ? null : { claims: { sub: yo } } }),
      },
      from: (tabla: string) => ({
        select: (columnas: string) => ({
          eq: (columna: string, valor: string) => ({
            limit: (n: number) => {
              lecturas.push([tabla, columnas, columna, valor, n])
              return Promise.resolve(fila)
            },
          }),
        }),
      }),
    }),
  ),
}))

import { getAsesorQueMira } from './asesor-que-mira'

const PERFIL = {
  nombre: 'Luis Rojas',
  email: 'luis@x.test',
  whatsapp_web: '+59170000002',
  cargo_web: 'Asesor comercial',
  avatar_ruta: 'usuario-1/abc.webp',
}

describe('getAsesorQueMira: el asesor de la tarjeta es quien la mira', () => {
  beforeEach(() => {
    lecturas.length = 0
    yo = 'usuario-1'
    fila = { data: [], error: null }
  })

  it('lee el perfil de quien mira por clave primaria con limit(1)', async () => {
    await getAsesorQueMira()
    expect(lecturas).toEqual([
      ['perfiles', 'nombre, email, whatsapp_web, cargo_web, avatar_ruta', 'id', 'usuario-1', 1],
    ])
  })

  it('da su nombre, su WhatsApp, su cargo y la ruta de su foto', async () => {
    fila = { data: [PERFIL], error: null }
    expect(await getAsesorQueMira()).toEqual({
      ok: true,
      data: {
        nombre: 'Luis Rojas',
        telefono: '+59170000002',
        cargo: 'Asesor comercial',
        fotoRuta: 'usuario-1/abc.webp',
      },
    })
  })

  it('sin nombre, la parte local del correo; lo vacío o en blanco es nulo', async () => {
    fila = {
      data: [{ ...PERFIL, nombre: ' ', whatsapp_web: null, cargo_web: '  ', avatar_ruta: '' }],
      error: null,
    }
    expect(await getAsesorQueMira()).toEqual({
      ok: true,
      data: { nombre: 'luis', telefono: null, cargo: null, fotoRuta: null },
    })
  })

  it('sin sesión no lee nada; sin perfil, nulo', async () => {
    yo = null
    expect(await getAsesorQueMira()).toEqual({ ok: true, data: null })
    expect(lecturas).toEqual([])
    yo = 'usuario-1'
    expect(await getAsesorQueMira()).toEqual({ ok: true, data: null })
  })

  it('un error de la base o una forma rara es un fallo, sin su mensaje', async () => {
    fila = { data: null, error: { message: 'boom', code: 'XX000', details: '', hint: '' } }
    expect((await getAsesorQueMira()).ok).toBe(false)
    fila = { data: [{ otra: 1 }], error: null }
    expect((await getAsesorQueMira()).ok).toBe(false)
  })
})
