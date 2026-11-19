import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { literal, sql } from './soporte/sql'

// «Cotizaciones de este vehículo» en la ficha del vehículo (`docs/UX.md` › «Vehículo»): la ven quienes tienen `cotizaciones.ver` en el origen del vehículo; la isla
// «De este vehículo» lee desde el navegador al acercarse, de a 10 por cursor hasta 100, y en el tope dice «Ver todas en Cotizaciones» (el camino a lo antiguo). Con la
// RLS de quien mira.

// Presupuestos (`docs/RENDIMIENTO.md`): la primera respuesta, la de «De este vehículo» (`cotizaciones-de-este-vehiculo.spec.ts`: 5.250 B); los nodos de la lista con
// 10 y con 100, con las casillas de «Comparar»: medidos 191 y 1.901 en los dos proyectos, más un 5 %.
const TOPE_DE_BYTES = 5_250
const TOPE_DE_NODOS_CON_10 = 201
const TOPE_DE_NODOS_CON_100 = 1_997

let origen = { id: '', nombre: '' }
let duena = ''
let sinClave = ''
let ana = ''
const vehiculos: Record<'veintidos' | 'cientodiez' | 'ninguna' | 'propios', string> = {
  veintidos: '',
  cientodiez: '',
  ninguna: '',
  propios: '',
}

