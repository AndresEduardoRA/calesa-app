import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { idDe } from './soporte/leads'
import { rpcComo } from './soporte/leads-cartera'
import {
  abrirVerMas,
  cabeceraDeLaFicha,
  esperarFichaHidratada,
  irAFicha,
  modalDeDatos,
  nuevoLead,
  panelDeEdicion,
  ponerExtras,
  tituloDeLaFicha,
  type LeadDePrueba,
} from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { otorgarComo, seccionPortal } from './soporte/leads-portal'
import { capturar } from './soporte/recorrido'

// La columna izquierda de la ficha del lead (`docs/UX.md` › «Lead»): el «⋯» arriba a la derecha del nombre (sin «Cotizar» ni «Editar»
// sueltos), quién lo tiene bajo el nombre, los datos clave con «Notas» a lo ancho y «Ver más» (`?ver=datos`), «Compartir» y «Transferir» a
// todo el ancho y el portal con una línea de estado y un botón principal.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let completo: LeadDePrueba

const NOTAS = 'Primera línea\nSegunda línea\nTercera línea\nCuarta línea\nQuinta línea\nSexta línea'
const datoClave = (page: Page, etiqueta: string) =>
  page
    .locator('main section[aria-labelledby="datos-de-la-ficha"]')
    .locator(`dt:text-is("${etiqueta}") + dd`)

