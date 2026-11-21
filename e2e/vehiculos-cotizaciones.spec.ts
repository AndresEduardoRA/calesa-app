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
import { capturar } from './soporte/recorrido'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { literal, sql } from './soporte/sql'

// Presupuestos de la fila de 10 tarjetas (`docs/RENDIMIENTO.md`): medidos en los dos proyectos (375 nodos, 4.884 B) más un 5 %.
const TOPE_DE_NODOS_CON_10 = 395
const TOPE_DE_BYTES = 5_150

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
const tarjetas = (page: Page): Locator => lista(page).locator('article')
const verMas = (page: Page): Locator => bloque(page).getByRole('link', { name: 'Ver más' })
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

test('E2E la dueña: lejos del bloque no se lee nada; al saltar llegan las últimas 10 como tarjetas y «Ver más» lleva al listado del vehículo', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  // Una ventana angosta y baja: la ficha va en una columna y el bloque, bajo la cabecera, queda lejos de la vista al llegar.
  const ancho = Math.min(page.viewportSize()?.width ?? 600, 600)
  await page.setViewportSize({ width: ancho, height: 320 })
  const lecturas = vigilarLecturas(page)
  await page.goto(`/vehiculos/${vehiculos.veintidos}`)
  await expect(indice(page)).toHaveText(['Cotizaciones', 'Relacionados', 'Actividad'])
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
  await expect(tarjetas(page)).toHaveCount(10)
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
  await expect(tarjetas(page).first()).toContainText(`N.º ${masNueva}`)
  await expect(tarjetas(page).first()).toContainText('Gala Guarda')
  await capturar(page, info, 'vehiculo-tarjetas')
  // Con 22 no hay otra lectura: el camino a las demás es el listado filtrado por el vehículo, en la última tarjeta.
  await expect(verMas(page)).toHaveAttribute(
    'href',
    `/cotizaciones?vehiculo=${vehiculos.veintidos}`,
  )
  await lista(page).evaluate((e) => {
    e.scrollLeft = e.scrollWidth
  })
  await expect(verMas(page)).toBeInViewport()
  await verMas(page).click()
  await expect(page).toHaveURL(/\/cotizaciones\?vehiculo=/)
  // Las de un solo vehículo no se agrupan, y el aviso lo dice (la lista nace agrupada: T319).
  await expect(page.getByText('Cotizaciones de Pestaña veintidós, sin agrupar.')).toBeVisible()
  expect(lecturas).toHaveLength(1)
})

test('E2E con 110 sigue siendo una lectura de 10 y la fila no crece: «Ver más» es el camino a las demás', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const lecturas = vigilarLecturas(page)
  await page.goto(`/vehiculos/${vehiculos.cientodiez}?seccion=cotizaciones`)
  await expect(tarjetas(page)).toHaveCount(10)
  await expect(verMas(page)).toHaveAttribute(
    'href',
    `/cotizaciones?vehiculo=${vehiculos.cientodiez}`,
  )
  expect(lecturas).toHaveLength(1)
})

test('E2E sin cotizaciones.ver no hay bloque ni entrada en el índice y ?seccion=cotizaciones se queda arriba', async ({
  page,
}) => {
  await entrar(page, sinClave, { fresco: true })
  const lecturas = vigilarLecturas(page)
  await page.goto(`/vehiculos/${vehiculos.propios}?seccion=cotizaciones`)
  await expect(page.getByRole('heading', { name: 'Pestaña propios', level: 1 })).toBeInViewport()
  // Sin ninguno de los bloques de ventas, la derecha no tiene índice.
  await expect(indice(page)).toHaveCount(0)
  await expect(bloque(page)).toHaveCount(0)
  expect(lecturas).toEqual([])
})

test('E2E con «propios» el bloque está y muestra sólo la suya (la RLS decide las tarjetas)', async ({
  page,
}) => {
  await entrar(page, ana, { fresco: true })
  await page.goto(`/vehiculos/${vehiculos.propios}`)
  await expect(indice(page).getByText('Cotizaciones')).toBeVisible()
  await indice(page).getByText('Cotizaciones').click()
  await expect(tarjetas(page)).toHaveCount(1)
  await expect(tarjetas(page).first()).toContainText('Ana Propios')
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

test('E2E una tarjeta abre el resumen sobre la ficha, queda marcada, y cerrarlo deja la ficha', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/vehiculos/${vehiculos.propios}`)
  await indice(page).getByText('Cotizaciones').click()
  await expect(tarjetas(page)).toHaveCount(3)
  const primera = tarjetas(page).first()
  const numero = sql(
    `select numero from public.cotizaciones where vehiculo_id = ${literal(vehiculos.propios)}::uuid order by creado_en desc, id desc limit 1`,
  )
  await primera.getByRole('button', { name: `Abrir N.º ${numero}` }).click()
  const drawer = page.getByRole('dialog', { name: `Cotización n.º ${numero}` })
  await expect(drawer).toBeVisible()
  // Con el resumen abierto la ficha queda detrás (inerte): la tarjeta se halla aunque no sea accesible.
  await expect(
    page
      .getByRole('list', { name: 'Cotizaciones de este vehículo', includeHidden: true })
      .locator('article')
      .first(),
  ).toHaveAttribute('data-state', 'selected')
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`/vehiculos/${vehiculos.propios}$`))
  await expect(tarjetas(page)).toHaveCount(3)
})

test('E2E «Compartir» de una tarjeta abre su panel sin abrir el resumen', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/vehiculos/${vehiculos.propios}`)
  await indice(page).getByText('Cotizaciones').click()
  await expect(tarjetas(page)).toHaveCount(3)
  await tarjetas(page).first().getByRole('button', { name: 'Compartir' }).click()
  await expect(page).toHaveURL(/panel=compartir&para=[0-9a-f-]{36}/)
  await expect(page).not.toHaveURL(/cotizacion=/)
})

test('E2E «Comparar» se enciende con 2 elegidas y lleva a comparar; «Aprobar esta» aprueba otra desde su tarjeta', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/vehiculos/${vehiculos.propios}`)
  await indice(page).getByText('Cotizaciones').click()
  await expect(tarjetas(page)).toHaveCount(3)
  const comparar = bloque(page).getByRole('button', { name: 'Comparar', exact: true })
  await expect(comparar).toBeDisabled()
  await tarjetas(page).nth(0).getByRole('checkbox').click()
  await tarjetas(page).nth(1).getByRole('checkbox').click()
  const enlace = bloque(page).getByRole('link', { name: 'Comparar', exact: true })
  await expect(enlace).toHaveAttribute(
    'href',
    new RegExp(
      `^/cotizaciones/comparar\\?ids=[0-9a-f-]{36},[0-9a-f-]{36}&returnTo=%2Fvehiculos%2F${vehiculos.propios}`,
    ),
  )
  await tarjetas(page).nth(0).getByRole('checkbox').click()
  await expect(comparar).toBeDisabled()

  // Ninguna es la aprobada: «Aprobar esta» en las tres; al aprobar una, ésa pasa a primera, marcada, y ya no lo ofrece.
  await expect(bloque(page).getByRole('button', { name: 'Aprobar esta' })).toHaveCount(3)
  const tercera = tarjetas(page).nth(2)
  await tercera.getByRole('button', { name: 'Aprobar esta' }).click()
  await expect(tarjetas(page).first()).toContainText('Aprobada')
  await expect(bloque(page).getByRole('button', { name: 'Aprobar esta' })).toHaveCount(2)
})
