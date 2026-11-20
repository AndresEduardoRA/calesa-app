import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { desmontarSubasta, prepararSubasta, type EstadoDeApibara } from './soporte/apibara'
import { admin } from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { aLaVista, entrar, esMovil } from './soporte/inventario'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// Las tarjetas de la lista de `/vehiculos` (T337, `docs/UX.md` › «Vehículos»): todas miden lo mismo aunque el título ocupe una línea o no quepa en dos y
// falten datos; el chip «Lote N» va abajo a la izquierda de la foto (sin lote, no está); «Costo estimado» es la aprobada con su modo y abre «Compartir la cotización»;
// «Compra directa» es el campo de `pricing.buy_now_usd` o «—». La tabla suma «Lote», «Compra directa» y «Costo estimado». En un origen manual no hay
// lote ni compra directa. Sin llamadas a apibara.
test.describe.configure({ mode: 'serial' })

const T = {
  corta: 'Tarjeta Corta',
  larga:
    'Tarjeta Larga con un título que no cabe en dos líneas porque nombra la versión, el motor, la tracción, el color y el equipamiento completo',
  relleno: ['Tarjeta Relleno Uno', 'Tarjeta Relleno Dos', 'Tarjeta Relleno Tres'],
}
const LOTE = '75089446'

let duena = ''
let subasta = { id: '', nombre: '' }
let corea = { id: '', nombre: '' }
let apibaraAntes: EstadoDeApibara
let cotizacionId = ''

// Lo que este spec deja en el origen de subasta además de sus vehículos: la versión de la fórmula y la cotización (la limpieza de la subasta no las conoce).
function limpiarLoDeCotizar(): void {
  sql(`
    begin;
    set local session_replication_role = replica;
    delete from public.cotizaciones_aprobadas where origen_id in (select id from public.origenes where clave like '%subasta_apibara');
    delete from public.cotizaciones where origen_id in (select id from public.origenes where clave like '%subasta_apibara');
    delete from public.formulas where origen_id in (select id from public.origenes where clave like '%subasta_apibara');
    commit;`)
}