// La caja de algo a la vista (falla si no se dibujó).
async function caja(lugar: Locator) {
  const medida = await lugar.boundingBox()
  if (!medida) {
    throw new Error('No se dibujó')
  }
  return medida
}

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  completo = await nuevoLead({
    corto: `Izquierda ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.duena,
    atributos: { pais: 'Perú', notas: NOTAS },
  })
  await ponerExtras(completo.id, [{ telefono: completoCon(t, nacional()), etiqueta: 'Oficina' }])
  for (const quien of [t.personas.berta, t.personas.carlos]) {
    const { error } = await rpcComo(t.personas.duena, 'lead_compartir', {
      p_lead: completo.id,
      p_usuario: await idDe(quien),
    })
    expect(error).toBeNull()
  }
})

test.afterAll(async () => {
  await limpiarListado(t)
})

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
})

test('E2E la cabecera: el «⋯» arriba a la derecha del nombre y quién lo tiene debajo', async ({
  page,
}, info) => {
  await entrar(page, t.personas.duena)
  await irAFicha(page, completo.id)
  const titulo = tituloDeLaFicha(page, completo.nombre)
  await expect(titulo).toBeVisible()
  await esperarFichaHidratada(page)
  const cabecera = cabeceraDeLaFicha(page)
  const menu = cabecera.getByRole('button', { name: `Más acciones de ${completo.nombre}` })
  const [cajaDelMenu, cajaDelTitulo] = await Promise.all([caja(menu), caja(titulo)])
  expect(cajaDelMenu.width).toBeGreaterThanOrEqual(44)
  expect(cajaDelMenu.height).toBeGreaterThanOrEqual(44)
  // A la derecha del nombre y arriba: no debajo de él.
  expect(cajaDelMenu.x).toBeGreaterThan(cajaDelTitulo.x + 40)
  expect(cajaDelMenu.y).toBeLessThanOrEqual(cajaDelTitulo.y)
  // Ningún «Cotizar» ni «Editar» sueltos: viven en el «⋯».
  await expect(cabecera.getByRole('link')).toHaveCount(0)
  await expect(cabecera.getByRole('button', { name: /^Editar/ })).toHaveCount(0)
  await expect(cabecera.getByText(/^Dueño: .+ \(tú\) · Compartido con .+ y 1 más$/)).toBeVisible()
  await capturar(page, info, 'ficha')
  await menu.click()
  await expect(page.getByRole('menuitem', { name: 'Editar lead' })).toBeVisible()
})

test('E2E los datos clave: el país del campo y, sin él, el del teléfono; «Notas» a lo ancho y en 4 líneas', async ({
  page,
}, info) => {
  await entrar(page, t.personas.duena)
  await irAFicha(page, completo.id)
  await expect(datoClave(page, 'Tipo')).toBeVisible()
  await expect(datoClave(page, 'Origen del lead')).toBeVisible()
  await expect(datoClave(page, 'País')).toHaveText('Perú')
  await expect(datoClave(page, 'Teléfono principal').locator('a[href^="tel:"]')).toBeVisible()
  const notas = datoClave(page, 'Notas')
  await expect(notas).toContainText('Primera línea')
  const lista = page.locator('main section[aria-labelledby="datos-de-la-ficha"] dl')
  const [cajaDeNotas, cajaDeLaLista] = await Promise.all([caja(notas), caja(lista)])
  expect(Math.abs(cajaDeNotas.width - cajaDeLaLista.width)).toBeLessThanOrEqual(1)
  const alto = await notas.evaluate((dd) => {
    const linea = Number.parseFloat(getComputedStyle(dd).lineHeight)
    return dd.getBoundingClientRect().height / linea
  })
  expect(alto).toBeLessThanOrEqual(4.1)

  // Sin «País» y con un número de Bolivia, el país del teléfono; sólo el dueño: «Dueño: … (tú)».
  const sinPais = await nuevoLead({
    corto: `Sin país ${info.project.name}`,
    telefono: `591${nacional()}`,
    deQuien: t.personas.duena,
    atributos: { pais: '' },
  })
  await irAFicha(page, sinPais.id)
  await expect(datoClave(page, 'País')).toHaveText('Bolivia')
  await expect(cabeceraDeLaFicha(page).getByText(/^Dueño: .+ \(tú\)$/)).toBeVisible()
  await expect(datoClave(page, 'Notas')).toHaveText('Sin notas')
})

test('E2E «Ver más»: el modal por la URL con todo, Esc vuelve el foco y «Editar» lo reemplaza por el panel', async ({
  page,
}, info) => {
  await entrar(page, t.personas.duena)
  await irAFicha(page, completo.id)
  await esperarFichaHidratada(page)
  const modal = await abrirVerMas(page)
  await expect(page).toHaveURL(/[?&]ver=datos/)
  await expect(modal.getByRole('heading', { name: 'Ubicación', level: 3 })).toBeVisible()
  await expect(modal.getByRole('heading', { name: 'Teléfonos', level: 3 })).toBeVisible()
  await expect(modal.getByText('Oficina')).toBeVisible()
  await expect(modal.getByText('Sexta línea')).toBeVisible()
  await capturar(page, info, 'ver-mas')
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await expect(page.getByRole('button', { name: 'Ver más', exact: true })).toBeFocused()
  await expect(page).not.toHaveURL(/ver=/)

  // Recargar con `?ver=datos` lo abre; «Editar» deja sólo el panel de edición.
  await irAFicha(page, completo.id, '?ver=datos')
  await expect(modalDeDatos(page)).toBeVisible()
  await esperarFichaHidratada(page)
  await modalDeDatos(page).getByRole('button', { name: 'Editar', exact: true }).click()
  await expect(panelDeEdicion(page)).toBeVisible()
  await expect(modalDeDatos(page)).toHaveCount(0)
  // La URL la escribe nuqs un instante después del estado.
  await expect(page).toHaveURL(/[?&]panel=editar-lead/)
  await expect(page).not.toHaveURL(/[?&]ver=/)
})

test('E2E «Ver más» sin red: lo dice con «Reintentar» y la ficha sigue en pie', async ({
  page,
  context,
}) => {
  await entrar(page, t.personas.duena)
  await irAFicha(page, completo.id)
  await esperarFichaHidratada(page)
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Ver más', exact: true }).click()
  // El aviso, sobre la pantalla (sin red, otros diferidos que la página pide en ese momento dicen lo mismo, cada uno con su «Reintentar»).
  const avisos = page
    .locator('div.fixed.bottom-4')
    .filter({ hasText: 'Sin conexión. No se pudo abrir esto.' })
  await expect(avisos.first()).toBeVisible()
  await expect(modalDeDatos(page)).toHaveCount(0)
  await expect(tituloDeLaFicha(page, completo.nombre)).toBeVisible()
  await context.setOffline(false)
  await expect(async () => {
    if ((await avisos.count()) > 0) {
      await avisos.first().getByRole('button', { name: 'Reintentar' }).click({ timeout: 1000 })
    }
    await expect(modalDeDatos(page)).toBeVisible({ timeout: 1000 })
  }).toPass()
})

test('E2E «Compartir» y «Transferir» se reparten el ancho sin huecos, también con el texto al 200 %', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  await irAFicha(page, completo.id)
  const bloque = page.getByRole('region', { name: 'Quién lo tiene', exact: true })
  const compartir = bloque.getByRole('button', { name: 'Compartir', exact: true })
  const transferir = bloque.getByRole('button', { name: 'Transferir', exact: true })
  const lista = bloque.locator('ul')
  const medir = () => Promise.all([caja(compartir), caja(transferir), caja(lista)])
  let [a, b, ancho] = await medir()
  expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(1)
  expect(a.y).toBe(b.y)
  expect(Math.abs(b.x + b.width - a.x - ancho.width)).toBeLessThanOrEqual(1)

  // Al 200 %: sin huecos. Si no caben lado a lado (la columna angosta, el celular), apilados y cada uno a lo ancho; si caben, mitad y mitad.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await expect(async () => {
    ;[a, b, ancho] = await medir()
    // Apilados: cada uno a lo ancho; en una fila: de punta a punta entre los dos.
    const ocupado = b.y > a.y ? a.width : b.x + b.width - a.x
    expect(Math.abs(ocupado - ancho.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(1)
  }).toPass()
})

test('E2E el portal: «Dar acceso» sin acceso; con acceso, «Compartir acceso» copia el código y lo demás va en su «⋯»', async ({
  page,
}, info) => {
  const lead = await nuevoLead({
    corto: `Portal izquierda ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.duena,
  })
  await entrar(page, t.personas.duena)
  await irAFicha(page, lead.id)
  await expect(seccionPortal(page).getByText('Sin acceso', { exact: true })).toBeVisible()
  await expect(seccionPortal(page).getByRole('button', { name: 'Dar acceso' })).toBeVisible()
  await expect(seccionPortal(page).getByRole('button', { name: /^Más acciones/ })).toHaveCount(0)

  const otorgado = await otorgarComo(t.personas.duena, lead.id, 'clave-de-la-izquierda-1')
  await irAFicha(page, lead.id)
  await expect(seccionPortal(page).getByText(/^Tiene acceso desde /)).toBeVisible()
  await expect(seccionPortal(page).getByText(otorgado.codigo, { exact: true })).toBeVisible()
  await esperarFichaHidratada(page)
  await capturar(page, info, 'portal')
  await seccionPortal(page).getByRole('button', { name: 'Compartir acceso' }).click()
  await expect(seccionPortal(page).getByRole('button', { name: 'Código copiado' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(otorgado.codigo)
  await seccionPortal(page)
    .getByRole('button', { name: 'Más acciones de acceso al portal' })
    .click()
  await expect(page.getByRole('menuitem')).toHaveText(['Cambiar la clave', 'Quitar el acceso'])
})

test('E2E fuera de la cartera: el teléfono enmascarado con su aviso y «Ver más» sin «Editar»', async ({
  page,
}, info) => {
  const ajeno = await nuevoLead({
    corto: `Ajeno izquierda ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.carlos,
  })
  await entrar(page, t.personas.duena)
  await irAFicha(page, ajeno.id)
  const telefono = datoClave(page, 'Teléfono principal')
  await expect(telefono).toContainText('•')
  await expect(telefono).toContainText('Completo solo para su cartera.')
  await expect(telefono.locator('a')).toHaveCount(0)
  const modal = await abrirVerMas(page)
  await expect(modal.getByRole('button', { name: 'Cerrar', exact: true }).first()).toBeVisible()
  await expect(modal.getByRole('button', { name: /^Editar/ })).toHaveCount(0)
})
