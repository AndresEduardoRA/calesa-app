import { entrar } from './soporte/alta'
import {
  limpiarFinal,
  prepararFinal,
  sembrarParaMarcar,
  type TerrenoDeLaFinal,
} from './soporte/cotizaciones-final'
import { expect, test, type Locator, type Page } from './soporte/prueba'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// El drawer de la cotización (el resumen `?cotizacion=`, `docs/UX.md` › «Cotizaciones», T320): se abre igual desde la tabla, la tarjeta y la línea de un grupo
// desplegado, con la abierta marcada; arriba «Abrir cotización», «Compartir cotización» y el «⋯» sin «Compartir» (también para la línea del grupo, que no está en
// la página); sus diálogos se abren sobre el resumen sin cerrarlo; «Aprobar esta» de «De este vehículo» cambia la insignia en el resumen y en la lista sin recargar;
// las pestañas siguen; en Modo Live no hay «Compartir». La portada y su visor los recorre `cotizaciones-portada.spec.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaFinal
// Un vehículo con tres de la dueña (la aprobada, la más vieja) y una sin vehículo.
let grupo: { vehiculoId: string; ids: string[] }
let suelta: string

test.beforeAll(async ({}, info) => {
  t = await prepararFinal(info.project.name)
  const sembrado = await sembrarParaMarcar(t, 'Drawer del grupo', { cuantas: 3 })
  const vehiculoId = sembrado.vehiculoId ?? ''
  sql('select public._cotizaciones_aprobadas_rellenar();')
  grupo = {
    vehiculoId,
    ids: sql(
      `select id from public.cotizaciones where vehiculo_id = ${literal(vehiculoId)}::uuid order by creado_en, id`,
    )
      .split('\n')
      .filter((id) => id !== ''),
  }
  suelta = (await sembrarParaMarcar(t, 'Drawer suelta', { sinVehiculo: true })).ids[0] ?? ''
})

test.afterAll(async () => {
  await limpiarFinal()
})

const deLaPrueba = (resto = ''): string => `/cotizaciones?origen=${t.origen.id}${resto}`
const numeroDe = (id: string): string =>
  sql(`select numero from public.cotizaciones where id = ${literal(id)}::uuid`).trim()
const aprobadaDe = (vehiculoId: string): string =>
  sql(
    `select coalesce((select cotizacion_id::text from public.cotizaciones_aprobadas where vehiculo_id = ${literal(vehiculoId)}::uuid), '')`,
  ).trim()
const resumen = (page: Page, id: string) =>
  page.getByRole('dialog', { name: `Cotización n.º ${numeroDe(id)}` })
const barra = (drawer: Locator) => drawer.locator('[data-acciones-del-resumen]')

async function abrir(page: Page, ruta: string): Promise<void> {
  await entrar(page, t.duena, { fresco: true })
  await page.goto(ruta)
  await expect(page.locator('tbody tr, article').first()).toBeVisible()
}

// Lo mismo desde cualquier lugar: el título, los datos de la fila y la barra.
async function esElResumenDe(page: Page, id: string): Promise<Locator> {
  await expect.poll(() => new URL(page.url()).searchParams.get('cotizacion')).toBe(id)
  const drawer = resumen(page, id)
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText('Cliente', { exact: true })).toBeVisible()
  await expect(barra(drawer).getByRole('link', { name: 'Abrir cotización' })).toHaveAttribute(
    'href',
    `/cotizaciones/${id}`,
  )
  return drawer
}

// El orden de la barra (los tres, antes de la portada) y que «Abrir» y «Compartir» crecen por igual en la misma fila (al 100 %, también en el celular).
async function revisarLaBarra(drawer: Locator, botones: Locator[]): Promise<void> {
  const orden = await drawer.evaluate((d) => {
    const laBarra = d.querySelector('[data-acciones-del-resumen]')
    const portada = d.querySelector('[data-portada]')
    return {
      textos: [...(laBarra?.children ?? [])].map(
        (n) => n.getAttribute('aria-label') ?? n.textContent,
      ),
      antes:
        portada === null ||
        laBarra === null ||
        Boolean(laBarra.compareDocumentPosition(portada) & Node.DOCUMENT_POSITION_FOLLOWING),
    }
  })
  expect(orden.textos.slice(0, 2)).toEqual(['Abrir cotización', 'Compartir cotización'])
  expect(orden.textos).toHaveLength(3)
  expect(orden.antes).toBe(true)
  const [a, c, m] = await Promise.all(botones.map((b) => b.boundingBox()))
  expect(Math.abs((a?.width ?? 0) - (c?.width ?? 0))).toBeLessThanOrEqual(2)
  expect(a?.y).toBe(c?.y)
  expect(m?.width ?? 0).toBeGreaterThanOrEqual(36)
}

