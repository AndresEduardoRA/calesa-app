import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista, esMovil } from './soporte/inventario'
import { crearCampoDePrueba } from './soporte/leads-alta'
import { crearLead } from './soporte/leads'
import {
  delLead,
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { menuDeFila } from './soporte/leads-marcas'

// El patrón de lista en el listado de leads (9i, `.claude/rules/ui.md`): un clic en cualquier parte de la fila o la tarjeta lleva a la ficha
// (T340: no hay resumen), salvo el del «⋯» y el de un enlace de la fila; con el teclado se alcanza el nombre (un enlace) y Enter abre la
// ficha. Lo demás del enlace (Ctrl, el kanban, los enlaces viejos), en `leads-sin-resumen.spec.ts`.
test.describe.configure({ mode: 'serial' })

const CORTO = 'Patron fila'
let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  // Un campo de texto con una URL se dibuja como «Abrir enlace» y entra en la tabla y en la tarjeta.
  await crearCampoDePrueba({ clave: 'e2e_web', etiqueta: 'Web E2E', tipo: 'url', enTabla: true })
  await crearLead({
    nombre: CORTO,
    telefono: `59171${String(Math.floor(Math.random() * 900000) + 100000)}`,
    deQuien: t.personas.berta,
    atributos: { e2e_web: 'https://ejemplo.test/ana' },
  })
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const enlaceDelNombre = (page: Parameters<typeof irALeads>[0]) =>
  aLaVista(page.getByRole('link', { name: nombre(CORTO), exact: true }))

async function enLaFicha(page: Parameters<typeof irALeads>[0]) {
  await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: nombre(CORTO), level: 1 })).toBeVisible()
}

test('un clic en cualquier parte de la fila o la tarjeta lleva a la ficha', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  // La esquina de la fila o la tarjeta: ni el nombre ni una acción.
  await delLead(page, CORTO)
    .first()
    .click({ position: { x: 6, y: 6 } })
  await enLaFicha(page)
})

test('en la tabla, una celda cualquiera (el teléfono, el tipo) también lleva a la ficha', async ({
  page,
}) => {
  test.skip(esMovil(page), 'Las celdas son de la tabla; la tarjeta no las tiene.')
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await delLead(page, CORTO).first().getByRole('cell').nth(2).click()
  await enLaFicha(page)
})

test('el «⋯» y el enlace de la fila no llevan a la ficha', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  // El enlace se abre en otra pestaña y la fila no navega.
  const enlace = aLaVista(delLead(page, CORTO).getByRole('link', { name: 'Abrir enlace' }))
  // En la tabla el enlace está en una columna que se desplaza: se lleva a la vista, sin la columna pegada encima.
  await enlace.evaluate((a) => {
    const contenedor = a.closest('[data-slot="table-container"]')
    if (contenedor) {
      contenedor.scrollLeft = contenedor.scrollWidth
    }
  })
  const [otra] = await Promise.all([page.context().waitForEvent('page'), enlace.click()])
  await otra.close()
  await expect(page).toHaveURL(/\/leads$/)
  // El «⋯» abre su menú y no navega.
  await menuDeFila(page, CORTO).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await expect(page).toHaveURL(/\/leads$/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
})

test('con el teclado se alcanza el nombre y Enter abre la ficha', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await enlaceDelNombre(page).focus()
  await page.keyboard.press('Enter')
  await enLaFicha(page)
})

test('con el texto al 200 % el nombre sigue a la vista y lleva a la ficha', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await expect(enlaceDelNombre(page)).toBeVisible()
  await enlaceDelNombre(page).click()
  await enLaFicha(page)
})
