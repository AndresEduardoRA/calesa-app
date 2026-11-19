// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RUTAS } from '@/shared/lib/rutas'

vi.mock('server-only', () => ({}))

// `requerirSesion()` de verdad, con su lectura de la sesión y su `redirect` simulados: lo que se prueba es que la ruta lo pida antes de leer nada.
class Redirigido extends Error {
  constructor(readonly destino: string) {
    super(`redirigido a ${destino}`)
  }
}
const sesion = vi.fn()
vi.mock('@/modules/equipo/composicion', () => ({ leerSesion: () => sesion(), servicioAcceso: {} }))
vi.mock('@/shared/lib/navegacion', () => ({
  redirigir: (destino: string) => {
    throw new Redirigido(destino)
  },
}))

const leerPortada = vi.fn()
const bajar = vi.fn()
const armar = vi.fn()
const guardar = vi.fn()
const leerAsesor = vi.fn()
const achicar = vi.fn()
// Las reglas de la portada son las de verdad (las prueba su entidad); la E/S, simulada.
vi.mock('@/modules/cotizaciones', async () => {
  const reglas = await vi.importActual<{
    queHacerConLaPortada: unknown
    etiquetaDeLaPortada: unknown
  }>('@/modules/cotizaciones/entities/tarjeta/portada')
  const ruta = await vi.importActual<{ anchoDeLaPortada: unknown; CLAVE_DEL_ANCHO: unknown }>(
    '@/modules/cotizaciones/entities/ruta-de-la-hoja',
  )
  return {
    queHacerConLaPortada: reglas.queHacerConLaPortada,
    etiquetaDeLaPortada: reglas.etiquetaDeLaPortada,
    anchoDeLaPortada: ruta.anchoDeLaPortada,
    CLAVE_DEL_ANCHO: ruta.CLAVE_DEL_ANCHO,
    miniaturaDeLaPortada: (bytes: Uint8Array, ancho: number) => achicar(bytes, ancho),
    leerLaPortada: (id: string) => leerPortada(id),
    bajarLaPortada: (ruta: string) => bajar(ruta),
    armarLaPortada: (id: string, contextoDe: unknown) => armar(id, contextoDe),
    guardarLaPortada: (entrada: unknown) => guardar(entrada),
    leerAsesorDeLaCotizacion: (id: string) => leerAsesor(id),
    tituloDeLaCotizacion: () => null,
    tituloAparteDelNumero: () => null,
  }
})
const leerVehiculo = vi.fn()
vi.mock('@/modules/vehiculos', () => ({ leerVehiculo: (id: string) => leerVehiculo(id) }))
const leerCliente = vi.fn()
vi.mock('@/modules/leads', () => ({ leerClienteElegido: (id: string) => leerCliente(id) }))

import { GET } from './route'

const ID = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const LEAD = '00000000-0000-4000-8000-0000000000cc'
const CLAVE = 'p1-0123456789abcdef0123456789abcdef'
const RUTA = `${ID}/portada/${'a'.repeat(64)}.webp`
const NO_DISPONIBLE = 'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'
const NO_SE_PUDO = 'No se pudo armar la vista previa. Vuelve a intentarlo.'
const BYTES = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])
const GUARDADOS = new Uint8Array([82, 73, 70, 70, 1, 1, 1, 1, 87, 69, 66, 80])

const COMPARTIDO = {
  cliente: 'Juan Pérez',
  vehiculo: { titulo: 'Hilux', lote: '44', vin: null },
  asesor: 'Ana',
}
const activa = {
  usuarioId: ID,
  estado: 'activa',
  permisos: [],
  perspectiva: { disponible: false, rol: null, roles: [] },
}
const hoja = { cotizacion: { id: ID, leadId: LEAD, vehiculoId: VEHICULO } }
const estado = (cambios: Record<string, unknown> = {}) => ({
  ok: true,
  data: {
    ruta: RUTA,
    clave: CLAVE,
    claveVigente: CLAVE,
    veTodo: true,
    puedeGuardarla: true,
    contexto: COMPARTIDO,
    ...cambios,
  },
})
const fallo = (codigo: string) => ({ ok: false, error: { codigo, mensaje: 'x' } })

