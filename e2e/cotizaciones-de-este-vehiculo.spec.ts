import { botonDelMenuDeLaGuardada } from './soporte/menu-de-la-guardada'
import { CONTRASENA, entrar } from './soporte/alta'
import { correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './soporte/base'
import {
  limpiarFinal,
  prepararFinal,
  sembrarParaMarcar,
  type TerrenoDeLaFinal,
} from './soporte/cotizaciones-final'
import { expect, test, type Page } from './soporte/prueba'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// «De este vehículo» (`docs/UX.md` › «Cotización guardada», «Cotizaciones» y «Cotizaciones del lead y del vehículo»): desde una cotización se ven las otras del
// mismo vehículo, la aprobada primero y marcada, «Esta» la que se mira, y «Aprobar esta» aprueba otra (la base lo confirma, la cabecera se pone al día y «Deshacer» la
// devuelve). En el detalle, la línea bajo la cabecera salta al bloque; en el resumen del listado, el mismo bloque como la quinta pestaña (`?pestana=vehiculo`), con Aprobar y Comparar. Quien no
// aprueba lo ve apagado con su motivo; una cotización sola de su vehículo no dibuja nada. El terreno es el de `soporte/cotizaciones-final.ts` (sembrado sin triggers:
// el relleno de la aprobada se llama a mano).
test.describe.configure({ mode: 'serial' })

// Presupuestos (`docs/RENDIMIENTO.md`): la primera respuesta con 10 filas y la fijada, como el historial más la vigencia de cada fila (`vence_el`: medido 5.327 B, tope con un 5 %); los nodos de la lista con esas 11 filas.
const TOPE_DE_BYTES = 5_600
const TOPE_DE_NODOS_CON_11 = 240

let t: TerrenoDeLaFinal
// Quien ve las cotizaciones y los vehículos del origen pero no aprueba (Ana no ve vehículos: para ella no hay bloque). La borra `limpiarFinal()`.
let sinAprobar: string

test.beforeAll(async ({}, info) => {
  t = await prepararFinal(info.project.name)
  sinAprobar = correoDePrueba(`sin-aprobar-de-este-${info.project.name}`)
  await crearPersona({
    email: sinAprobar,
    contrasena: CONTRASENA,
    nombre: 'Vero Sin Aprobar',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinAprobar,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}De este vehículo sin aprobar ${info.project.name}`,
      clave: `e2e_de_este_sin_aprobar_${info.project.name}`,
    },
    permisos: [
      { clave: 'cotizaciones.ver', origenId: t.origen.id, alcance: 'todos' },
      { clave: 'vehiculos.ver', origenId: t.origen.id, alcance: 'todos' },
    ],
  })
})

test.afterAll(async () => {
  await limpiarFinal()
})

const bloque = (page: Page) => page.getByRole('list', { name: 'Cotizaciones de este vehículo' })
const filas = (page: Page) => bloque(page).locator('[data-de-este-vehiculo]')
const cabecera = (page: Page) => page.locator('[data-cabecera-de-la-guardada]')

async function abrir(page: Page, correo: string, ruta: string): Promise<void> {
  await page.context().clearCookies()
  await entrar(page, correo, { fresco: true })
  await page.goto(ruta)
}

// `cuantas` preventas de un vehículo, de la más vieja a la más nueva, con la aprobada puesta como la pone la base (la más antigua).
async function sembrar(nombre: string, cuantas: number, creadoPor?: string) {
  const { vehiculoId } = await sembrarParaMarcar(t, nombre, {
    cuantas,
    ...(creadoPor === undefined ? {} : { creadoPor }),
  })
  const v = vehiculoId ?? ''
  sql('select public._cotizaciones_aprobadas_rellenar();')
  const ids = sql(
    `select id from public.cotizaciones where vehiculo_id = ${literal(v)}::uuid order by creado_en, id`,
  )
    .split('\n')
    .filter((id) => id !== '')
  return { vehiculoId: v, ids }
}

const aprobadaDe = (vehiculoId: string): string =>
  sql(
    `select coalesce((select cotizacion_id::text from public.cotizaciones_aprobadas where vehiculo_id = ${literal(vehiculoId)}::uuid), '')`,
  )

const numeroDe = (id: string): string =>
  sql(`select numero from public.cotizaciones where id = ${literal(id)}::uuid`)

let tres: { vehiculoId: string; ids: string[] }

test('E2E la línea bajo la cabecera salta al bloque: la aprobada primero y «Esta» sin «Abrir»', async ({
  page,
}, info) => {
  tres = await sembrar('De este E1', 3)
  const [primera = '', segunda = ''] = tres.ids
  expect(aprobadaDe(tres.vehiculoId)).toBe(primera)

  await abrir(page, t.duena, `/cotizaciones/${segunda}`)
  const linea = page.locator('[data-linea-de-este-vehiculo]')
  await expect(linea).toHaveText('Hay 2 cotizaciones más de este vehículo · Ver')
  await linea.getByRole('link', { name: 'Ver' }).click()
  const titulo = page.getByRole('heading', { name: 'De este vehículo', level: 2 })
  await expect(titulo).toBeInViewport()
  await expect(titulo).toBeFocused()

  await expect(filas(page)).toHaveCount(3)
  await expect(filas(page).first()).toHaveAttribute('data-aprobada', '')
  await expect(filas(page).first()).toContainText(`N.º ${numeroDe(primera)}`)
  await expect(filas(page).first().getByRole('button', { name: 'Aprobar esta' })).toHaveCount(0)
  const esta = bloque(page).locator('[data-esta]')
  await expect(esta).toContainText(`N.º ${numeroDe(segunda)}`)
  await expect(esta.getByText('Esta', { exact: true })).toBeVisible()
  await expect(esta.getByRole('link', { name: 'Abrir' })).toHaveCount(0)
  // Para mirar (sólo con `E2E_CAPTURAS`): el bloque al 100 % y al 200 %.
  await capturar(page, info, 'bloque')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await titulo.scrollIntoViewIfNeeded()
  await capturar(page, info, 'bloque-200')
})

test('E2E «Aprobar esta» vuelve aprobada a otra, la cabecera se pone al día y «Deshacer» la devuelve', async ({
  page,
}) => {
  const [primera = '', , tercera = ''] = tres.ids
  // Desde la aprobada: su cabecera dice «Aprobada» y deja de decirlo al aprobar otra desde el bloque, sin refrescar la hoja.
  await abrir(page, t.duena, `/cotizaciones/${primera}`)
  await expect(cabecera(page).locator('[data-aprobada]')).toBeVisible()
  // La lista llega al acercarse: primero el título.
  await page.getByRole('heading', { name: 'De este vehículo', level: 2 }).scrollIntoViewIfNeeded()
  const otra = filas(page).filter({ hasText: `N.º ${numeroDe(tercera)}` })
  await otra.scrollIntoViewIfNeeded()
  await otra.getByRole('button', { name: 'Aprobar esta' }).click()
  const aviso = page
    .locator('[data-sonner-toast]')
    .filter({ hasText: `La n.º ${numeroDe(tercera)} es la aprobada del vehículo.` })
  await expect(aviso).toBeVisible()
  await expect.poll(() => aprobadaDe(tres.vehiculoId)).toBe(tercera)
  await expect(filas(page).first()).toContainText(`N.º ${numeroDe(tercera)}`)
  await expect(filas(page).first()).toHaveAttribute('data-aprobada', '')
  await expect(cabecera(page).locator('[data-aprobada]')).toHaveCount(0)
  await expect(cabecera(page).getByRole('button', { name: 'Aprobar', exact: true })).toBeVisible()

  await aviso.getByRole('button', { name: 'Deshacer' }).click()
  await expect.poll(() => aprobadaDe(tres.vehiculoId)).toBe(primera)
  await expect(filas(page).first()).toContainText(`N.º ${numeroDe(primera)}`)
  await expect(cabecera(page).locator('[data-aprobada]')).toBeVisible()
})

test('E2E en el resumen del listado, «De este vehículo» es la quinta pestaña: aprueba y compara desde ahí', async ({
  page,
}, info) => {
  const [primera = '', segunda = '', tercera = ''] = tres.ids
  // Sin `?pestana=` abre «Todo»: el bloque no se dibuja hasta elegir la pestaña.
  await abrir(page, t.duena, `/cotizaciones?vehiculo=${tres.vehiculoId}&cotizacion=${segunda}`)
  const drawer = page.getByRole('dialog')
  const pestanas = drawer.getByRole('tab')
  await expect(pestanas).toHaveText([
    'Todo',
    'Adjuntos',
    'Revisiones',
    'Comentarios',
    'De este vehículo',
  ])
  await expect(drawer.getByRole('tab', { name: 'Todo' })).toHaveAttribute('aria-selected', 'true')
  await expect(filas(page)).toHaveCount(0)
  await drawer.getByRole('tab', { name: 'De este vehículo' }).click()
  await expect(page).toHaveURL(/pestana=vehiculo/)
  await expect(filas(page)).toHaveCount(3)
  await expect(filas(page).first()).toHaveAttribute('data-aprobada', '')
  // El bloque no repite su título: la pestaña lo es.
  await expect(drawer.getByRole('heading', { name: 'De este vehículo' })).toHaveCount(0)
  await capturar(page, info, 'resumen-vehiculo')

  // Aprobar desde la pestaña.
  const otra = filas(page).filter({ hasText: `N.º ${numeroDe(tercera)}` })
  await otra.getByRole('button', { name: 'Aprobar esta' }).click()
  await expect.poll(() => aprobadaDe(tres.vehiculoId)).toBe(tercera)
  await page
    .locator('[data-sonner-toast]')
    .filter({ hasText: `La n.º ${numeroDe(tercera)} es la aprobada del vehículo.` })
    .getByRole('button', { name: 'Deshacer' })
    .click()
  await expect.poll(() => aprobadaDe(tres.vehiculoId)).toBe(primera)

  // Comparar desde la pestaña: vuelve al resumen.
  await page.getByRole('checkbox', { name: `Comparar la n.º ${numeroDe(primera)}` }).click()
  await page.getByRole('checkbox', { name: `Comparar la n.º ${numeroDe(tercera)}` }).click()
  await page.getByRole('link', { name: 'Comparar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Comparar cotizaciones', level: 1 })).toBeVisible()
})

test('E2E `?pestana=vehiculo` abre la quinta pestaña', async ({ page }) => {
  const [, segunda = ''] = tres.ids
  await abrir(
    page,
    t.duena,
    `/cotizaciones?vehiculo=${tres.vehiculoId}&cotizacion=${segunda}&pestana=vehiculo`,
  )
  const drawer = page.getByRole('dialog')
  await expect(drawer.getByRole('tab', { name: 'De este vehículo' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(filas(page)).toHaveCount(3)
})

test('E2E sin `cotizaciones.aprobar`, «Aprobar esta» apagado con su motivo', async ({ page }) => {
  const s = await sembrar('De este E4', 2)
  await abrir(page, sinAprobar, `/cotizaciones/${s.ids[0] ?? ''}`)
  await page.getByRole('heading', { name: 'De este vehículo', level: 2 }).scrollIntoViewIfNeeded()
  const boton = filas(page).getByRole('button', { name: 'Aprobar esta' })
  await expect(boton).toBeDisabled()
  await expect(boton).toHaveAccessibleDescription(
    /^Para aprobar hace falta permiso en «.+»: pídeselo a quien administra los roles\.$/,
  )
})

test('E2E una cotización sola de su vehículo no dibuja ni la línea ni el bloque', async ({
  page,
}, info) => {
  const s = await sembrar('De este E5', 1)
  const [sola = ''] = s.ids
  await abrir(page, t.duena, `/cotizaciones/${sola}`)
  await expect(botonDelMenuDeLaGuardada(page)).toBeVisible()
  await expect(page.locator('[data-linea-de-este-vehiculo]')).toHaveCount(0)
  await expect(page.locator('#de-este-vehiculo')).toHaveCount(0)
  // Para mirar: así se veía toda guardada antes del bloque (nada de las otras del vehículo).
  await capturar(page, info, 'sin-bloque')
  await page.goto(`/cotizaciones?vehiculo=${s.vehiculoId}&cotizacion=${sola}`)
  const drawer = page.getByRole('dialog')
  await expect(drawer.getByRole('link', { name: 'Abrir cotización' })).toBeVisible()
  await expect(drawer.getByRole('heading', { name: 'De este vehículo' })).toHaveCount(0)
  // Con el vehículo pero sin otras cotizaciones: la pestaña existe y dice que es la única.
  await drawer.getByRole('tab', { name: 'De este vehículo' }).click()
  await expect(drawer.getByText('Ésta es la única cotización de este vehículo.')).toBeVisible()
})

test('E2E sin vehículo, el resumen tiene cuatro pestañas y `?pestana=vehiculo` abre «Todo»', async ({
  page,
}) => {
  const { ids } = await sembrarParaMarcar(t, 'De este E7', { cuantas: 1, sinVehiculo: true })
  await abrir(page, t.duena, `/cotizaciones?cotizacion=${ids[0] ?? ''}&pestana=vehiculo`)
  const drawer = page.getByRole('dialog')
  await expect(drawer.getByRole('tab')).toHaveText([
    'Todo',
    'Adjuntos',
    'Revisiones',
    'Comentarios',
  ])
  await expect(drawer.getByRole('tab', { name: 'Todo' })).toHaveAttribute('aria-selected', 'true')
})

test('E2E «De este vehículo» cabe en su presupuesto de bytes y de nodos', async ({
  page,
}, info) => {
  const s = await sembrar('De este E6', 12)
  await page.context().clearCookies()
  await entrar(page, t.duena, { fresco: true })
  const respuesta = page.waitForResponse(
    (r) =>
      r.url().includes('/rpc/cotizaciones_de_este_vehiculo') && r.request().method() === 'POST',
  )
  await page.goto(
    `/cotizaciones?vehiculo=${s.vehiculoId}&cotizacion=${s.ids.at(-1) ?? ''}&pestana=vehiculo`,
  )
  const bytes = (await (await respuesta).body()).length
  // La página de 10 y la aprobada (la más vieja, fuera de la página) primero.
  await expect(filas(page)).toHaveCount(11)
  await expect(page.getByRole('button', { name: 'Ver más' })).toBeVisible()
  const nodos = await bloque(page).evaluate((e) => e.querySelectorAll('*').length + 1)
  info.annotations.push({
    type: 'presupuesto',
    description: `nodos con 11: ${String(nodos)}, bytes de la 1.ª: ${String(bytes)}`,
  })
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS_CON_11)
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES)
})
