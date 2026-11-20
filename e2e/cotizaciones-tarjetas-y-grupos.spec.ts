import { entrar } from './soporte/alta'
import {
  limpiarFinal,
  prepararFinal,
  sembrarParaMarcar,
  type TerrenoDeLaFinal,
} from './soporte/cotizaciones-final'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { expect, test, type Page } from './soporte/prueba'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// La lista de cotizaciones en tarjetas y agrupada por vehículo (`docs/UX.md` › «Cotizaciones», T319): por defecto tarjetas y agrupada; un vehículo con cuatro
// cotizaciones es una tarjeta con la portada de su aprobada (la miniatura) y «4 cotizaciones de este vehículo», que se despliega en el lugar con sus casillas para
// «Comparar»; una sin vehículo va suelta; «Compartir» de la tarjeta abre su panel y el «⋯» de la tarjeta no lo repite (en la tabla va primero, con la columna
// «Título»); «Tabla | Tarjetas» y «Agrupar por vehículo» se recuerdan; «Mías» deja en el grupo sólo las suyas; las tarjetas miden lo mismo; la portada abre el visor y
// la tarjeta el resumen; en Modo Live no hay «Compartir». El terreno es el de `soporte/cotizaciones-final.ts` (sembrado sin triggers: la aprobada se rellena a mano).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaFinal
// El grupo: tres de la dueña y una de Ana sobre el mismo vehículo (la aprobada, la más vieja); y una sin vehículo.
let grupo: { vehiculoId: string; ids: string[] }
let aprobada: string
let suelta: string

test.beforeAll(async ({}, info) => {
  t = await prepararFinal(info.project.name)
  const sembrado = await sembrarParaMarcar(t, 'Tarjetas del grupo', { cuantas: 3 })
  const vehiculoId = sembrado.vehiculoId ?? ''
  sembrarCotizaciones({
    origenId: t.origen.id,
    vehiculoId,
    creadoPor: idDePersona(t.ana),
    cuantas: 1,
    desde: 30,
  })
  sql('select public._cotizaciones_aprobadas_rellenar();')
  grupo = {
    vehiculoId,
    ids: sql(
      `select id from public.cotizaciones where vehiculo_id = ${literal(vehiculoId)}::uuid order by creado_en desc, id desc`,
    )
      .split('\n')
      .filter((id) => id !== ''),
  }
  aprobada = sql(
    `select cotizacion_id from public.cotizaciones_aprobadas where vehiculo_id = ${literal(vehiculoId)}::uuid`,
  ).trim()
  suelta = (await sembrarParaMarcar(t, 'Tarjetas suelta', { sinVehiculo: true })).ids[0] ?? ''
})

test.afterAll(async () => {
  await limpiarFinal()
})

const deLaPrueba = (resto = ''): string => `/cotizaciones?origen=${t.origen.id}${resto}`
const tarjetaDe = (page: Page, id: string) =>
  page.locator('article').filter({ has: page.locator(`[data-portada] img[src*="${id}"]`) })
const conteo = (page: Page) => page.getByRole('button', { name: /cotizaciones de este vehículo$/ })

async function abrir(page: Page, ruta: string): Promise<void> {
  await entrar(page, t.duena, { fresco: true })
  await page.goto(ruta)
  await expect(page.locator('tbody tr, article').first()).toBeVisible()
}

test('E2E por defecto, tarjetas agrupadas: el grupo con la portada de su aprobada y su conteo se despliega en el lugar y compara; la suelta va sola', async ({
  page,
}, info) => {
  await abrir(page, deLaPrueba())
  expect(grupo.ids).toHaveLength(4)
  const delGrupo = tarjetaDe(page, aprobada)
  await expect(delGrupo).toHaveCount(1)
  // La miniatura de la portada de la aprobada.
  await expect(delGrupo.locator('[data-portada] img')).toHaveAttribute('src', /portada\?ancho=480/)
  const boton = delGrupo.getByRole('button', { name: '4 cotizaciones de este vehículo' })
  await expect(boton).toHaveAttribute('aria-expanded', 'false')
  // La suelta: su tarjeta, sin conteo.
  await expect(tarjetaDe(page, suelta)).toHaveCount(1)
  await expect(conteo(page)).toHaveCount(1)
  await capturar(page, info, 'tarjetas-agrupadas')

  await boton.click()
  await expect(boton).toHaveAttribute('aria-expanded', 'true')
  const despliegue = page.locator(`#${(await boton.getAttribute('aria-controls')) ?? ''}`)
  const lineas = despliegue.locator('[data-linea-del-grupo]')
  await expect(lineas).toHaveCount(4)
  await expect(lineas.first()).toHaveAttribute('data-linea-del-grupo', aprobada)
  await expect(lineas.first()).toContainText('En la tarjeta')
  await despliegue.scrollIntoViewIfNeeded()
  await capturar(page, info, 'grupo-desplegado')
  const comparar = despliegue.getByRole('button', { name: 'Comparar' })
  await expect(comparar).toBeDisabled()
  const casillas = despliegue.locator('[data-casilla-de-comparar]')
  await casillas.nth(0).click()
  await casillas.nth(1).click()
  const enlace = despliegue.getByRole('link', { name: 'Comparar' })
  await expect(enlace).toHaveAttribute(
    'href',
    new RegExp(`^/cotizaciones/comparar\\?ids=${aprobada},`),
  )
})