// El contexto con que la ruta pidió armar la portada (lo que devuelve su `contextoDe` con la hoja).
let contextoArmado: unknown = undefined

const pedir = (id = ID, cabeceras: Record<string, string> = {}, consulta = '') =>
  GET(
    new Request(`http://localhost/cotizaciones/${id}/portada${consulta}`, { headers: cabeceras }),
    {
      params: Promise.resolve({ id }),
    },
  )
const CHICA = new Uint8Array([82, 73, 70, 70, 4, 8, 0, 0, 87, 69, 66, 80])

beforeEach(() => {
  contextoArmado = undefined
  sesion.mockResolvedValue(activa)
  leerPortada.mockResolvedValue(estado({ ruta: null, clave: null }))
  bajar.mockResolvedValue({ ok: true, data: GUARDADOS })
  armar.mockImplementation(async (_id: string, contextoDe: (h: typeof hoja) => unknown) => {
    contextoArmado = await contextoDe(hoja)
    return { ok: true, data: { bytes: BYTES, guardable: true } }
  })
  guardar.mockResolvedValue({ ok: true, data: { guardada: true } })
  leerAsesor.mockResolvedValue({ ok: true, data: 'Ana Pérez' })
  achicar.mockResolvedValue({ ok: true, data: CHICA })
  leerVehiculo.mockResolvedValue({
    ok: true,
    data: { titulo: 'Toyota Hilux 2020', lote: '4455', vin: null },
  })
  leerCliente.mockResolvedValue({ ok: true, data: { id: LEAD, nombre: 'Juan Pérez' } })
})
afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /cotizaciones/[id]/portada: la sesión y lo que no se ve', () => {
  it('sin sesión va al ingreso y no lee nada', async () => {
    sesion.mockResolvedValue(null)
    await expect(pedir()).rejects.toMatchObject({ destino: RUTAS.ingreso })
    expect(leerPortada).not.toHaveBeenCalled()
  })

  it('un id que no es un guid y lo que no existe, está en la papelera o no se ve: el mismo 404 en texto que el PDF', async () => {
    const malo = await pedir('no-es-un-id')
    expect(malo.status).toBe(404)
    expect(await malo.text()).toBe(NO_DISPONIBLE)
    expect(leerPortada).not.toHaveBeenCalled()

    leerPortada.mockResolvedValue(fallo('sin_permiso'))
    const oculta = await pedir()
    expect(oculta.status).toBe(404)
    expect(oculta.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(oculta.headers.get('cache-control')).toBe('private, no-store')
    expect(await oculta.text()).toBe(NO_DISPONIBLE)
  })

  it('otro error al leer el estado es 500', async () => {
    leerPortada.mockResolvedValue(fallo('inesperado'))
    const r = await pedir()
    expect(r.status).toBe(500)
    expect(await r.text()).toBe(NO_SE_PUDO)
  })
})

