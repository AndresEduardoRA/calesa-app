import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarOrigenesDeCotizar } from './soporte/cotizar-formula'
import { plantillaSobre } from '../src/modules/cotizaciones/infra/plantilla/rpc-de-la-plantilla'
import {
  borradorGuardado,
  borrarLasPlantillasDelOrigen,
  casillaDelLienzo,
  comoTexto,
  crearConfiguradoraDeTarjeta,
  cuadriculaValida,
  escribirEnLaCelda,
  limpiarTerrenoDePlantilla,
  prepararTerrenoDePlantilla,
  sembrarBorradorDePlantilla,
  tarjetaDibujada,
  visibilidadDeLaMini,
  type TerrenoDePlantilla,
} from './soporte/plantilla'

// @sin-celular-archivo: editor de Configuración que se usa en una pantalla de al menos 1.024 px; el celular ve un aviso y la tarjeta en sólo lectura

// El conflicto y los avisos del editor de la tarjeta (T325): el PT409 de la base se dice tal cual junto a lo escrito en el lienzo; lo que sólo ve la fórmula (un nodo o
// un tipo de cambio de otro nivel que la cuadrícula nombra) avisa que no se podría publicar y no apaga «Guardar borrador». Los avisos de un tono que ya no está y de un
// grupo que la fórmula ya no tiene eran del editor de la forma 1 (sus bloques de grupos): ya no existen.
test.describe.configure({ mode: 'serial' })

let terreno: TerrenoDePlantilla | undefined
let configuradora = ''

const origenId = () => {
  if (!terreno) throw new Error('No hay terreno.')
  return terreno.origenId
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  terreno = await prepararTerrenoDePlantilla(info.project.name, 'tarjconf')
  configuradora = await crearConfiguradoraDeTarjeta(info.project.name, 'tarjconf', [origenId()])
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarTerrenoDePlantilla()
  borrarOrigenesDeCotizar()
})

test.beforeEach(() => {
  borrarLasPlantillasDelOrigen(origenId())
})

async function abrirTarjeta(page: Page) {
  await entrar(page, configuradora, { fresco: true })
  await page.goto(`/configuracion/origenes/${origenId()}/formula/tarjeta`)
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  await expect(page.getByRole('grid', { name: 'Lienzo de la tarjeta' })).toBeVisible()
}

const guardar = (page: Page) => page.getByRole('button', { name: 'Guardar borrador' })
const delTitulo = (page: Page) => tarjetaDibujada(page).locator('[data-fila="f_titulo"]')

test('E3: un PT409 se dice con el mensaje de la base, conserva lo escrito, no envía y «Recargar» trae lo de la otra persona', async ({
  page,
}) => {
  const esperada = sembrarBorradorDePlantilla(origenId(), cuadriculaValida('inicial'))
  await abrirTarjeta(page)
  // Otra sesión guarda antes.
  if (!terreno) throw new Error('No hay terreno.')
  const otra = await plantillaSobre(terreno.duena).guardar({
    origenId: origenId(),
    // La otra persona escribe en la fórmula de trabajo, la única del origen.
    formulaDelOrigenId: null,
    esperada,
    definicion: cuadriculaValida('de la otra persona'),
  })
  if (!otra.ok) throw new Error(otra.error.mensaje)
  await escribirEnLaCelda(page, casillaDelLienzo(page, 0, 0), 'Lo mío')
  await guardar(page).click()
  await expect(page.getByText(/El borrador de esta plantilla cambió/)).toBeVisible()
  await expect(delTitulo(page)).toHaveText('Lo mío')
  await expect(page.getByRole('link', { name: /Ver cómo quedó/ })).toHaveAttribute(
    'href',
    `/configuracion/origenes/${origenId()}/formula/tarjeta`,
  )
  await expect(guardar(page)).toBeDisabled()
  expect(comoTexto(borradorGuardado(origenId())?.definicion)).toContain('Título de la otra persona')
  await page.getByRole('button', { name: /^Recargar$/ }).click()
  await expect(page.getByText(/El borrador de esta plantilla cambió/)).toHaveCount(0)
  await expect(delTitulo(page)).toHaveText('Título de la otra persona')
})

test('E6: un nodo de otro nivel que la cuadrícula nombra avisa que no se podría publicar y «Guardar borrador» sigue activo', async ({
  page,
}) => {
  sembrarBorradorDePlantilla(origenId(), cuadriculaValida('e6'))
  visibilidadDeLaMini(origenId(), { fees: { ver: 'costos' } })
  await abrirTarjeta(page)
  await expect(
    page.getByText(
      'Con esto no se podría publicar: La tarjeta no puede mostrar lo que nombra la celda «c_fees»: no es del nivel «todos».',
    ),
  ).toBeVisible()
  // Sin cambios «Guardar borrador» está apagado; con uno, sólo la forma lo apagaría.
  await escribirEnLaCelda(page, casillaDelLienzo(page, 0, 0), 'Otro título')
  await expect(guardar(page)).toBeEnabled()
  await guardar(page).click()
  await expect(page.getByText('Se guardó el borrador.')).toBeVisible()
  await expect
    .poll(() => comoTexto(borradorGuardado(origenId())?.definicion))
    .toContain('Otro título')
})

test('E6 (variante): una celda con el tipo de cambio de un bucket de otro nivel avisa que no se podría publicar', async ({
  page,
}) => {
  const base = cuadriculaValida('e6b')
  sembrarBorradorDePlantilla(origenId(), {
    ...base,
    celdas: [
      ...base.celdas,
      {
        id: 'c_tc',
        fila: 'f_fees',
        columna: 'monto',
        contenido: { tipo: 'dato', nodo: 'nacionalizacion', mostrar: 'tc_valor' },
      },
    ],
  })
  // `fees` vuelve a «todos»: si no, ganaría `nodo_restringido`.
  visibilidadDeLaMini(origenId(), { fees: { ver: 'todos' }, tc_adu: { ver: 'costos' } })
  await abrirTarjeta(page)
  await expect(
    page.getByText(
      'Con esto no se podría publicar: La tarjeta no puede nombrar el tipo de cambio de la celda «c_tc»: no es del nivel «todos».',
    ),
  ).toBeVisible()
  await escribirEnLaCelda(page, casillaDelLienzo(page, 0, 0), 'Con el tipo de cambio')
  await expect(guardar(page)).toBeEnabled()
})