test('E2E «Compartir» de la tarjeta abre su panel y el «⋯» de la tarjeta no lo repite', async ({
  page,
}) => {
  await abrir(page, deLaPrueba())
  const tarjeta = tarjetaDe(page, suelta)
  await tarjeta.getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('panel')).toBe('compartir')
  expect(new URL(page.url()).searchParams.get('para')).toBe(suelta)
  const panel = page.getByRole('dialog', { name: 'Compartir cotización' })
  await expect(panel.getByRole('button', { name: 'Copiar texto' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await tarjeta.getByRole('button', { name: /^Más acciones de N\.º \d+$/ }).click()
  await expect(page.getByRole('menuitem').first()).toBeVisible()
  await expect(page.getByRole('menuitem', { name: /Compartir cotización/ })).toHaveCount(0)
})

// @sin-celular: la tabla sólo existe en escritorio; en el celular la lista siempre va en tarjetas
test('E2E en la tabla, el «⋯» trae «Compartir cotización…» primero y está la columna «Título»', async ({
  page,
}, info) => {
  await abrir(page, deLaPrueba('&vista=tabla&agrupar=no'))
  await expect(page.getByRole('columnheader', { name: 'Título' })).toBeVisible()
  await capturar(page, info, 'tabla-sin-agrupar')
  const fila = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: /^Abrir N\.º/ }) })
    .first()
  await fila.getByRole('button', { name: /^Más acciones de N\.º \d+$/ }).click()
  await expect(page.getByRole('menuitem').first()).toHaveText('Compartir cotización…')
})

// @sin-celular: «Tabla | Tarjetas» se elige sólo en escritorio; en el celular no hay nada que elegir
test('E2E «Tabla | Tarjetas» y «Agrupar por vehículo» se recuerdan al volver', async ({ page }) => {
  await abrir(page, deLaPrueba())
  await page.getByRole('button', { name: /^Vista y opciones/ }).click()
  await page.getByRole('button', { name: 'Tabla', exact: true }).click()
  await expect(page).toHaveURL(/vista=tabla/)
  await page.getByRole('switch', { name: 'Agrupar por vehículo' }).click()
  await expect(page).toHaveURL(/agrupar=no/)
  // Las dos quedaron guardadas en la cuenta: sin nada en la URL, la tabla y sin agrupar.
  await expect
    .poll(() =>
      sql(
        `select count(*) from public.preferencias_usuario where usuario_id = ${literal(idDePersona(t.duena))}::uuid and clave in ('cotizaciones.vista', 'cotizaciones.agrupar')`,
      ).trim(),
    )
    .toBe('2')
  await page.goto(deLaPrueba())
  await expect(page.getByRole('columnheader', { name: 'Título' })).toBeVisible()
  await expect(conteo(page)).toHaveCount(0)
  sql(
    `delete from public.preferencias_usuario where usuario_id = ${literal(idDePersona(t.duena))}::uuid and clave like 'cotizaciones.%'`,
  )
})

test('E2E «Mías» deja en el grupo sólo las suyas y el conteo baja', async ({ page }) => {
  await abrir(page, deLaPrueba('&cuales=mias'))
  await expect(page.getByRole('button', { name: '3 cotizaciones de este vehículo' })).toBeVisible()
})

test('E2E todas las tarjetas miden lo mismo', async ({ page }, info) => {
  await abrir(page, deLaPrueba())
  const tarjetas = page.locator('article')
  await expect(tarjetas).toHaveCount(2)
  await expect
    .poll(async () => {
      const altos = await tarjetas.evaluateAll((todas) =>
        todas.map((una) => una.getBoundingClientRect().height),
      )
      return Math.max(...altos) - Math.min(...altos)
    })
    .toBeLessThanOrEqual(1)
  // Para mirar (`E2E_CAPTURAS`): con el texto al 200 %.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await capturar(page, info, 'tarjetas-al-200')
})

test('E2E el clic en la portada no abre el resumen y el de la tarjeta sí; el visor de la tarjeta es suyo', async ({
  page,
}) => {
  await abrir(page, deLaPrueba())
  const tarjeta = tarjetaDe(page, suelta)
  // La portada abre su visor recién al hidratar (antes, el clic no hace nada): se insiste hasta que abre, sin volver a pulsar con
  // el visor ya pedido. Abierto tapa la lista: se cierra antes del clic en la tarjeta.
  const visor = page.getByRole('dialog', { name: /^Vista previa de la cotización/ })
  await expect(async () => {
    if (!page.url().includes(`visor=portada-de-la-lista-${suelta}`))
      await tarjeta.locator('[data-portada]').click({ position: { x: 10, y: 10 } })
    await expect(visor).toBeVisible({ timeout: 1000 })
  }).toPass()
  await expect(page).not.toHaveURL(/cotizacion=/)
  await page.keyboard.press('Escape')
  await expect(visor).toBeHidden()
  await tarjeta.locator('[data-titulo-de-la-cotizacion]').click()
  await expect(page).toHaveURL(new RegExp(`cotizacion=${suelta}`))
})

test('E2E en Modo Live la tarjeta no ofrece «Compartir» y la portada va oculta', async ({
  page,
}, info) => {
  await entrar(page, t.duena, { fresco: true })
  await page.addInitScript(() => {
    window.localStorage.setItem('modo-live', '1')
  })
  await page.goto(deLaPrueba())
  await expect(page.locator('html')).toHaveClass(/\blive\b/)
  await expect(page.locator('article').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Compartir', exact: true })).toHaveCount(0)
  await capturar(page, info, 'tarjetas-en-modo-live')
})
