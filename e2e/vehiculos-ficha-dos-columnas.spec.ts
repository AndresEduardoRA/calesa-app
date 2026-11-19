import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { borrarLeadsDePrueba, crearLead, marcarInteres, vincular } from './soporte/leads'
import { PRESUPUESTO_DE_LA_FICHA_DEL_VEHICULO_EN_KB } from './soporte/presupuestos'
import { borrarQueFalta, sembrarQueFalta, type TerrenoDeQueFalta } from './soporte/que-falta'
import { cajaDe, personaSinLogistica } from './soporte/ficha-del-vehiculo'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { sembrarFotos } from './soporte/vehiculos-lista'

// La ficha del vehículo en dos columnas (`docs/UX.md` › Vehículo), sobre el vehículo `uno` del terreno de «Qué falta» (A → B pide el BL y el contenedor) con
// un vinculado, dos interesados, una cotización y dos fotos. Qué bloque ve quién: `bloques.test.ts`; las acciones: `acciones-a-dibujar.test.ts`.
test.describe.configure({ mode: 'serial' })

let terreno: TerrenoDeQueFalta
let duena = ''
let sinLogistica = ''
let id = ''
let titulo = ''

const variante = (proyecto: string) => `f_${proyecto}`
// Las cotizaciones sembradas salen de una fórmula publicada: el origen de «Qué falta» no tiene, la subasta de la semilla sí.
const conFormula = () => sql("select id from public.origenes where clave = 'subasta_usa'")
const idDe = (correo: string) =>
  sql(`select id from public.perfiles where email = ${literal(correo)}`)

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarQueFalta(variante(proyecto))
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-ficha-dos-columnas-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Dos Columnas' })
  terreno = await sembrarQueFalta(variante(proyecto))
  id = terreno.uno.id
  titulo = terreno.uno.titulo
  const telefono = (n: number) => `5917${String(Date.now() + n).slice(-7)}`
  await vincular(
    id,
    await crearLead({ nombre: `Vinculado ${proyecto}`, telefono: telefono(1), deQuien: duena }),
  )
  for (const n of [2, 3]) {
    const lead = await crearLead({
      nombre: `Interesado ${String(n)} ${proyecto}`,
      telefono: telefono(n),
      deQuien: duena,
    })
    await marcarInteres({ vehiculoId: id, leadId: lead, quien: duena })
  }
  sembrarCotizaciones({
    origenId: conFormula(),
    vehiculoId: id,
    creadoPor: idDe(duena),
    cuantas: 1,
  })
  await sembrarFotos(id, 2)
  sinLogistica = await personaSinLogistica(proyecto, terreno.origen.id)
})

