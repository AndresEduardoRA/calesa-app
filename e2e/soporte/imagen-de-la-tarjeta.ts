// Lo que prepara y mide `e2e/cotizaciones-imagen-de-la-tarjeta.spec.ts` (`docs/COTIZADOR.md` › «La imagen de la tarjeta»): la réplica de V1 con las cuatro
// celdas del asesor, el perfil de quien comparte (WhatsApp, cargo y foto en `avatares`) y la cuenta de las miniaturas que la lista pide a la vez.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import type { Locator, Page, Request, TestInfo } from '@playwright/test'
import { expect } from './prueba'
import { CONTRASENA } from './alta'
import { admin, correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { NO_DISPONIBLE } from './cotizar-pdf'
import { anotar } from './cotizar-vista-previa'
import { literal, sql } from './sql'

type Celda = { id: string; contenido: Record<string, unknown>; estilo?: Record<string, unknown> }
type Plantilla = { celdas: Celda[] } & Record<string, unknown>

const REPLICA = JSON.parse(
  readFileSync('src/modules/cotizaciones/entities/tarjeta/plantilla-como-v1-usa.json', 'utf8'),
) as Plantilla

// Las celdas de arriba a la derecha pasan a decir quién es el asesor: la foto donde decía «Asesor:», el nombre donde iban las iniciales y el WhatsApp y el
// cargo en las dos cabeceras de la fila del título. Sin mover la grilla.
const DEL_ASESOR: Record<string, Pick<Celda, 'contenido' | 'estilo'>> = {
  asesor: { contenido: { tipo: 'foto_del_asesor' }, estilo: { alinear: 'derecha' } },
  iniciales: {
    contenido: { tipo: 'dato', variable: 'asesor_nombre' },
    estilo: { negrita: true, tamano: 11, alinear: 'centro' },
  },
  cab_tc: {
    contenido: { tipo: 'dato', variable: 'asesor_telefono' },
    estilo: { tamano: 11, alinear: 'centro' },
  },
  cab_plazo: {
    contenido: { tipo: 'dato', variable: 'asesor_cargo' },
    estilo: { tamano: 11, alinear: 'centro' },
  },
}

// La réplica con el asesor y, si se pide, otra nota al pie (otra plantilla publicada: otra huella).
export function plantillaConElAsesor(nota?: string): Plantilla {
  return {
    ...REPLICA,
    celdas: REPLICA.celdas.map((c) => {
      const delAsesor = DEL_ASESOR[c.id]
      if (delAsesor !== undefined) return { ...c, ...delAsesor }
      if (nota !== undefined && c.id === 'nota')
        return { ...c, contenido: { tipo: 'texto', texto: nota } }
      return c
    }),
  }
}

// El WhatsApp, el cargo y la foto de quien comparte, como los deja «Mi perfil»: la foto en `avatares/<id>/<hash>.webp`. Devuelve la ruta, para quitarla al final.
export async function ponerElPerfilDelAsesor(
  usuarioId: string,
  perfil: { telefono: string; cargo: string },
): Promise<string> {
  const datos = await sharp({
    create: { width: 96, height: 96, channels: 3, background: '#0a7f3c' },
  })
    .webp()
    .toBuffer()
  const ruta = `${usuarioId}/${createHash('sha256').update(datos).digest('hex')}.webp`
  const subida = await admin()
    .storage.from('avatares')
    .upload(ruta, datos, { contentType: 'image/webp', upsert: true })
  expect(subida.error).toBeNull()
  sql(`update public.perfiles set whatsapp_web = ${literal(perfil.telefono)}, cargo_web = ${literal(perfil.cargo)},
    avatar_ruta = ${literal(ruta)} where id = ${literal(usuarioId)}::uuid`)
  return ruta
}

export async function quitarLaFoto(ruta: string): Promise<void> {
  if (ruta !== '') await admin().storage.from('avatares').remove([ruta])
}

const MINIATURA = /\/cotizaciones\/([0-9a-f-]{36})\/imagen\?ancho=480/

// Las miniaturas que pide la página: cuáles, cuántas en vuelo ahora y el máximo que hubo a la vez (de la red: el pedido sale y termina antes que el `onLoad`
// que suelta el turno); y, desde `fase()`, los bytes que bajaron y el estado de cada respuesta (al volver, el navegador revalida con su ETag).
export function vigilarLasMiniaturas(page: Page) {
  const pedidas = new Set<string>()
  let enVuelo = 0
  let maximo = 0
  let fase = { bytes: 0, estados: [] as number[] }
  page.on('request', (r) => {
    const id = MINIATURA.exec(r.url())?.[1]
    if (id === undefined) return
    pedidas.add(id)
    enVuelo += 1
    maximo = Math.max(maximo, enVuelo)
  })
  const terminar = (r: Request, terminado: boolean) => {
    if (!MINIATURA.test(r.url())) return
    enVuelo -= 1
    if (!terminado) return
    const deEstaFase = fase
    void r.sizes().then((t) => (deEstaFase.bytes += t.responseBodySize))
    void r.response().then((res) => deEstaFase.estados.push(res?.status() ?? 0))
  }
  page.on('requestfinished', (r) => terminar(r, true))
  page.on('requestfailed', (r) => terminar(r, false))
  return {
    pedidas,
    enVuelo: () => enVuelo,
    maximo: () => maximo,
    // Empieza otra fase y devuelve lo de la anterior.
    fase: () => {
      const anterior = fase
      fase = { bytes: 0, estados: [] }
      return anterior
    },
  }
}

// Las tarjetas de la lista por su lugar en la ventana: todas, las enteras a la vista (y cuántas de ellas ya tienen la miniatura cargada).
export function tarjetasALaVista(page: Page) {
  return page.evaluate(() => {
    const marcos = [...document.querySelectorAll('[data-imagen-de-la-tarjeta]')]
    let dentro = 0
    let cargadas = 0
    for (const marco of marcos) {
      const caja = marco.getBoundingClientRect()
      if (caja.top < 0 || caja.bottom > window.innerHeight) continue
      dentro += 1
      const img = marco.querySelector('img[data-imagen]')
      if (img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0) cargadas += 1
    }
    return { total: marcos.length, dentro, cargadas }
  })
}

export type VigiaDeLasMiniaturas = ReturnType<typeof vigilarLasMiniaturas>

// El ancho de una imagen ya cargada; 0 mientras carga o si todavía no está.
export const anchoCargado = (img: Locator): Promise<number> =>
  img.evaluate((el: HTMLImageElement) => (el.complete ? el.naturalWidth : 0)).catch(() => 0)

// La lista asentada: las tarjetas enteras a la vista con su miniatura cargada y ninguna en vuelo.
export const esperarLaListaAsentada = (page: Page, vigia: VigiaDeLasMiniaturas) =>
  expect
    .poll(
      async () => {
        const vista = await tarjetasALaVista(page)
        return vista.dentro > 0 && vista.cargadas === vista.dentro && vigia.enVuelo() === 0
      },
      { timeout: 60_000 },
    )
    .toBe(true)

// Un paso de `Server-Timing` (`huella;dur=12, armar;dur=180`), en ms; 0 si no vino.
const duracion = (cabecera: string | undefined, paso: string): number =>
  Number(new RegExp(`(?:^|,)\\s*${paso};dur=(\\d+)`).exec(cabecera ?? '')?.[1] ?? 0)
const mediana = (valores: number[]) => [...valores].sort((a, b) => a - b)[valores.length >> 1] ?? 0

// La miniatura y la grande de una cotización: WebP de su ancho con la ETag de quien pide, que repetida da 304 sin cuerpo. Anota el peso, la mediana de cinco
// armados y la huella del 304, de su `Server-Timing` (para `docs/RENDIMIENTO.md`).
export async function exigirLaImagenConSu304(page: Page, info: TestInfo, id: string) {
  for (const [ancho, consulta] of [
    [480, '?ancho=480'],
    [1600, ''],
  ] as const) {
    const ruta = `/cotizaciones/${id}/imagen${consulta}`
    const armados: number[] = []
    let respuesta = await page.request.get(ruta)
    for (let i = 0; i < 5; i += 1) {
      if (i > 0) respuesta = await page.request.get(ruta)
      expect(respuesta.status()).toBe(200)
      armados.push(duracion(respuesta.headers()['server-timing'], 'armar'))
    }
    const cabeceras = respuesta.headers()
    expect(cabeceras['content-type']).toBe('image/webp')
    expect(cabeceras['cache-control']).toBe('private, no-cache')
    const cuerpo = await respuesta.body()
    expect((await sharp(cuerpo).metadata()).width).toBeLessThanOrEqual(ancho)
    anotar(info, `bytes de la imagen a ${String(ancho)}`, cuerpo.length)
    anotar(info, `ms del armado a ${String(ancho)} (mediana de 5)`, mediana(armados))
    const igual = await page.request.get(ruta, {
      headers: { 'if-none-match': cabeceras['etag'] ?? '' },
    })
    expect(igual.status()).toBe(304)
    expect((await igual.body()).length).toBe(0)
    anotar(
      info,
      `ms de la huella del 304 a ${String(ancho)}`,
      duracion(igual.headers()['server-timing'], 'huella'),
    )
  }
}

// El 404 en texto del PDF: lo mismo para lo que no existe, lo que no se ve y lo que está en la papelera.
export async function exigirElMismo404(page: Page, ruta: string) {
  const respuesta = await page.request.get(ruta)
  expect(respuesta.status(), ruta).toBe(404)
  expect(respuesta.headers()['content-type']).toMatch(/^text\/plain/)
  expect(await respuesta.text()).toBe(NO_DISPONIBLE)
}

// Una persona que ve vehículos y ninguna cotización.
export async function crearSinCotizaciones(proyecto: string): Promise<string> {
  const email = correoDePrueba(`sin-cotizaciones-imagen-${proyecto}`)
  await crearPersona({ email, contrasena: CONTRASENA, nombre: 'Sara Sinver', invitada: true })
  await darRolDePrueba({
    email,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sin cotizaciones`, clave: 'e2e_sin_cotizaciones_imagen' },
    permisos: ['vehiculos.ver'],
  })
  return email
}