describe('GET /cotizaciones/[id]/portada: la compartida', () => {
  it('con If-None-Match igual a la clave vigente, 304 sin bajar ni armar', async () => {
    leerPortada.mockResolvedValue(estado())
    for (const etiqueta of [`"${CLAVE}"`, `W/"${CLAVE}"`]) {
      const r = await pedir(ID, { 'If-None-Match': etiqueta })
      expect(r.status).toBe(304)
      expect(r.headers.get('etag')).toBe(`"${CLAVE}"`)
      expect(r.headers.get('cache-control')).toBe('private, no-cache')
    }
    expect(bajar).not.toHaveBeenCalled()
    expect(armar).not.toHaveBeenCalled()
  })

  it('la guardada al día se baja y se entrega con su ETag, sin armar', async () => {
    leerPortada.mockResolvedValue(estado())
    const r = await pedir(ID, { 'If-None-Match': '"p1-vieja"' })
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('image/webp')
    expect(r.headers.get('etag')).toBe(`"${CLAVE}"`)
    expect(r.headers.get('cache-control')).toBe('private, no-cache')
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(GUARDADOS)
    expect(bajar).toHaveBeenCalledWith(RUTA)
    expect(armar).not.toHaveBeenCalled()
  })

  it('sin guardada (o vieja) la arma con el contexto de la base, la guarda con la clave vigente y la entrega', async () => {
    for (const cambios of [{ ruta: null, clave: null }, { clave: 'p1-vieja' }]) {
      leerPortada.mockResolvedValue(estado(cambios))
      const r = await pedir()
      expect(r.status).toBe(200)
      expect(r.headers.get('etag')).toBe(`"${CLAVE}"`)
      expect(new Uint8Array(await r.arrayBuffer())).toEqual(BYTES)
      expect(contextoArmado).toEqual(COMPARTIDO)
      expect(guardar).toHaveBeenLastCalledWith({ id: ID, bytes: BYTES, clave: CLAVE })
    }
    expect(bajar).not.toHaveBeenCalled()
    // El contexto compartido sale de la base: no lee el cliente, el vehículo ni el asesor.
    expect(leerCliente).not.toHaveBeenCalled()
    expect(leerVehiculo).not.toHaveBeenCalled()
    expect(leerAsesor).not.toHaveBeenCalled()
  })

  it('si la guardada no se puede bajar, la arma otra vez y la guarda', async () => {
    leerPortada.mockResolvedValue(estado())
    bajar.mockResolvedValue(fallo('inesperado'))
    const r = await pedir()
    expect(r.status).toBe(200)
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(BYTES)
    expect(guardar).toHaveBeenCalledWith({ id: ID, bytes: BYTES, clave: CLAVE })
  })
})

describe('GET /cotizaciones/[id]/portada: guardar la compartida', () => {
  it('quien sólo ve recibe la compartida recién armada, sin guardarla', async () => {
    leerPortada.mockResolvedValue(estado({ ruta: null, clave: null, puedeGuardarla: false }))
    const r = await pedir()
    expect(r.status).toBe(200)
    expect(r.headers.get('etag')).toBe(`"${CLAVE}"`)
    expect(guardar).not.toHaveBeenCalled()
  })

  it('sin el primer recálculo se entrega pero no se guarda', async () => {
    armar.mockResolvedValue({ ok: true, data: { bytes: BYTES, guardable: false } })
    const r = await pedir()
    expect(r.status).toBe(200)
    expect(guardar).not.toHaveBeenCalled()
  })

  it('un PT409 o un fallo al guardar no cambian la respuesta', async () => {
    guardar.mockResolvedValue({ ok: true, data: { guardada: false } })
    expect((await pedir()).status).toBe(200)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    guardar.mockResolvedValue(fallo('inesperado'))
    const r = await pedir()
    expect(r.status).toBe(200)
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(BYTES)
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })

  it('si armarla falla es 500 (nunca una vieja); si la hoja no se ve, 404', async () => {
    leerPortada.mockResolvedValue(estado({ clave: 'p1-vieja' }))
    armar.mockResolvedValue(fallo('inesperado'))
    const r = await pedir()
    expect(r.status).toBe(500)
    expect(await r.text()).toBe(NO_SE_PUDO)
    expect(bajar).not.toHaveBeenCalled()
    armar.mockResolvedValue(fallo('sin_permiso'))
    expect((await pedir()).status).toBe(404)
  })
})