test.beforeAll(async ({}, info) => {
  limpiarLoDeCotizar()
  ;({ duena, subasta, apibaraAntes } = await prepararSubasta(info.project.name, [
    'cotizaciones.ver',
  ]))
  const [id = '', nombre = ''] = sql(
    `select id, nombre from public.origenes where clave like '%corea_inv' limit 1`,
  ).split('|')
  corea = { id, nombre }
  // El campo de la compra directa (`pricing.buy_now_usd`) nace apagado en el origen de subasta: se enciende.
  sql(
    `update public.origenes_campos set activo = true where origen_id = ${literal(subasta.id)}::uuid and clave_apibara = 'pricing.buy_now_usd'`,
  )
  // Un vehículo sin fase está «En subasta» sólo si el flujo del origen tiene una fase de subasta: sin ella la base lo deja en «fase» y no hay cuenta regresiva.
  sql(`
    insert into public.fases (flujo_id, nombre, orden, es_inicial, es_subasta)
    select fl.id, 'Subasta', 1, true, true
      from public.flujos fl
     where fl.ambito = 'vehiculos' and fl.origen_id = ${literal(subasta.id)}::uuid`)
  const filas = [
    {
      titulo: T.corta,
      lote: LOTE,
      estado_subasta: 'abierta',
      atributos: { puja_actual: 4250, compra_inmediata: 12500, dano_principal: 'Frontal' },
    },
    { titulo: T.larga, estado_subasta: 'abierta', atributos: {} },
    ...T.relleno.map((titulo, i) => ({
      titulo,
      lote: String(1000 + i),
      estado_subasta: 'abierta',
      atributos: { puja_actual: 1000 + i },
    })),
  ]
  for (const fila of filas) {
    const { error } = await admin()
      .from('vehiculos')
      .insert({ origen_id: subasta.id, ...fila })
    if (error) throw new Error(`No se pudo cargar ${fila.titulo}: ${error.message}`)
  }
  // Una versión publicada en el origen de subasta (copia de una de la semilla) con el modo «Unificado», y la cotización del vehículo corto con ese modo:
  // nace aprobada al rellenar (la siembra escribe sin triggers).
  sql(`
    begin;
    set local session_replication_role = replica;
    insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
    select ${literal(subasta.id)}::uuid, 1, 'publicada', f.definicion, f.params,
           coalesce(f.diseno, '{}') || jsonb_build_object('cabecera', coalesce(f.diseno -> 'cabecera', '{}')
             || jsonb_build_object('modos', jsonb_build_array(jsonb_build_object('clave', 'unificado', 'nombre', 'Unificado')))),
           f.visibilidad
      from public.formulas f where f.estado = 'publicada' order by f.creado_en limit 1;
    commit;`)
  const vehiculo = sql(
    `select id from public.vehiculos where origen_id = ${literal(subasta.id)}::uuid and titulo = ${literal(T.corta)}`,
  )
  sembrarCotizaciones({
    origenId: subasta.id,
    vehiculoId: vehiculo,
    creadoPor: idDePersona(duena),
    cuantas: 1,
  })
  cotizacionId =
    sql(`
    begin;
    set local session_replication_role = replica;
    update public.cotizaciones set modo_tc = 'unificado' where vehiculo_id = ${literal(vehiculo)}::uuid;
    commit;
    select public._cotizaciones_aprobadas_rellenar();
    select cotizacion_id from public.cotizaciones_aprobadas where vehiculo_id = ${literal(vehiculo)}::uuid;`)
      .split('\n')
      .filter((linea) => /^[0-9a-f-]{36}$/.test(linea))
      .at(-1) ?? ''
  expect(cotizacionId, 'la cotización del vehículo corto quedó aprobada').not.toBe('')
})

test.afterAll(async () => {
  limpiarLoDeCotizar()
  await desmontarSubasta(apibaraAntes)
})

const tarjetas = (page: Page): Locator => aLaVista(page.locator('li article'))
const tarjeta = (page: Page, titulo: string): Locator =>
  aLaVista(page.getByRole('listitem').filter({ hasText: titulo }))
const dato = (lugar: Locator, rotulo: string): Locator =>
  lugar.locator(`xpath=.//dt[normalize-space()="${rotulo}"]/following-sibling::dd[1]`)

// El diálogo de «Compartir» se carga al pedirlo: se espera a que esté antes de cerrarlo con Esc, y a que se vaya antes de mirar la URL.
async function cerrarElCompartir(page: Page): Promise<void> {
  const panel = page.getByRole('dialog', { name: 'Compartir cotización' })
  await expect(panel).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page).not.toHaveURL(/panel=compartir/)
}

async function alOrigen(page: Page, origenId: string, vista: 'tabla' | 'tarjetas'): Promise<void> {
  await page.goto(`/vehiculos?origen=${origenId}&vista=${vista}`)
  await expect(page.locator('tbody tr, li article').filter({ visible: true }).first()).toBeVisible()
}