async function dentroDelPanel(drawer: Locator, botones: Locator[]): Promise<void> {
  const caja = await drawer.boundingBox()
  const borde = (caja?.x ?? 0) + (caja?.width ?? 0) + 1
  for (const boton of botones) {
    const b = await boton.boundingBox()
    await expect(boton).toBeVisible()
    expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(borde)
  }
}

async function cerrar(page: Page, drawer: Locator): Promise<void> {
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
}

test('E2E desde la tarjeta y desde la línea de un grupo desplegado se abre el mismo resumen, con la abierta marcada', async ({
  page,
}, info) => {
  await abrir(page, deLaPrueba())
  const tarjeta = page
    .locator('article')
    .filter({ has: page.getByRole('button', { name: '3 cotizaciones de este vehículo' }) })
  const cabeza = grupo.ids[0] ?? ''
  await tarjeta.locator('[data-titulo-de-la-cotizacion]').click()
  let drawer = await esElResumenDe(page, cabeza)
  // Con el drawer abierto la lista sale del árbol de accesibilidad: se afirma por atributos.
  await expect(page.locator('article[data-state="selected"]')).toHaveCount(1)
  await expect(page.locator('article[data-state="selected"]')).toContainText(
    `N.º ${numeroDe(cabeza)}`,
  )
  await capturar(page, info, 'resumen-desde-la-tarjeta')
  await cerrar(page, drawer)

  await tarjeta.getByRole('button', { name: '3 cotizaciones de este vehículo' }).click()
  const otra = grupo.ids[1] ?? ''
  const linea = page.locator(`[data-linea-del-grupo="${otra}"]`)
  await linea.getByRole('button', { name: `Abrir N.º ${numeroDe(otra)}` }).click()
  drawer = await esElResumenDe(page, otra)
  await expect(linea).toHaveAttribute('data-state', 'selected')
  await expect(linea).toHaveAttribute('aria-current', 'true')
  // No está en la página y aun así tiene su «⋯» (la leyó el servidor con sus marcas).
  await expect(
    barra(drawer).getByRole('button', { name: `Más acciones de N.º ${numeroDe(otra)}` }),
  ).toBeVisible()
})

// @sin-celular: la tabla sólo existe en escritorio; en el celular la lista siempre va en tarjetas
test('E2E desde la fila de la tabla se abre el mismo resumen y la fila queda marcada', async ({
  page,
}) => {
  await abrir(page, deLaPrueba('&vista=tabla&agrupar=no'))
  await page.getByRole('button', { name: `Abrir N.º ${numeroDe(suelta)}` }).click()
  await esElResumenDe(page, suelta)
  await expect(page.locator(`tr[data-state="selected"]`)).toHaveCount(1)
  await expect(page.locator(`tr[data-state="selected"]`)).toContainText(`N.º ${numeroDe(suelta)}`)
})

