import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  afirmarColumnasEnLaPagina,
  bloquesLlegaron,
  columnaLateral,
  columnaPrincipal,
  desplazamientoDeLaVentana,
  ESCRITORIO_BAJO,
  ESCRITORIO_GRANDE,
  medidaDe,
} from './soporte/ficha-con-desplazamiento-interno'
import { borrarLeadsDePrueba, crearLead, marcarInteres, vincular } from './soporte/leads'
import { borrarQueFalta, sembrarQueFalta, type TerrenoDeQueFalta } from './soporte/que-falta'
import { capturar } from './soporte/recorrido'
import { sembrarFotos } from './soporte/vehiculos-lista'

// El desplazamiento de la ficha del vehículo en escritorio (T423): la ventana no se desplaza y cada columna lo hace por dentro; «ir al bloque» (el
// índice y `?seccion=`) desplaza la columna derecha; al volver a la ficha, cada columna recupera su posición. En el celular, una columna con el
// desplazamiento de la página. Sobre el vehículo `uno` del terreno de «Qué falta», con un vinculado, dos interesados y dos fotos.
test.describe.configure({ mode: 'serial' })

let terreno: TerrenoDeQueFalta
let duena = ''
let id = ''
let titulo = ''

const variante = (proyecto: string) => `d_${proyecto}`

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarQueFalta(variante(proyecto))
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-ficha-desplazamiento-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Desplaza' })
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
  await sembrarFotos(id, 2)
})

test.afterAll(async ({}, info) => {
  await borrarQueFalta(variante(info.project.name))
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const indice = (page: Page): Locator => page.getByRole('navigation', { name: 'Índice de la ficha' })
const tituloDe = (page: Page, nombre: string): Locator =>
  page.locator('main').getByRole('heading', { name: nombre, exact: true, level: 2 })

async function alaFicha(page: Page, busqueda = ''): Promise<void> {
  await page.goto(`/vehiculos/${id}${busqueda}`)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
  await expect(indice(page)).toHaveAttribute('data-hidratado', 'true')
}

test('en escritorio la ventana no se desplaza y cada columna lo hace por dentro; en el celular, la página', async ({
  page,
}, info) => {
  await entrar(page, duena)
  if (info.project.name !== 'escritorio') {
    await alaFicha(page)
    await afirmarColumnasEnLaPagina(page)
    return
  }
  await page.setViewportSize(ESCRITORIO_GRANDE)
  await alaFicha(page)
  expect(await desplazamientoDeLaVentana(page)).toBeLessThanOrEqual(1)
  expect((await medidaDe(columnaPrincipal(page))).overflowY).toBe('auto')
  expect((await medidaDe(columnaLateral(page))).overflowY).toBe('auto')
  await capturar(page, info, 'escritorio-grande')
  // Con una ventana baja, cada columna tiene su desplazamiento y lo que no cabía se alcanza con el teclado.
  await page.setViewportSize(ESCRITORIO_BAJO)
  await expect.poll(async () => (await medidaDe(columnaPrincipal(page))).sobra).toBeGreaterThan(0)
  await expect.poll(async () => (await medidaDe(columnaLateral(page))).sobra).toBeGreaterThan(0)
  await expect(columnaLateral(page)).toHaveAttribute('tabindex', '0')
  await expect(columnaPrincipal(page)).toHaveAttribute('tabindex', '0')
  // «Ir al bloque» desplaza la columna derecha, no la ventana, y deja el índice a la vista.
  const enlace = indice(page).getByRole('link', { name: 'Vitrina' })
  await enlace.click()
  await expect(tituloDe(page, 'Vitrina')).toBeFocused()
  await expect(tituloDe(page, 'Vitrina')).toBeInViewport()
  await expect(enlace).toHaveAttribute('aria-current', 'location')
  expect((await medidaDe(columnaPrincipal(page))).arriba).toBeGreaterThan(0)
  expect(await desplazamientoDeLaVentana(page)).toBeLessThanOrEqual(1)
  await expect(indice(page)).toBeInViewport()
  await capturar(page, info, 'columna-derecha-desplazada')
  await columnaLateral(page).evaluate((e) => {
    e.scrollTop = e.scrollHeight
  })
  await capturar(page, info, 'columna-izquierda-desplazada')
})

test('`?seccion=` desplaza la columna derecha y, al volver a la ficha, cada columna recupera su posición', async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== 'escritorio',
    'en el celular la página se desplaza y el navegador recuerda su posición',
  )
  await entrar(page, duena)
  await page.setViewportSize(ESCRITORIO_BAJO)
  await alaFicha(page, '?seccion=vitrina')
  await expect(tituloDe(page, 'Vitrina')).toBeFocused()
  await expect(tituloDe(page, 'Vitrina')).toBeInViewport()
  expect(await desplazamientoDeLaVentana(page)).toBeLessThanOrEqual(1)
  await bloquesLlegaron(page)
  const principal = (await medidaDe(columnaPrincipal(page))).arriba
  expect(principal).toBeGreaterThan(0)
  await columnaLateral(page).evaluate((e) => {
    e.scrollTop = e.scrollHeight
  })
  const lateral = (await medidaDe(columnaLateral(page))).arriba
  expect(lateral).toBeGreaterThan(0)
  // Se va al inventario del origen por el enlace de la ficha y se vuelve con «atrás».
  await page.getByRole('link', { name: terreno.origen.nombre, exact: true }).click()
  await expect(page).toHaveURL(/\/vehiculos\?origen=/)
  await page.goBack()
  await expect(tituloDe(page, 'Vitrina')).toBeVisible()
  await expect.poll(async () => (await medidaDe(columnaLateral(page))).arriba).toBe(lateral)
  await expect.poll(async () => (await medidaDe(columnaPrincipal(page))).arriba).toBe(principal)
})
