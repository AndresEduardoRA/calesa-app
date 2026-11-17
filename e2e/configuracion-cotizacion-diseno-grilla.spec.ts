import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { leerElPdf } from './soporte/cotizar-pdf'
import {
  borrarTonoDePrueba,
  crearTonoDePrueba,
  leerElBorradorDelDiseno,
  publicarElBorradorDelDiseno,
  publicarFormulaDeTresSumandos,
  publicarLaVersionConAspecto,
} from './soporte/diseno-editor'
import { capturar, sinScrollHorizontal, textoGrandeAlCargar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// La rejilla de la hoja (docs/UX.md › «Cotización: diseño (estados propios)»; docs/GLOSARIO.md › «Aspecto» y «Rejilla de la hoja»): en el editor, el ancho de una
// celda a 8 de 12, el orden de las secciones arrastrando y con el teclado, la densidad compacta y un tono en una sección, en vivo en la vista previa, y el borrador
// que pasa la validación de la base al publicarse. Una cotización de una versión con ese aspecto lo dibuja; una de la versión vieja se ve como siempre, y el PDF no
// cambia. El editor (Configuración) va sólo en escritorio; la hoja, en los dos proyectos, sobre un segundo origen con las dos versiones sembradas.
test.describe.configure({ mode: 'serial' })

let duena = ''
let tono = ''
let editor = { id: '', nombre: '' }
let hoja = { id: '', nombre: '' }
let deLaV1 = ''
let deLaV2 = ''

const laDeLaVersion = (origenId: string, version: number) =>
  sql(`
    select c.id from public.cotizaciones c join public.formulas f on f.id = c.formula_id
     where c.origen_id = ${literal(origenId)}::uuid and f.version = ${String(version)}
     order by c.creado_en desc, c.id desc limit 1`)

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  tono = `e2e_grilla_${proyecto}`
  borrarTonoDePrueba(tono)
  crearTonoDePrueba(tono)
  duena = correoDePrueba(`duena-grilla-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Greta Grilla' })
  editor = await crearOrigenDeCotizar(proyecto, 'dgrilla', false)
  publicarFormulaDeTresSumandos(editor.id)
  // El origen de la hoja: una cotización de la v1 (sin aspecto) y otra de la v2 (con el aspecto que arma el editor).
  hoja = await crearOrigenDeCotizar(proyecto, 'dgrillahoja', false)
  publicarFormulaDeTresSumandos(hoja.id)
  sembrarCotizaciones({ origenId: hoja.id, creadoPor: idDePersona(duena), cuantas: 1 })
  deLaV1 = laDeLaVersion(hoja.id, 1)
  publicarLaVersionConAspecto(hoja.id, tono)
  sembrarCotizaciones({ origenId: hoja.id, creadoPor: idDePersona(duena), cuantas: 1 })
  deLaV2 = laDeLaVersion(hoja.id, 2)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  borrarTonoDePrueba(tono)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const seccionDelEditor = (page: Page, id: string) => page.locator(`li[data-seccion="${id}"]`)
const vistaPrevia = (page: Page) => page.locator('[data-vista-previa] [data-hoja-de-prueba]')
const asaDeLaSeccion = (page: Page, titulo: string) =>
  page.getByRole('button', { name: `Mover la sección «${titulo}»`, exact: true })
const asaDeLaCelda = (page: Page, etiqueta: string) =>
  page.getByRole('button', { name: `Mover «${etiqueta}»`, exact: true })
const nodosDe = (lista: Locator, atributo: string) =>
  lista.evaluateAll((nodos, a) => nodos.map((n) => n.getAttribute(a)), atributo)
const idsDe = (lista: Locator) => nodosDe(lista, 'data-seccion')
const ordenDelEditor = (page: Page) => idsDe(page.locator('li[data-seccion]'))
const ordenDe = (lugar: Locator) => idsDe(lugar.locator('[data-secciones] [data-seccion]'))

// La celda (la XCell) de un nodo: su relleno, su fondo y su tramo en la rejilla de su sección.
async function celda(lugar: Locator, nodo: string) {
  return lugar.locator(`[data-nodo="${nodo}"]`).evaluate((envoltura) => {
    const xcell = envoltura.firstElementChild as HTMLElement
    const estilo = getComputedStyle(xcell)
    const rejilla = envoltura.parentElement as HTMLElement
    return {
      tramo: getComputedStyle(envoltura).gridColumnEnd,
      relleno: estilo.paddingTop,
      fondo: estilo.backgroundColor,
      proporcion: envoltura.getBoundingClientRect().width / rejilla.getBoundingClientRect().width,
    }
  })
}

// El ancho de una sección en rem y si sus celdas van en una sola columna.
async function medidaDeLaSeccion(lugar: Locator, id: string) {
  return lugar.locator(`[data-seccion="${id}"]`).evaluate((s) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    const izquierdas = [...s.querySelectorAll('[data-nodo]')].map((n) =>
      Math.round(n.getBoundingClientRect().left),
    )
    return {
      rem: s.getBoundingClientRect().width / rem,
      unaColumna: new Set(izquierdas).size === 1,
    }
  })
}

// Arrastra la fila de `origen` sobre la de `destino` (la de arriba) con el puntero, por sus asas. Primero centra la fila de destino: así las dos asas quedan a la
// vista y nada desplaza la página a mitad del gesto. El puntero va en pasos cortos (`steps`: el sensor toma la fila tras 4 px y la lleva con cada paso), con
// `force` (la fila arrastrada tapa el asa de destino).
async function arrastrar(page: Page, filaDeDestino: Locator, origen: string, destino: string) {
  await filaDeDestino.evaluate((fila) => {
    fila.scrollIntoView({ block: 'center' })
  })
  await asaDeLaCelda(page, origen).dragTo(asaDeLaCelda(page, destino), {
    steps: 25,
    force: true,
    targetPosition: { x: 22, y: 16 },
  })
}

// Mueve una sección un lugar con el teclado sobre su asa, esperando cada paso (el sensor engancha las flechas recién después de tomarla): tomada, el asa
// queda `aria-pressed`; cada movimiento y la suelta se anuncian.
async function moverConElTeclado(page: Page, titulo: string, flecha: string, lugar: number) {
  const anuncio = (texto: string) => expect(page.getByText(texto, { exact: true })).toBeAttached()
  const asa = asaDeLaSeccion(page, titulo)
  await asa.focus()
  await page.keyboard.press('Space')
  await expect(asa).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press(flecha)
  await anuncio(`«la sección ${titulo}» va en el lugar ${String(lugar)} de 3.`)
  await page.keyboard.press('Space')
  await anuncio(`Soltaste «la sección ${titulo}» en el lugar ${String(lugar)} de 3.`)
}

// La XCell de un nodo (el primer hijo de su lugar en la rejilla).
const xcellDe = (lugar: Locator, nodo: string) => lugar.locator(`[data-nodo="${nodo}"] > *`).first()

const FONDO_DEL_TONO = 'rgb(255, 247, 214)'

// @sin-celular: el editor del diseño es una pantalla de Configuración; en el celular el camino feliz va sólo en escritorio (e2e.md).
test('G1: el ancho de 8 de 12, el orden arrastrando y con el teclado, la densidad y el tono se ven en vivo y el borrador se publica', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/cotizacion?seccion=diseno&origen=${editor.id}`)
  await expect(page.getByRole('heading', { name: 'Diseño', level: 2 })).toBeVisible()

  // «Base» a lo ancho (12 columnas) y «Precio» en 8 de 12.
  const base = seccionDelEditor(page, 'base')
  await base.locator('[data-aspecto-de-la-seccion] summary').click()
  await base.getByLabel('Ancho en la hoja').selectOption('12')
  await page
    .locator('li[data-celda="precio"]')
    .getByLabel('Ancho', { exact: true })
    .selectOption('8')

  // Arrastrar «Flete» sobre «Precio» con el puntero los cambia de lugar (dos filas a la vista: una sección entera mide casi una pantalla, y arrastrar de
  // una a otra obligaría a desplazar la página a mitad del gesto). La vista previa va cerrada: cambia de alto con el diseño y movería lo de abajo.
  await arrastrar(page, page.locator('li[data-celda="precio"]'), 'Flete', 'Precio')
  await expect
    .poll(() => nodosDe(base.locator('li[data-celda]'), 'data-celda'))
    .toEqual(['flete', 'precio'])
  // Las secciones, con el teclado sobre su asa: Espacio la toma, la flecha la mueve y Espacio la suelta; cada paso se anuncia (y el siguiente lo espera).
  await moverConElTeclado(page, 'Resumen', 'ArrowUp', 2)
  await expect.poll(() => ordenDelEditor(page)).toEqual(['base', 'resumen', 'extras'])
  await moverConElTeclado(page, 'Base', 'ArrowDown', 2)
  await expect.poll(() => ordenDelEditor(page)).toEqual(['resumen', 'base', 'extras'])

  // «Base» compacta y con el tono.
  await base.getByLabel('Densidad').selectOption('compacta')
  await base.getByLabel('Color').selectOption({ label: `E2E ${tono}` })

  // La vista previa a 1.280 px dibuja todo sin guardar: el orden, «Precio» en 8 de 12, el tono y las celdas compactas (4 px de relleno) con su fondo.
  await page.getByRole('button', { name: 'Vista previa', exact: true }).click()
  await page
    .getByRole('group', { name: 'Ancho de la vista previa' })
    .getByRole('button', { name: '1.280 px', exact: true })
    .click()
  await expect(page.locator('[data-vista-previa]')).toHaveAttribute('data-ancho', '1280')
  await expect.poll(() => ordenDe(vistaPrevia(page))).toEqual(['resumen', 'base', 'extras'])
  await expect
    .poll(() =>
      nodosDe(vistaPrevia(page).locator('[data-seccion="base"] [data-nodo]'), 'data-nodo'),
    )
    .toEqual(['flete', 'precio'])
  await expect(vistaPrevia(page).locator('[data-nodo="precio"]')).toHaveCSS(
    'grid-column-end',
    'span 8',
  )
  await expect(vistaPrevia(page).locator('[data-seccion="base"]')).toHaveAttribute(
    'data-tono',
    tono,
  )
  await expect(xcellDe(vistaPrevia(page), 'precio')).toHaveCSS('padding-top', '4px')
  await expect(xcellDe(vistaPrevia(page), 'precio')).toHaveCSS('background-color', FONDO_DEL_TONO)

  // Guardar el borrador: queda el aspecto y el orden, y la base lo valida entero al publicarlo.
  await page.getByRole('button', { name: 'Guardar el borrador', exact: true }).click()
  await expect(page.locator('[data-guardado] [role="status"]')).toHaveText('Se guardó el borrador.')
  const borrador = leerElBorradorDelDiseno(editor.id)
  expect(borrador?.diseno.secciones.map((s) => s.id)).toEqual(['resumen', 'base', 'extras'])
  const enLaBase = borrador?.diseno.secciones.find((s) => s.id === 'base')
  expect(enLaBase).toMatchObject({ ancho: 12, densidad: 'compacta', tono })
  expect(enLaBase?.items.map((i) => i.nodo)).toEqual(['flete', 'precio'])
  expect(enLaBase?.items.find((i) => i.nodo === 'precio')?.ancho).toBe(8)
  publicarElBorradorDelDiseno(editor.id)
  expect(
    sql(
      `select version from public.formulas where origen_id = ${literal(editor.id)}::uuid and estado = 'publicada'`,
    ),
  ).toBe('2')
})