test('E2E la barra: «Abrir», «Compartir» y el «⋯» en ese orden, antes de la portada; sus diálogos no cierran el resumen', async ({
  page,
}, info) => {
  await abrir(page, deLaPrueba(`&cotizacion=${suelta}`))
  const drawer = await esElResumenDe(page, suelta)
  const abrirla = barra(drawer).getByRole('link', { name: 'Abrir cotización' })
  const compartir = barra(drawer).getByRole('button', { name: 'Compartir cotización' })
  const mas = barra(drawer).getByRole('button', { name: `Más acciones de N.º ${numeroDe(suelta)}` })
  await expect(compartir).toBeVisible()
  await expect(mas).toBeVisible()
  await revisarLaBarra(drawer, [abrirla, compartir, mas])
  await capturar(page, info, 'barra-del-resumen')

  // El «⋯»: la lista de la fila sin «Compartir cotización…».
  await mas.click()
  await expect(page.getByRole('menuitem').first()).toBeVisible()
  await expect(page.getByRole('menuitem', { name: /Compartir cotización/ })).toHaveCount(0)
  await page.getByRole('menuitem', { name: 'Reportar…' }).click()
  const reportar = page.getByRole('dialog', { name: /Reportar la cotización n\.º/ })
  await expect(reportar).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(reportar).toBeHidden()
  await expect(drawer).toBeVisible()
  expect(new URL(page.url()).searchParams.get('cotizacion')).toBe(suelta)

  // «Compartir cotización»: su panel encima; Esc lo cierra y el resumen sigue.
  await compartir.click()
  await expect.poll(() => new URL(page.url()).searchParams.get('panel')).toBe('compartir')
  expect(new URL(page.url()).searchParams.get('para')).toBe(suelta)
  const panel = page.getByRole('dialog', { name: 'Compartir cotización' })
  await expect(panel.getByRole('button', { name: 'Copiar texto' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(drawer).toBeVisible()
  expect(new URL(page.url()).searchParams.get('cotizacion')).toBe(suelta)

  // Las pestañas siguen: «Comentarios» va a la URL.
  await drawer.getByRole('tab', { name: 'Comentarios' }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('pestana')).toBe('comentarios')

  // Con el texto al 200 % la barra se parte en filas sin salirse.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  // La pestaña elegida desplazó el panel: se vuelve arriba.
  await abrirla.scrollIntoViewIfNeeded()
  await expect(abrirla).toBeInViewport()
  await sinScrollHorizontal(page)
  await dentroDelPanel(drawer, [abrirla, compartir, mas])
  await capturar(page, info, 'barra-del-resumen-al-200')

  await abrirla.click()
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/${suelta}$`))
})

test('E2E «Aprobar esta» de «De este vehículo» cambia la insignia en el resumen y en la cabeza del grupo, sin recargar', async ({
  page,
}) => {
  const [primera = '', , tercera = ''] = grupo.ids
  expect(aprobadaDe(grupo.vehiculoId)).toBe(primera)
  await abrir(page, deLaPrueba(`&cotizacion=${tercera}`))
  await page.evaluate(() => {
    ;(window as unknown as { sinRecargar?: boolean }).sinRecargar = true
  })
  const drawer = await esElResumenDe(page, tercera)
  await expect(drawer.getByText('Aprobada', { exact: true })).toHaveCount(0)
  const esta = drawer.locator('[data-esta]')
  await esta.scrollIntoViewIfNeeded()
  await esta.getByRole('button', { name: 'Aprobar esta' }).click()
  const aviso = page
    .locator('[data-sonner-toast]')
    .filter({ hasText: `La n.º ${numeroDe(tercera)} es la aprobada del vehículo.` })
  await expect(aviso).toBeVisible()
  await expect(aviso.getByRole('button', { name: 'Deshacer' })).toBeVisible()
  await expect.poll(() => aprobadaDe(grupo.vehiculoId)).toBe(tercera)
  await expect(drawer.locator('[data-slot="badge"]', { hasText: 'Aprobada' }).first()).toBeVisible()
  await cerrar(page, drawer)
  // La cabeza del grupo es ahora la aprobada.
  const tarjeta = page
    .locator('article')
    .filter({ has: page.getByRole('button', { name: '3 cotizaciones de este vehículo' }) })
  await expect(tarjeta).toContainText(`N.º ${numeroDe(tercera)}`)
  await expect(tarjeta.getByText('Aprobada', { exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => (window as unknown as { sinRecargar?: boolean }).sinRecargar),
  ).toBe(true)
  sql(
    `update public.cotizaciones_aprobadas set cotizacion_id = ${literal(primera)}::uuid where vehiculo_id = ${literal(grupo.vehiculoId)}::uuid`,
  )
})

test('E2E en Modo Live el resumen no ofrece «Compartir cotización» ni en la barra ni en el «⋯»', async ({
  page,
}) => {
  await entrar(page, t.duena, { fresco: true })
  await page.addInitScript(() => {
    window.localStorage.setItem('modo-live', '1')
  })
  await page.goto(deLaPrueba(`&cotizacion=${suelta}`))
  await expect(page.locator('html')).toHaveClass(/\blive\b/)
  const drawer = await esElResumenDe(page, suelta)
  await expect(barra(drawer).getByRole('button', { name: 'Compartir cotización' })).toHaveCount(0)
  await barra(drawer)
    .getByRole('button', { name: `Más acciones de N.º ${numeroDe(suelta)}` })
    .click()
  await expect(page.getByRole('menuitem').first()).toBeVisible()
  await expect(page.getByRole('menuitem', { name: /Compartir cotización/ })).toHaveCount(0)
})
