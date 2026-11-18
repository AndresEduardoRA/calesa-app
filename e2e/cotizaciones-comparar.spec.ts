import { CONTRASENA, entrar } from './soporte/alta'
import { correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './soporte/base'
import {
  limpiarFinal,
  prepararFinal,
  sembrarParaMarcar,
  type TerrenoDeLaFinal,
} from './soporte/cotizaciones-final'
import { expect, test, type Page } from './soporte/prueba'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// «Comparar cotizaciones» (`docs/UX.md` › «Comparar cotizaciones»): desde «De este vehículo» se eligen 2 o 3 y «Comparar» abre `/cotizaciones/comparar?ids=…&returnTo=`,
// con una columna por cotización alineada por nodo, lo distinto resaltado contra la primera, «—» en el nodo que una versión no tiene, y «Aprobar esta» al pie (la base lo
// confirma). Quien no ve el nivel «costos» no recibe esas filas; ids de dos vehículos dicen el mensaje con «Volver». El terreno es el de `soporte/cotizaciones-final.ts`
// (sembrado sin triggers): la versión archivada de la fórmula, los valores y los totales se ponen por SQL; la limpieza borra el origen con sus versiones.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaFinal
// Ve las cotizaciones y los vehículos del origen, sin el nivel «costos» y sin aprobar. La borra `limpiarFinal()`.
let sinCostos: string
// Del vehículo: la más vieja (la aprobada), la del medio (con un monto mayor) y la más nueva (de la versión archivada, sin la celda «Dependiente»).
let vehiculo = ''
let vieja = ''
let medio = ''
let nueva = ''

test.beforeAll(async ({}, info) => {
  t = await prepararFinal(info.project.name)
  sinCostos = correoDePrueba(`sin-costos-comparar-${info.project.name}`)
  await crearPersona({
    email: sinCostos,
    contrasena: CONTRASENA,
    nombre: 'Coco Sin Costos',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinCostos,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Comparar sin costos ${info.project.name}`,
      clave: `e2e_comparar_sin_costos_${info.project.name}`,
    },
    permisos: [
      { clave: 'cotizaciones.ver', origenId: t.origen.id, alcance: 'todos' },
      { clave: 'vehiculos.ver', origenId: t.origen.id, alcance: 'todos' },
    ],
  })
  const { vehiculoId } = await sembrarParaMarcar(t, 'Comparar E1', { cuantas: 3 })
  vehiculo = vehiculoId ?? ''
  sql('select public._cotizaciones_aprobadas_rellenar();')
  ;[vieja = '', medio = '', nueva = ''] = sql(
    `select id from public.cotizaciones where vehiculo_id = ${literal(vehiculo)}::uuid order by creado_en, id`,
  )
    .split('\n')
    .filter((id) => id !== '')
  const origen = `${literal(t.origen.id)}::uuid`
  // La versión 1 archivada: la de hoy sin la celda «Dependiente» (`dep`) en su primera sección; la publicada pasa a ser la 2. La más nueva es de la archivada.
  sql(`
    begin;
    set local session_replication_role = replica;
    do $f$
    declare v public.formulas;
    begin
      select * into v from public.formulas where origen_id = ${origen} and estado = 'publicada';
      update public.formulas set version = 2 where id = v.id;
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (v.origen_id, 1, 'archivada', v.definicion, v.params,
              jsonb_set(v.diseno, '{secciones,0,items}',
                        (select jsonb_agg(i) from jsonb_array_elements(v.diseno -> 'secciones' -> 0 -> 'items') i where i ->> 'nodo' is distinct from 'dep')),
              v.visibilidad, 'Archivada E2E comparar', now() - interval '1 day');
    end $f$;
    update public.cotizaciones set formula_id = (select id from public.formulas where origen_id = ${origen} and version = 1)
      where id = ${literal(nueva)}::uuid;
    update public.cotizaciones set valores = jsonb_set(valores, '{pub}', '999'), totales = '{"usd": 2000}', total_base = 2000
      where id = ${literal(medio)}::uuid;
    commit;`)
})

test.afterAll(async () => {
  await limpiarFinal()
})

const columna = (page: Page, id: string) => page.locator(`th[data-columna="${id}"]`)
const celda = (page: Page, nodo: string, id: string) =>
  page.locator(`[data-celda-comparada][data-nodo="${nodo}"][data-columna="${id}"]`)
const aprobadaDe = (): string =>
  sql(
    `select coalesce((select cotizacion_id::text from public.cotizaciones_aprobadas where vehiculo_id = ${literal(vehiculo)}::uuid), '')`,
  )

const rutaDeComparar = (ids: string[], volverA: string) =>
  `/cotizaciones/comparar?ids=${ids.join(',')}&returnTo=${encodeURIComponent(volverA)}`

async function abrir(page: Page, correo: string, ruta: string): Promise<void> {
  await page.context().clearCookies()
  await entrar(page, correo, { fresco: true })
  await page.goto(ruta)
}

test('E2E dos versiones lado a lado: alineadas por nodo, «—» en la que no tiene el nodo y lo distinto resaltado', async ({
  page,
}, info) => {
  await abrir(page, t.duena, rutaDeComparar([nueva, medio], `/cotizaciones/${vieja}`))
  await expect(page.getByRole('heading', { name: 'Comparar cotizaciones', level: 1 })).toBeVisible()
  await expect(page.locator('thead th[data-columna]')).toHaveCount(2)
  // La celda que la versión archivada no tiene: «—» en esa columna, con su texto para el lector.
  await expect(celda(page, 'dep', nueva)).toContainText('No está en esta versión')
  await expect(celda(page, 'dep', medio)).not.toContainText('No está en esta versión')
  // El monto mayor de la segunda, contra la primera.
  await expect(celda(page, 'pub', medio)).toHaveAttribute('data-distinta', '')
  await expect(celda(page, 'pub', medio)).toContainText('Más que la primera')
  await expect(celda(page, 'pub', nueva)).not.toHaveAttribute('data-distinta', '')
  await expect(columna(page, medio).locator('[data-total-comparado]')).toHaveAttribute(
    'data-distinta',
    '',
  )
  // La dueña ve el nivel «costos».
  await expect(page.locator('[data-fila-comparada="x_celda"]')).toHaveCount(1)
  // Ninguna cifra en un `aria-label` ni en un `title` de la tabla.
  const conCifras = await page
    .locator('[data-tabla-de-comparar] [aria-label], [data-tabla-de-comparar] [title]')
    .evaluateAll((es) =>
      es
        .map((e) => `${e.getAttribute('aria-label') ?? ''}${e.getAttribute('title') ?? ''}`)
        .filter((texto) => /\d{2,}/.test(texto) && !/^Abrir la n\.º \d+$/.test(texto)),
    )
  expect(conCifras).toEqual([])
  await sinScrollHorizontal(page)
  await capturar(page, info, 'comparar')
})

test('E2E «Aprobar esta» en la segunda columna la vuelve la aprobada sin recargar', async ({
  page,
}) => {
  expect(aprobadaDe()).toBe(vieja)
  await abrir(page, t.duena, rutaDeComparar([nueva, medio], `/cotizaciones/${vieja}`))
  await expect(columna(page, medio)).not.toHaveAttribute('data-aprobada', '')
  await page.locator('tfoot').getByRole('button', { name: 'Aprobar esta' }).nth(1).click()
  await expect(columna(page, medio)).toHaveAttribute('data-aprobada', '')
  await expect(columna(page, medio).locator('[data-insignia="aprobada"]')).toBeVisible()
  await expect.poll(aprobadaDe).toBe(medio)
  // El pie de la aprobada lleva la insignia en lugar del botón.
  await expect(page.locator('tfoot').getByRole('button', { name: 'Aprobar esta' })).toHaveCount(1)
})

test('E2E sin el nivel «costos» no llegan esas filas, y sin aprobar «Aprobar esta» está apagado con su motivo', async ({
  page,
}) => {
  await abrir(page, sinCostos, rutaDeComparar([nueva, medio], `/cotizaciones/${vieja}`))
  await expect(page.locator('thead th[data-columna]')).toHaveCount(2)
  await expect(page.locator('[data-fila-comparada="pub"]')).toHaveCount(1)
  await expect(page.locator('[data-fila-comparada="x_celda"]')).toHaveCount(0)
  const boton = page.locator('tfoot').getByRole('button', { name: 'Aprobar esta' }).first()
  await expect(boton).toBeDisabled()
  await expect(boton).toHaveAccessibleDescription(
    /^Para aprobar hace falta permiso en «.+»: pídeselo a quien administra los roles\.$/,
  )
  await sinScrollHorizontal(page)
})

test('E2E ids de dos vehículos: el mensaje y «Volver» a donde se vino', async ({ page }) => {
  const { ids } = await sembrarParaMarcar(t, 'Comparar E4', { cuantas: 1 })
  await abrir(page, t.duena, rutaDeComparar([vieja, ids[0] ?? ''], `/cotizaciones/${vieja}`))
  await expect(
    page.getByText('Sólo se comparan 2 o 3 cotizaciones del mismo vehículo que puedas ver.'),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Volver' }).click()
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/${vieja}$`))
})
