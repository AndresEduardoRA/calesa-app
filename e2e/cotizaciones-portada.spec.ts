import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { tipearEnLaHoja } from './soporte/cotizar-guardar'
import { guardarLaHojaAbierta, mandarALaPapelera, NO_DISPONIBLE } from './soporte/cotizar-pdf'
import { abrirLaHoja, alDia } from './soporte/cotizar-vista-previa'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { crearOrigenDePrueba, PREFIJO_CLAVE_E2E } from './soporte/origenes'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import {
  copiarLaFormulaDeLaSubasta,
  crearVehiculo,
  publicarComoLaDuena,
  urlDeLaHoja,
} from './soporte/tarjeta-cuadricula'

// La portada de la cotización (`docs/COTIZADOR.md` › «La imagen de la tarjeta»): guardar la arma y la guarda; `GET /cotizaciones/<id>/portada` la da en WebP
// de hasta 1.600 px con su ETag, y el resumen del listado la muestra y la abre en el visor; publicar otra plantilla la rehace; en Modo Live se ve borrosa y sin
// visor; sin permiso o en la papelera, el 404 del PDF. Un origen propio con la fórmula de la subasta y la réplica de V1 publicada: nunca la plantilla de la semilla.
test.describe.configure({ mode: 'serial' })

const RAIZ = 'portada_'
const REPLICA = JSON.parse(
  readFileSync('src/modules/cotizaciones/entities/tarjeta/plantilla-como-v1-usa.json', 'utf8'),
) as { celdas: { id: string; contenido: Record<string, unknown> }[] }

let duena = ''
let lead = ''
let origen = ''
let vehiculo = ''
let sinClave = ''
let guardada = ''

const rutaDeLaPortada = (id: string) => `/cotizaciones/${id}/portada`
const claveGuardada = (id: string) =>
  sql(
    `select coalesce(clave, '') from public.cotizaciones_portadas where cotizacion_id = ${literal(id)}::uuid`,
  )
const numeroDe = (id: string) =>
  sql(`select numero from public.cotizaciones where id = ${literal(id)}::uuid`)
const portadaDelResumen = (page: Page) =>
  page.getByRole('dialog').getByAltText(`Vista previa de la cotización n.º ${numeroDe(guardada)}`)