describe('GET /cotizaciones/[id]/portada: la propia', () => {
  const sinVerTodo = estado({ veTodo: false, puedeGuardarla: false, contexto: null })

  it('quien no ve todo lo que dibuja la compartida recibe una armada con lo suyo: sin ETag, sin guardar y sin el cliente si no tiene leads.ver', async () => {
    leerPortada.mockResolvedValue(sinVerTodo)
    const r = await pedir(ID, { 'If-None-Match': `"${CLAVE}"` })
    expect(r.status).toBe(200)
    expect(r.headers.get('etag')).toBeNull()
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(contextoArmado).toEqual({
      cliente: null,
      vehiculo: { titulo: 'Toyota Hilux 2020', lote: '4455', vin: null },
      asesor: 'Ana Pérez',
    })
    expect(leerCliente).not.toHaveBeenCalled()
    expect(leerVehiculo).toHaveBeenCalledWith(VEHICULO)
    expect(guardar).not.toHaveBeenCalled()
    expect(bajar).not.toHaveBeenCalled()
  })

  it('con leads.ver nombra al cliente que ve; si una lectura falla, sale sin ese dato', async () => {
    leerPortada.mockResolvedValue(sinVerTodo)
    sesion.mockResolvedValue({
      ...activa,
      permisos: [{ clave: 'leads.ver', origenId: null, alcance: 'todos' }],
    })
    leerVehiculo.mockResolvedValue(fallo('inesperado'))
    await pedir()
    expect(leerCliente).toHaveBeenCalledWith(LEAD)
    expect(contextoArmado).toEqual({ cliente: 'Juan Pérez', vehiculo: null, asesor: 'Ana Pérez' })
  })

  it('con «Ver como» también: la guardada no se baja ni se guarda, aunque vea todo', async () => {
    leerPortada.mockResolvedValue(estado())
    sesion.mockResolvedValue({
      ...activa,
      perspectiva: {
        disponible: true,
        rol: { id: LEAD, nombre: 'Asesor', color: null },
        roles: [],
      },
    })
    const r = await pedir(ID, { 'If-None-Match': `"${CLAVE}"` })
    expect(r.status).toBe(200)
    expect(r.headers.get('etag')).toBeNull()
    expect(bajar).not.toHaveBeenCalled()
    expect(guardar).not.toHaveBeenCalled()
    expect(contextoArmado).not.toEqual(COMPARTIDO)
  })
})

describe('GET /cotizaciones/[id]/portada?ancho=480: la miniatura de las listas', () => {
  it('la guardada se achica con la ETag de la miniatura; 304 sólo con la suya', async () => {
    leerPortada.mockResolvedValue(estado())
    const r = await pedir(ID, {}, '?ancho=480')
    expect([r.status, r.headers.get('etag')]).toEqual([200, `"${CLAVE}-480"`])
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(CHICA)
    expect(achicar).toHaveBeenCalledWith(GUARDADOS, 480)
    expect((await pedir(ID, { 'If-None-Match': `"${CLAVE}-480"` }, '?ancho=480')).status).toBe(304)
    expect((await pedir(ID, { 'If-None-Match': `"${CLAVE}"` }, '?ancho=480')).status).toBe(200)
  })

  it('recién armada guarda la grande y entrega la miniatura; otro ancho da la grande; sin achicar, 500', async () => {
    leerPortada.mockResolvedValue(estado({ ruta: null, clave: null }))
    expect(new Uint8Array(await (await pedir(ID, {}, '?ancho=480')).arrayBuffer())).toEqual(CHICA)
    expect(guardar).toHaveBeenCalledWith({ id: ID, bytes: BYTES, clave: CLAVE })
    leerPortada.mockResolvedValue(estado())
    achicar.mockClear()
    expect((await pedir(ID, {}, '?ancho=999')).headers.get('etag')).toBe(`"${CLAVE}"`)
    expect(achicar).not.toHaveBeenCalled()
    achicar.mockResolvedValue({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect((await pedir(ID, {}, '?ancho=480')).status).toBe(500)
  })
})