test('E2E las tarjetas miden lo mismo, con el lote sobre la foto, el costo estimado y la compra directa', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await alOrigen(page, subasta.id, 'tarjetas')
  await expect(tarjetas(page)).toHaveCount(5)

  // Todas del mismo alto, con un título de una línea y otro que no cabe en dos (cortado, con el nombre entero en el enlace).
  const altos = await tarjetas(page).evaluateAll((todas) =>
    todas.map((una) => una.getBoundingClientRect().height),
  )
  expect(Math.max(...altos) - Math.min(...altos), `altos: ${altos.join(', ')}`).toBeLessThanOrEqual(
    1,
  )
  const larga = tarjeta(page, T.larga)
  const titulo = larga.locator('h3')
  expect(await titulo.evaluate((h) => h.scrollHeight > h.clientHeight + 2)).toBe(true)
  await expect(larga.getByRole('link', { name: T.larga })).toHaveAttribute('title', T.larga)
  const corta = tarjeta(page, T.corta)
  expect(await corta.locator('h3').evaluate((h) => h.scrollHeight <= h.clientHeight + 1)).toBe(true)

  // El chip del lote, abajo a la izquierda de la foto; sin lote, no está.
  const chip = corta.locator('[data-chip-del-lote]')
  await expect(chip).toHaveText(`Lote ${LOTE}`)
  const cajaChip = await chip.boundingBox()
  const cajaFoto = await chip.locator('..').boundingBox()
  expect(cajaChip && cajaFoto).toBeTruthy()
  if (cajaChip && cajaFoto) {
    expect(cajaChip.x - cajaFoto.x).toBeLessThanOrEqual(8)
    expect(cajaFoto.y + cajaFoto.height - (cajaChip.y + cajaChip.height)).toBeLessThanOrEqual(8)
    expect(cajaChip.y).toBeGreaterThan(cajaFoto.y + cajaFoto.height / 2)
  }
  await expect(larga.locator('[data-chip-del-lote]')).toHaveCount(0)

  // «Costo estimado»: el monto con su modo, en un botón que abre «Compartir la cotización» de la aprobada sin salir de la lista; «—» sin aprobada.
  const costo = dato(corta, 'Costo estimado').getByRole('button', {
    name: /^Compartir la cotización aprobada \(.*1[.,]234.* · Unificado\)$/,
  })
  await expect(costo).toHaveText(/1[.,]234.*·\s*Unificado/)
  await expect(dato(larga, 'Costo estimado')).toHaveText('—')
  await expect(dato(larga, 'Costo estimado').getByRole('button')).toHaveCount(0)
  await costo.click()
  await expect(page).toHaveURL(new RegExp(`panel=compartir.*para=${cotizacionId}`))
  expect(new URL(page.url()).pathname).toBe('/vehiculos')
  await cerrarElCompartir(page)

  // «Compra directa»: el valor de `pricing.buy_now_usd`, o «—»; el campo no se repite entre los «en tarjeta».
  await expect(dato(corta, 'Compra directa')).toHaveText(/12[.,]500/)
  await expect(dato(larga, 'Compra directa')).toHaveText('—')
  await expect(corta.getByText('Compra inmediata (USD)')).toHaveCount(0)
  // Un campo «en tarjeta» que el vehículo no trae dice «—» (la fila está igual).
  await expect(dato(corta, 'Daño principal')).toHaveText('Frontal')
  await expect(dato(larga, 'Daño principal')).toHaveText('—')
  await capturar(page, info, 'tarjetas-parejas')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'))
  await capturar(page, info, 'tarjetas-parejas-oscuro')
  await page.emulateMedia({ colorScheme: 'light' })
})

test('E2E la tabla suma el lote, la compra directa y el costo estimado', async ({ page }, info) => {
  test.skip(esMovil(page), 'en el celular no hay tabla: lo mira la prueba de las tarjetas')
  await entrar(page, duena)
  await alOrigen(page, subasta.id, 'tabla')
  for (const nombre of ['Lote', 'Compra directa', 'Costo estimado']) {
    await expect(page.getByRole('columnheader', { name: nombre, exact: true })).toBeVisible()
  }
  const fila = aLaVista(page.getByRole('row').filter({ hasText: T.corta }))
  await expect(fila).toContainText(LOTE)
  await expect(fila).toContainText(/12[.,]500/)
  await fila.getByRole('button', { name: /Compartir la cotización aprobada.*Unificado/ }).click()
  await expect(page).toHaveURL(new RegExp(`panel=compartir.*para=${cotizacionId}`))
  expect(new URL(page.url()).pathname).toBe('/vehiculos')
  await cerrarElCompartir(page)
  await expect(page.getByRole('columnheader', { name: 'Compra inmediata (USD)' })).toHaveCount(0)
  await capturar(page, info, 'tabla-con-lote-y-montos')
})