function borrarLoDeEsteSpec(): void {
  const mios = `select id from public.origenes where clave like '${PREFIJO_CLAVE_E2E}${RAIZ}%'`
  sql(`
    delete from public.cotizaciones where origen_id in (${mios});
    delete from public.vehiculos where origen_id in (${mios});
    delete from public.origenes where id in (${mios})`)
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  const proyecto = info.project.name
  borrarLoDeEsteSpec()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-portada-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Paula Portada' })
  lead = await crearLead({
    nombre: `portada ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  origen = (
    await crearOrigenDePrueba(`E2E portada ${proyecto}`, `${RAIZ}${proyecto}`, { tipo: 'subasta' })
  ).id
  copiarLaFormulaDeLaSubasta(origen)
  vehiculo = await crearVehiculo(origen, `Portada Hilux ${proyecto}`)
  await publicarComoLaDuena(duena, origen, REPLICA)
  sinClave = correoDePrueba(`sin-cotizaciones-portada-${proyecto}`)
  await crearPersona({
    email: sinClave,
    contrasena: CONTRASENA,
    nombre: 'Sara Sinver',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinClave,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sin cotizaciones`, clave: `e2e_sin_cotizaciones_portada` },
    permisos: ['vehiculos.ver'],
  })
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  borrarLoDeEsteSpec()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E guardar arma la portada: la ruta la da en WebP de hasta 1.600 px con su ETag, y el resumen la muestra y la abre en el visor', async ({
  page,
}, info) => {
  await abrirLaHoja(page, duena, urlDeLaHoja(origen, lead, vehiculo))
  await tipearEnLaHoja(page, 'remate', '9500')
  await alDia(page)
  guardada = await guardarLaHojaAbierta(page)
  // La pide el área de la tarjeta al guardar, sin que nadie la espere: queda anotada sola.
  await expect
    .poll(() => claveGuardada(guardada), { timeout: 20_000 })
    .toMatch(/^p\d+-[0-9a-f]{32}$/)
  const clave = claveGuardada(guardada)

  const respuesta = await page.request.get(rutaDeLaPortada(guardada))
  expect(respuesta.status()).toBe(200)
  const cabeceras = respuesta.headers()
  expect(cabeceras['content-type']).toBe('image/webp')
  expect(cabeceras['etag']).toBe(`"${clave}"`)
  expect(cabeceras['cache-control']).toBe('private, no-cache')
  const cuerpo = await respuesta.body()
  expect(cuerpo.subarray(0, 4).toString('latin1')).toBe('RIFF')
  expect(cuerpo.subarray(8, 12).toString('latin1')).toBe('WEBP')
  const { width, format } = await sharp(cuerpo).metadata()
  expect(format).toBe('webp')
  expect(width).toBeLessThanOrEqual(1600)
  info.annotations.push({ type: 'bytes de la portada', description: String(cuerpo.length) })
  console.warn(`[medido] bytes de la portada: ${String(cuerpo.length)}`)
  // Con la ETag de hoy, 304 sin cuerpo.
  const igual = await page.request.get(rutaDeLaPortada(guardada), {
    headers: { 'If-None-Match': `"${clave}"` },
  })
  expect(igual.status()).toBe(304)

  await page.goto(`/cotizaciones?cotizacion=${guardada}`)
  const portada = portadaDelResumen(page)
  await expect(portada).toBeVisible()
  await expect
    .poll(() => portada.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0)
  await capturar(page, info, 'resumen-con-la-portada')
  await page
    .getByRole('button', { name: /^Ver la vista previa de la cotización n\.º \d+ en grande$/ })
    .click()
  const visor = page.locator('[data-visor-de-imagenes]')
  await expect(visor).toBeVisible()
  await capturar(page, info, 'visor-de-la-portada')
  await page.keyboard.press('Escape')
  await expect(visor).toBeHidden()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('E2E publicar otra plantilla rehace la portada: otra ETag, otra imagen y la fila al día', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const antes = await page.request.get(rutaDeLaPortada(guardada))
  const claveVieja = claveGuardada(guardada)
  const bytesViejos = await antes.body()
  const otra = structuredClone(REPLICA)
  const asesor = otra.celdas.find((c) => c.id === 'asesor')
  if (asesor === undefined) throw new Error('La réplica no tiene la celda del asesor.')
  asesor.contenido = { tipo: 'texto', texto: 'Asesora comercial:' }
  await publicarComoLaDuena(duena, origen, otra)

  const despues = await page.request.get(rutaDeLaPortada(guardada), {
    headers: { 'If-None-Match': `"${claveVieja}"` },
  })
  expect(despues.status()).toBe(200)
  const etiqueta = despues.headers()['etag'] ?? ''
  expect(etiqueta).toMatch(/^"p\d+-[0-9a-f]{32}"$/)
  expect(etiqueta).not.toBe(`"${claveVieja}"`)
  expect(Buffer.compare(await despues.body(), bytesViejos)).not.toBe(0)
  // Quien la pidió puede guardarla: la ruta la anotó antes de responder.
  expect(`"${claveGuardada(guardada)}"`).toBe(etiqueta)
})

test('E2E en Modo Live la portada se ve borrosa con «Oculto en Modo Live» y el clic no abre el visor', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.addInitScript(() => {
    window.localStorage.setItem('modo-live', '1')
  })
  await page.goto(`/cotizaciones?cotizacion=${guardada}`)
  await expect(page.locator('html')).toHaveClass(/\blive\b/)
  const portada = portadaDelResumen(page)
  await expect
    .poll(() => portada.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0)
  await expect(page.getByRole('dialog').getByText('Oculto en Modo Live')).toBeVisible()
  expect(await portada.evaluate((img) => getComputedStyle(img).filter)).toContain('blur')
  await capturar(page, info, 'portada-en-modo-live')
  const boton = page.getByRole('button', {
    name: /^Ver la vista previa de la cotización n\.º \d+ en grande$/,
  })
  await expect(boton).toBeDisabled()
  await boton.click({ force: true })
  await expect(page.locator('[data-visor-de-imagenes]')).toHaveCount(0)
})

test('E2E sin permiso o en la papelera, la ruta da el mismo 404 en texto que el PDF', async ({
  page,
}) => {
  await entrar(page, sinClave, { fresco: true })
  const ajena = await page.request.get(rutaDeLaPortada(guardada))
  expect(ajena.status()).toBe(404)
  expect(ajena.headers()['content-type']).toMatch(/^text\/plain/)
  expect(await ajena.text()).toBe(NO_DISPONIBLE)

  await page.context().clearCookies()
  await entrar(page, duena, { fresco: true })
  mandarALaPapelera(guardada)
  const enLaPapelera = await page.request.get(rutaDeLaPortada(guardada))
  expect(enLaPapelera.status()).toBe(404)
  expect(await enLaPapelera.text()).toBe(NO_DISPONIBLE)
})