test('G2: una cotización de la versión con aspecto lo dibuja: el orden, el tono, la densidad y el ancho de 8 de 12, también al 200 %', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${deLaV2}`)
  const principal = page.locator('main')
  await expect(principal.locator('[data-secciones]')).toBeVisible()
  expect(await ordenDe(principal)).toEqual(['resumen', 'base', 'extras'])
  await expect(principal.locator('[data-seccion="base"]')).toHaveAttribute('data-tono', tono)
  const precio = await celda(principal, 'precio')
  expect(precio.relleno).toBe('4px')
  expect(precio.fondo).toBe(FONDO_DEL_TONO)
  // 8 de 12 si la sección le da 16 rem (mide 32 o más); si no, la fila entera.
  const medida = await medidaDeLaSeccion(principal, 'base')
  expect(precio.tramo).toBe(medida.rem >= 32 ? 'span 8' : 'span 12')
  await capturar(page, info, 'diseno-grilla-guardada-v2')

  await textoGrandeAlCargar(page)
  await page.reload()
  await expect(principal.locator('[data-secciones]')).toBeVisible()
  await sinScrollHorizontal(page)
  const alDoble = await medidaDeLaSeccion(principal, 'base')
  if (alDoble.rem < 32) expect(alDoble.unaColumna).toBe(true)
  else expect((await celda(principal, 'precio')).tramo).toBe('span 8')
  await capturar(page, info, 'diseno-grilla-guardada-v2-200')
})

test('G3: una cotización de la versión vieja se ve igual: su orden, las celdas a lo ancho, sin tono y con el relleno de siempre', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${deLaV1}`)
  const principal = page.locator('main')
  await expect(principal.locator('[data-secciones]')).toBeVisible()
  expect(await ordenDe(principal)).toEqual(['base', 'extras', 'resumen'])
  await expect(principal.locator('[data-secciones] [data-seccion][data-tono]')).toHaveCount(0)
  for (const nodo of ['precio', 'flete', 'aduana']) {
    const c = await celda(principal, nodo)
    expect(c.tramo, nodo).toBe('span 12')
    expect(c.relleno, nodo).toBe('8px')
  }
  await capturar(page, info, 'diseno-grilla-guardada-v1')
})

// @sin-celular: el PDF se arma en el servidor con su plantilla y no depende del ancho, del proyecto ni del tacto.
test('G4: el PDF de la versión con aspecto tiene las mismas líneas que el de la vieja, salvo el número y la fecha', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const sinNumeroNiFecha = (lineas: string[]) =>
    lineas.filter((l) => !/n\.º|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}/.test(l))
  const v1 = await leerElPdf(page, deLaV1)
  const v2 = await leerElPdf(page, deLaV2)
  expect(sinNumeroNiFecha(v2.lineas)).toEqual(sinNumeroNiFecha(v1.lineas))
})