test('E2E en un origen manual no hay lote ni compra directa', async ({ page }, info) => {
  await entrar(page, duena)
  await alOrigen(page, corea.id, 'tarjetas')
  const primera = tarjetas(page).first()
  await expect(dato(primera, 'Costo estimado')).toBeVisible()
  await expect(primera.locator('xpath=.//dt[normalize-space()="Compra directa"]')).toHaveCount(0)
  await expect(page.locator('[data-chip-del-lote]:visible')).toHaveCount(0)
  await capturar(page, info, 'tarjetas-de-un-origen-manual')
  if (esMovil(page)) return
  await alOrigen(page, corea.id, 'tabla')
  await expect(
    page.getByRole('columnheader', { name: 'Costo estimado', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Lote', exact: true })).toHaveCount(0)
  await expect(page.getByRole('columnheader', { name: 'Compra directa', exact: true })).toHaveCount(
    0,
  )
})

// La cuenta regresiva del cierre (T421): arriba de la línea de datos de la tarjeta y debajo de «En subasta» en la tabla; avanza con el reloj de la página (un solo temporizador).
// El cierre se fija en la base y el reloj del navegador se pone a esa distancia; sin fecha, «Sin fecha de cierre».
test('E2E la cuenta regresiva del cierre avanza cada segundo en la tarjeta y en la tabla', async ({
  page,
}) => {
  const ahora = Math.floor(Date.now() / 1000) * 1000
  const faltan = ((2 * 24 + 4) * 60 * 60 + 12 * 60 + 33) * 1000
  sql(
    `update public.vehiculos set subasta_fin_en = ${literal(new Date(ahora + faltan).toISOString())}::timestamptz
      where origen_id = ${literal(subasta.id)}::uuid and titulo = ${literal(T.corta)}`,
  )
  // «Cierra en 2 d 04:11:33» a esa hora del reloj de la página.
  const textoA = (hora: number): string => {
    const total = Math.ceil((ahora + faltan - hora) / 1000)
    const dos = (n: number): string => String(n).padStart(2, '0')
    return `Cierra en ${Math.floor(total / 86400)} d ${dos(Math.floor((total % 86400) / 3600))}:${dos(Math.floor((total % 3600) / 60))}:${dos(total % 60)}`
  }
  await page.clock.install({ time: ahora })
  await entrar(page, duena)
  for (const vista of esMovil(page) ? (['tarjetas'] as const) : (['tarjetas', 'tabla'] as const)) {
    await alOrigen(page, subasta.id, vista)
    const lugar =
      vista === 'tabla'
        ? aLaVista(page.getByRole('row').filter({ hasText: T.corta }))
        : tarjeta(page, T.corta)
    const cuenta = lugar.locator('[data-cuenta-regresiva]')
    // Con el reloj corriendo, la primera vez que el texto cambia la página ya hidrató y el temporizador late: recién ahí se pausa.
    const inicial = (await cuenta.textContent()) ?? ''
    await expect(cuenta).not.toHaveText(inicial)
    const pausa = (await page.evaluate(() => Date.now())) + 60_000
    await page.clock.pauseAt(pausa)
    await expect(cuenta).toHaveText(textoA(pausa))
    await expect(cuenta).toHaveAttribute('data-cuenta-regresiva', 'normal')
    await page.clock.runFor(3000)
    await expect(cuenta).toHaveText(textoA(pausa + 3000))
    // Sin fecha de cierre, lo dice.
    await expect(
      (vista === 'tabla'
        ? aLaVista(page.getByRole('row').filter({ hasText: T.larga }))
        : tarjeta(page, T.larga)
      ).locator('[data-cuenta-regresiva]'),
    ).toHaveText('Sin fecha de cierre')
    await page.clock.resume()
  }
})
