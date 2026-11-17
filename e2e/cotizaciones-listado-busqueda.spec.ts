import { entrar } from './soporte/alta'
import {
  LOTE,
  VIN,
  buscador,
  buscarPorUrl,
  deLaPrueba,
  filas,
  irA,
  limpiarListadoDeAcciones,
  numerosDeLasFilas,
  prepararListadoDeAcciones,
  type TerrenoDeLasAcciones,
} from './soporte/listado-de-cotizaciones-acciones'
import { expect, test } from './soporte/prueba'
import { literal, sql } from './soporte/sql'
import { abrirVistaYOpciones } from './soporte/vista-y-opciones'

// El buscador y las vistas guardadas del listado `/cotizaciones` (T15, `docs/UX.md` › «Cotizaciones»): se busca por número, cliente, vehículo (título, VIN y lote) y autor; quien no ve a un
// lead o a un vehículo no encuentra por él; sin resultados ofrece «Limpiar búsqueda»; y una vista guardada se abre desde otra pantalla del listado. El terreno es
// `soporte/listado-de-cotizaciones-acciones.ts`.
test.describe.configure({ mode: 'serial' })

let terreno: TerrenoDeLasAcciones

test.beforeAll(async ({}, info) => {
  terreno = await prepararListadoDeAcciones(info.project.name)
})

test.afterAll(async () => {
  await limpiarListadoDeAcciones()
})

test('E2E buscar por número, cliente, vehículo (título, VIN y lote) y autor', async ({ page }) => {
  await entrar(page, terreno.t.duena, { fresco: true })
  // El número, exacto (con #: sólo número).
  await buscarPorUrl(page, `#${terreno.numeros[1]}`)
  expect(await numerosDeLasFilas(page)).toEqual([terreno.numeros[1]])
  // El cliente: por parte del nombre, sin importar mayúsculas.
  await buscarPorUrl(page, terreno.nombreDelCliente.toUpperCase())
  expect((await numerosDeLasFilas(page)).toSorted()).toEqual(terreno.numeros.toSorted())
  // El vehículo: por título, por VIN y por lote.
  for (const texto of ['mascota', VIN, LOTE]) {
    await buscarPorUrl(page, texto)
    expect((await numerosDeLasFilas(page)).toSorted(), texto).toEqual(terreno.numeros.toSorted())
  }
  // El autor: Ana tiene una sola, y la dueña no la tiene.
  await buscarPorUrl(page, 'Ana Papelera')
  expect(await numerosDeLasFilas(page)).toEqual([terreno.numeroDeAna])
  await buscarPorUrl(page, terreno.nombreDeLaDuena)
  expect(await numerosDeLasFilas(page)).not.toContain(terreno.numeroDeAna)
  expect((await numerosDeLasFilas(page)).toSorted()).toEqual(
    expect.arrayContaining(terreno.numeros),
  )
})

test('E2E el campo de búsqueda escribe la URL, pide un mínimo y, sin resultados, ofrece «Limpiar búsqueda»', async ({
  page,
}) => {
  await irA(page, terreno.t.duena, deLaPrueba())
  await expect(filas(page).first()).toBeVisible()
  const campo = buscador(page)
  // Con menos de tres letras no busca y lo dice junto al campo.
  await campo.fill('ab')
  await expect(page.getByText('Escribe al menos 3 letras o un número')).toBeVisible()
  await expect(page).not.toHaveURL(/q=ab/)
  await campo.fill('mascota')
  await expect(page).toHaveURL(/q=mascota/)
  await expect(filas(page)).toHaveCount(3)
  // Sin coincidencias: el vacío dice qué se buscó y «Limpiar búsqueda» devuelve la lista.
  await campo.fill('nadiequeseallame')
  await expect(page.getByText('Ninguna cotización coincide con «nadiequeseallame».')).toBeVisible()
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click()
  await expect(page).not.toHaveURL(/q=/)
  await expect(filas(page).first()).toBeVisible()
  expect(await filas(page).count()).toBeGreaterThan(3)
})

test('E2E quien no ve a un lead o a un vehículo no encuentra por él', async ({ page }) => {
  // Vera ve las cotizaciones de todos, pero ni leads ni vehículos.
  await entrar(page, terreno.t.soloVer, { fresco: true })
  await buscarPorUrl(page, terreno.nombreDelCliente)
  expect(await numerosDeLasFilas(page)).toEqual([])
  await buscarPorUrl(page, 'mascota')
  expect(await numerosDeLasFilas(page)).toEqual([])
  await buscarPorUrl(page, VIN)
  expect(await numerosDeLasFilas(page)).toEqual([])
  // Sí por número y por autor.
  await buscarPorUrl(page, `#${terreno.numeros[0]}`)
  expect(await numerosDeLasFilas(page)).toEqual([terreno.numeros[0]])
  await buscarPorUrl(page, 'Ana Papelera')
  expect(await numerosDeLasFilas(page)).toEqual([terreno.numeroDeAna])
})

test('E2E guardar una vista con la búsqueda y abrirla desde otra pantalla del listado', async ({
  page,
}) => {
  await irA(page, terreno.t.duena, `${deLaPrueba()}&q=mascota&clase=preventa`)
  await expect(filas(page)).toHaveCount(3)
  await abrirVistaYOpciones(page)
  await page.getByLabel('Guardar los filtros de ahora').fill('E2E Mascotas')
  await page.getByRole('button', { name: 'Guardar vista' }).click()
  await expect(page.getByText('Vista «E2E Mascotas» guardada')).toBeVisible()
  const guardada = sql(
    `select params::text from public.vistas_guardadas v join public.perfiles p on p.id = v.usuario_id where p.email = ${literal(terreno.t.duena)} and v.pantalla = 'cotizaciones' and v.nombre = 'E2E Mascotas'`,
  )
  expect(JSON.parse(guardada)).toEqual({
    origen: terreno.t.origen.id,
    q: 'mascota',
    clase: 'preventa',
  })

  // Desde el listado sin nada puesto, aplicarla vuelve a poner la búsqueda y los filtros.
  await page.goto('/cotizaciones')
  await expect(filas(page).first()).toBeVisible()
  await abrirVistaYOpciones(page)
  await page.getByRole('button', { name: 'E2E Mascotas', exact: true }).click()
  await expect(page).toHaveURL(/q=mascota/)
  await expect(page).toHaveURL(/clase=preventa/)
  await expect(filas(page)).toHaveCount(3)
  await expect(page.getByRole('searchbox').first()).toHaveValue('mascota')
})