test.afterAll(async ({}, info) => {
  sql(`delete from public.cotizaciones where vehiculo_id = ${literal(id)}::uuid`)
  sql(`delete from public.documentos where vehiculo_id = ${literal(id)}::uuid`)
  await admin().from('vehiculos_imagenes').delete().eq('vehiculo_id', id)
  await borrarQueFalta(variante(info.project.name))
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const indice = (page: Page): Locator => page.getByRole('navigation', { name: 'Índice de la ficha' })
const tituloDe = (page: Page, nombre: string): Locator =>
  page.locator('main').getByRole('heading', { name: nombre, exact: true, level: 2 })
const region = (page: Page, nombre: string): Locator =>
  page.getByRole('region', { name: nombre, exact: true })

async function alaFicha(page: Page, busqueda = ''): Promise<void> {
  await page.goto(`/vehiculos/${id}${busqueda}`)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
  await expect(indice(page)).toHaveAttribute('data-hidratado', 'true')
}

test('E2E ficha en dos columnas · todo a la vista sin un clic', async ({ page }, info) => {
  await entrar(page, duena, { fresco: true })
  await alaFicha(page)
  // Izquierda: el carrusel, el título y los datos principales.
  await expect(page.getByRole('button', { name: /foto/i }).first()).toBeVisible()
  await expect(tituloDe(page, 'Datos principales')).toBeVisible()
  const principales = region(page, 'Datos principales')
  for (const dato of ['Marca', 'Modelo', 'Año', 'VIN']) {
    await expect(principales.getByText(dato, { exact: true })).toBeVisible()
  }
  // Derecha: el índice y los bloques, en su orden.
  await expect(indice(page).getByRole('link')).toHaveText([
    'Qué falta',
    'Relacionados',
    'Cotizaciones',
    'Documentos',
    'Ficha',
    'Repuestos',
    'Fotos',
  ])
  const fase = region(page, 'Fase y qué falta')
  await expect(fase.getByRole('link', { name: 'Ver en logística' })).toHaveAttribute(
    'href',
    `/logistica/vehiculo/${id}`,
  )
  // El mismo enlace va también, corto, en la cabecera: acá se cuenta el del bloque.
  await expect(fase.getByRole('link', { name: 'Ver en logística' })).toHaveCount(1)
  await expect(
    fase.getByRole('heading', { name: `Para pasar a «${terreno.b.nombre}»` }),
  ).toBeVisible()
  await expect(
    fase.locator('[data-requisito="falta"]').filter({ hasText: terreno.tipoDeBl.nombre }),
  ).toBeVisible()
  const relacionados = region(page, 'Relacionados')
  await expect(relacionados.getByRole('region', { name: 'Vinculado', exact: true })).toBeVisible()
  await expect(relacionados.getByRole('region', { name: 'Interesado', exact: true })).toBeVisible()
  await capturar(page, info, 'ficha-arriba')
  for (const nombre of ['Cotizaciones', 'Documentos', 'Ficha', 'Repuestos', 'Fotos']) {
    await expect(tituloDe(page, nombre)).toBeAttached()
  }
  await region(page, 'Cotizaciones').scrollIntoViewIfNeeded()
  await expect(
    page.getByRole('list', { name: 'Cotizaciones del vehículo' }).getByRole('listitem'),
  ).toHaveCount(1)
  // Ni pestañas ni acordeones.
  await expect(page.locator('main [role=tablist]')).toHaveCount(0)
  await expect(page.locator('main details')).toHaveCount(0)
  await region(page, 'Fotos').scrollIntoViewIfNeeded()
  await expect(page.getByRole('list', { name: 'Fotos del vehículo' })).toBeVisible()
  await capturar(page, info, 'ficha-abajo')
})

test('E2E ficha en dos columnas · el índice salta al bloque y le da el foco a su título', async ({
  page,
}) => {
  await entrar(page, duena)
  await alaFicha(page)
  for (const [etiqueta, nombre] of [
    ['Fotos', 'Fotos'],
    ['Documentos', 'Documentos'],
    ['Qué falta', 'Fase y qué falta'],
    ['Repuestos', 'Repuestos'],
  ] as const) {
    const enlace = indice(page).getByRole('link', { name: etiqueta, exact: true })
    await enlace.click()
    await expect(tituloDe(page, nombre)).toBeFocused()
    await expect(tituloDe(page, nombre)).toBeInViewport()
    await expect(enlace).toHaveAttribute('aria-current', 'location')
  }
})

test('E2E ficha en dos columnas · los enlaces viejos llevan a su bloque o abren lo suyo', async ({
  page,
}) => {
  await entrar(page, duena)
  for (const [seccion, nombre] of [
    ['ficha', 'Ficha'],
    ['fotos', 'Fotos'],
    ['documentos', 'Documentos'],
    ['cotizaciones', 'Cotizaciones'],
    ['repuestos', 'Repuestos'],
  ] as const) {
    await alaFicha(page, `?seccion=${seccion}`)
    await expect(tituloDe(page, nombre)).toBeFocused()
    await expect(tituloDe(page, nombre)).toBeInViewport()
  }
  // Con un panel abierto, lo de atrás sale del árbol de accesibilidad: se espera lo que abre la URL.
  for (const [busqueda, nombre] of [
    [`?editar=${id}`, `Editar ${titulo}`],
    ['?panel=vitrina', undefined],
    ['?panel=desvincular', undefined],
    ['?panel=marcar-interesado', 'Marcar un interesado'],
    ['?relacionados=interesado', undefined],
  ] as const) {
    await page.goto(`/vehiculos/${id}${busqueda}`)
    await expect(page.getByRole('dialog', nombre ? { name: nombre } : {})).toBeVisible()
  }
  await page.goto(`/vehiculos/${id}?visor=${id}&foto=1`)
  await expect(page.locator('[data-visor-de-imagenes]')).toBeVisible()
  await expect(page.locator('[data-visor-de-imagenes]')).toHaveCount(1)
})

test('E2E ficha en dos columnas · sin el permiso, el bloque no está ni en el índice', async ({
  page,
}, info) => {
  // Sólo ve el vehículo y los leads: ni «Qué falta», ni «Documentos», ni «Ver en logística», ni cotizaciones, ni repuestos.
  await entrar(page, sinLogistica, { fresco: true })
  await alaFicha(page)
  await expect(indice(page).getByRole('link')).toHaveText(['Relacionados', 'Ficha', 'Fotos'])
  await expect(page.getByRole('link', { name: 'Ver en logística' })).toHaveCount(0)
  await expect(region(page, 'Fase y qué falta')).toHaveCount(0)
  await expect(region(page, 'Documentos')).toHaveCount(0)
  await capturar(page, info, 'sin-logistica')
})

test('E2E ficha en dos columnas · con logística y sin leads, cotizaciones ni repuestos', async ({
  page,
}) => {
  await entrar(page, terreno.sinAsignar.correo, { fresco: true })
  await alaFicha(page)
  await expect(indice(page).getByRole('link')).toHaveText([
    'Qué falta',
    'Documentos',
    'Ficha',
    'Fotos',
  ])
  await expect(region(page, 'Cotizaciones')).toHaveCount(0)
  await expect(region(page, 'Repuestos')).toHaveCount(0)
})

test('E2E ficha en dos columnas · «Subir» de «Qué falta» se hace en el bloque Documentos; lo de transporte abre la unidad', async ({
  page,
}) => {
  await entrar(page, duena)
  await alaFicha(page)
  const fase = region(page, 'Fase y qué falta')
  const contenedor = fase.locator('[data-requisito="falta"]').filter({ hasText: 'Contenedor' })
  await expect(contenedor.getByRole('link', { name: /^Abrir la unidad: / })).toHaveAttribute(
    'href',
    `/logistica/vehiculo/${id}?hueco=transporte`,
  )
  const bl = fase.locator('[data-requisito="falta"]').filter({ hasText: terreno.tipoDeBl.nombre })
  await bl.getByRole('button', { name: `Subir «${terreno.tipoDeBl.nombre}»` }).click()
  const bandeja = page.getByRole('form', { name: 'Subir documentos' })
  await expect(bandeja.getByLabel('Tipo de documento')).toHaveValue(terreno.tipoDeBl.id)
  await expect(bandeja.locator(':focus')).toHaveCount(1)
  await expect(page).toHaveURL(new RegExp(`/vehiculos/${id}`))
})

test('E2E ficha en dos columnas · la forma: dos columnas en escritorio, una en el celular y al 200 %', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await alaFicha(page)
  const h1 = page.getByRole('heading', { name: titulo, level: 1 })
  if (info.project.name === 'escritorio') {
    // La lateral, a la izquierda del índice.
    expect((await cajaDe(h1)).derecha).toBeLessThanOrEqual((await cajaDe(indice(page))).x)
  } else {
    // Una columna, en orden.
    const enOrden = [
      h1,
      tituloDe(page, 'Datos principales'),
      indice(page),
      ...[
        'Fase y qué falta',
        'Relacionados',
        'Cotizaciones',
        'Documentos',
        'Ficha',
        'Repuestos',
        'Fotos',
      ].map((nombre) => tituloDe(page, nombre)),
    ]
    const ys: number[] = []
    for (const elemento of enOrden) {
      ys.push((await cajaDe(elemento)).y)
    }
    expect(ys).toEqual([...ys].sort((a, b) => a - b))
    await capturar(page, info, 'celular')
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  // Una sola columna: la cabecera arriba del índice.
  expect((await cajaDe(h1)).abajo).toBeLessThanOrEqual((await cajaDe(indice(page))).y)
  await capturar(page, info, 'texto-al-200')
})

test('E2E ficha en dos columnas · el documento no crece con los documentos ni las cotizaciones', async ({
  page,
}, info) => {
  await entrar(page, duena)
  const largo = async (ruta: string) => (await (await page.goto(ruta))?.body())?.length ?? 0
  const perfil = await largo('/perfil')
  const conUno = (await largo(`/vehiculos/${id}`)) - perfil
  sql(`insert into public.documentos (vehiculo_id, tipo_documento_id, nombre_archivo)
    select ${literal(id)}::uuid, ${literal(terreno.tipoDeBl.id)}::uuid, 'doc-' || n || '.pdf' from generate_series(1, 60) n`)
  sembrarCotizaciones({
    origenId: conFormula(),
    vehiculoId: id,
    creadoPor: idDe(duena),
    cuantas: 600,
    desde: 5,
  })
  const conMuchos = (await largo(`/vehiculos/${id}`)) - perfil
  const kb = (bytes: number) => Math.round((bytes / 1024) * 10) / 10
  const medido = `la ficha aporta ${String(kb(conUno))} KB con 1 cotización y ${String(kb(conMuchos))} KB con 60 documentos y 601 cotizaciones`
  console.warn(`[ficha del vehículo] ${info.project.name}: ${medido}`)
  info.annotations.push({ type: 'documento de la ficha', description: medido })
  expect(Math.abs(conMuchos - conUno)).toBeLessThanOrEqual(1024)
  expect(conUno).toBeLessThanOrEqual(PRESUPUESTO_DE_LA_FICHA_DEL_VEHICULO_EN_KB * 1024)
})