function crearVehiculo(titulo: string): string {
  sql(
    `insert into public.vehiculos (origen_id, titulo) values (${literal(origen.id)}::uuid, ${literal(titulo)})`,
  )
  return sql(
    `select id from public.vehiculos where origen_id = ${literal(origen.id)}::uuid and titulo = ${literal(titulo)}`,
  )
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena } = await prepararGuardado(proyecto, 'vehcotiz'))
  sinClave = correoDePrueba(`sinclave-vehcotiz-${proyecto}`)
  await crearPersona({
    email: sinClave,
    contrasena: CONTRASENA,
    nombre: 'Sin Clave',
    invitada: true,
  })
  // Ve el vehículo («todos» en el origen) y no tiene cotizaciones.ver.
  await darRolDePrueba({
    email: sinClave,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ficha sin cotizaciones`,
      clave: 'e2e_ficha_sin_cotizaciones',
    },
    permisos: ['vehiculos.ver'],
  })
  ana = correoDePrueba(`ana-vehcotiz-${proyecto}`)
  await crearPersona({ email: ana, contrasena: CONTRASENA, nombre: 'Ana Propios', invitada: true })
  await darRolDePrueba({
    email: ana,
    rol: { nombre: `${PREFIJO_ROL_E2E}Ficha propios`, clave: 'e2e_ficha_propios' },
    permisos: [
      'vehiculos.ver',
      { clave: 'cotizaciones.ver', origenId: origen.id, alcance: 'propios' },
    ],
  })
  const deLaDuena = idDePersona(duena)
  const deAna = idDePersona(ana)
  vehiculos.veintidos = crearVehiculo('Pestaña veintidós')
  vehiculos.cientodiez = crearVehiculo('Pestaña ciento diez')
  vehiculos.ninguna = crearVehiculo('Pestaña ninguna')
  vehiculos.propios = crearVehiculo('Pestaña propios')
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.veintidos,
    creadoPor: deLaDuena,
    cuantas: 22,
  })
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.cientodiez,
    creadoPor: deLaDuena,
    cuantas: 110,
  })
  // Del vehículo compartido: dos de la dueña y una de Ana (la más vieja).
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.propios,
    creadoPor: deLaDuena,
    cuantas: 2,
  })
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.propios,
    creadoPor: deAna,
    cuantas: 1,
    desde: 2,
  })
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

// El índice de la ficha (un enlace por bloque que quien mira ve) y el bloque «Cotizaciones de este vehículo».
const indice = (page: Page): Locator =>
  page.getByRole('navigation', { name: 'Índice de la ficha' }).getByRole('link')
const bloque = (page: Page): Locator =>
  page.getByRole('region', { name: 'Cotizaciones de este vehículo', exact: true })
const titulo = (page: Page): Locator =>
  bloque(page).getByRole('heading', { name: 'Cotizaciones de este vehículo', level: 2 })
const lista = (page: Page): Locator =>
  page.getByRole('list', { name: 'Cotizaciones de este vehículo' })
const filas = (page: Page): Locator => lista(page).locator('[data-de-este-vehiculo]')
const esLectura = (url: string) => url.includes('/rpc/cotizaciones_de_este_vehiculo')

// Los pedidos del navegador a «De este vehículo» (el bloque lee desde el navegador al acercarse; el servidor no lee cotizaciones para la derecha de la ficha).
function vigilarLecturas(page: Page): string[] {
  const lecturas: string[] = []
  page.on('request', (pedido) => {
    if (esLectura(pedido.url()) && pedido.method() === 'POST') {
      lecturas.push(pedido.url())
    }
  })
  return lecturas
}

test('E2E la dueña: lejos del bloque no se lee nada; al saltar llegan 10 y «Ver más» lleva a 22', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  // Una ventana angosta y baja: la ficha va en una columna y el bloque, bajo la cabecera, queda lejos de la vista al llegar.
  const ancho = Math.min(page.viewportSize()?.width ?? 600, 600)
  await page.setViewportSize({ width: ancho, height: 320 })
  const lecturas = vigilarLecturas(page)
  await page.goto(`/vehiculos/${vehiculos.veintidos}`)
  await expect(indice(page)).toHaveText(['Cotizaciones', 'Relacionados', 'Actividad', 'Vitrina'])
  await expect(page.getByRole('navigation', { name: 'Índice de la ficha' })).toHaveAttribute(
    'data-hidratado',
    'true',
  )
  expect(lecturas).toEqual([])

  const respuesta = page.waitForResponse(
    (r) => esLectura(r.url()) && r.request().method() === 'POST',
  )
  await indice(page).getByText('Cotizaciones').click()
  await expect(titulo(page)).toBeFocused()
  const bytes = (await (await respuesta).body()).length
  await expect(filas(page)).toHaveCount(10)
  expect(lecturas).toHaveLength(1)
  const nodos = await lista(page).evaluate((e) => e.querySelectorAll('*').length + 1)
  const medido = `nodos con 10: ${String(nodos)}, bytes: ${String(bytes)}`
  console.warn(`[cotizaciones de este vehículo] ${test.info().project.name}: ${medido}`)
  test.info().annotations.push({ type: 'medido', description: medido })
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS_CON_10)
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES)

  const masNueva = sql(
    `select numero from public.cotizaciones where vehiculo_id = ${literal(vehiculos.veintidos)}::uuid order by creado_en desc, id desc limit 1`,
  )
  await expect(filas(page).first()).toContainText(`N.º ${masNueva}`)
  await expect(filas(page).first()).toContainText('Gala Guarda')
  for (const ronda of [20, 22]) {
    await bloque(page).getByRole('button', { name: 'Ver más' }).click()
    await expect(filas(page)).toHaveCount(ronda)
  }
  await expect(bloque(page).getByRole('button', { name: 'Ver más' })).toHaveCount(0)
  expect(lecturas).toHaveLength(3)
})

test('E2E con 110: «Ver más» llega a 100, dice el tope y «Ver todas en Cotizaciones» lleva al listado', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const tamanos: number[] = []
  page.on('response', (r) => {
    if (esLectura(r.url()) && r.request().method() === 'POST') {
      void r.body().then((cuerpo) => tamanos.push(cuerpo.length))
    }
  })
  await page.goto(`/vehiculos/${vehiculos.cientodiez}?seccion=cotizaciones`)
  await expect(filas(page)).toHaveCount(10)
  for (let ronda = 2; ronda <= 10; ronda += 1) {
    await bloque(page).getByRole('button', { name: 'Ver más' }).click()
    await expect(filas(page)).toHaveCount(10 * ronda)
  }
  await expect(bloque(page).getByRole('button', { name: 'Ver más' })).toHaveCount(0)
  await expect(page.getByText('Mostrando las 100 más recientes.')).toBeVisible()
  const nodos = await lista(page).evaluate((e) => e.querySelectorAll('*').length + 1)
  const primera = tamanos[0] ?? 0
  const decima = tamanos[9] ?? Number.POSITIVE_INFINITY
  const medido = `nodos con 100: ${String(nodos)}, bytes de la 1.ª: ${String(primera)}, de la 10.ª: ${String(decima)}`
  console.warn(`[cotizaciones de este vehículo] ${test.info().project.name}: ${medido}`)
  test.info().annotations.push({ type: 'medido', description: medido })
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS_CON_100)
  expect(tamanos.length).toBeGreaterThanOrEqual(10)
  expect(decima).toBeLessThanOrEqual(primera * 1.05)
  const camino = page.getByRole('link', { name: 'Ver todas en Cotizaciones' })
  await expect(camino).toHaveAttribute('href', `/cotizaciones?vehiculo=${vehiculos.cientodiez}`)
  await camino.click()
  await expect(page).toHaveURL(/\/cotizaciones\?vehiculo=/)
  // Las de un solo vehículo no se agrupan, y el aviso lo dice (la lista nace agrupada: T319).
  await expect(page.getByText('Cotizaciones de Pestaña ciento diez, sin agrupar.')).toBeVisible()
})

test('E2E sin cotizaciones.ver no hay bloque ni entrada en el índice y ?seccion=cotizaciones se queda arriba', async ({
  page,
}) => {
  await entrar(page, sinClave, { fresco: true })
  const lecturas = vigilarLecturas(page)
  await page.goto(`/vehiculos/${vehiculos.propios}?seccion=cotizaciones`)
  await expect(indice(page).getByText('Vitrina')).toBeVisible()
  await expect(indice(page).getByText('Cotizaciones')).toHaveCount(0)
  await expect(bloque(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Pestaña propios', level: 1 })).toBeInViewport()
  expect(lecturas).toEqual([])
})

test('E2E con «propios» el bloque está y lista sólo la suya (la RLS decide las filas)', async ({
  page,
}) => {
  await entrar(page, ana, { fresco: true })
  await page.goto(`/vehiculos/${vehiculos.propios}`)
  await expect(indice(page).getByText('Cotizaciones')).toBeVisible()
  await indice(page).getByText('Cotizaciones').click()
  await expect(filas(page)).toHaveCount(1)
  await expect(filas(page).first()).toContainText('Ana Propios')
  await expect(lista(page)).not.toContainText('Gala Guarda')
})

test('E2E un vehículo sin cotizaciones: llegar a su bloque por la URL dice que no hay', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/vehiculos/${vehiculos.ninguna}?seccion=cotizaciones`)
  await expect(titulo(page)).toBeFocused()
  await expect(page.getByText('Sin cotizaciones que puedas ver.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Sin cotizaciones que puedas ver.')).toBeVisible()
})
