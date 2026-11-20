// Lo que prepara y mide `e2e/configuracion-tarjeta-arrastrar.spec.ts` (el editor de la tarjeta queda quieto tras arrastrar un borde): un origen de subasta con la
// fórmula copiada, quien lo configura y un borrador ancho y alto (8 columnas de 190 px y 60 filas de 30 px: con «Ajustar» la escala es ≈ 0,38 y el lienzo es más
// alto que el panel, así el alto de la página depende de la escala). Y los ayudantes que miden si el lienzo oscila: las muestras, el barrido de alto de la
// ventana y la sonda de las barras. Todo lleva la raíz `tjarrastre` y se borra con `limpiarTerrenoDeArrastrar()`.
import type { PlantillaEnCuadricula } from '../../src/modules/cotizaciones/entities/cuadricula-de-la-tarjeta'
import { CONTRASENA } from './alta'
import { correoDePrueba, crearDuenaDePrueba } from './base'
import { expect, type Page } from './prueba'
import { crearOrigenDePrueba, PREFIJO_CLAVE_E2E } from './origenes'
import { crearConfiguradoraDeTarjeta, sembrarBorradorDePlantilla } from './plantilla'
import { sql } from './sql'
import { copiarLaFormulaDeLaSubasta } from './tarjeta-cuadricula'

const RAIZ = 'tjarrastre'

export const COLUMNAS = 8
export const ANCHO_DE_COLUMNA = 190
export const FILAS = 60
export const ALTO_DE_FILA = 30

// Un título combinado arriba, y la etiqueta y el monto del remate y del total; lo demás, casillas vacías.
export const PLANTILLA_ANCHA_Y_ALTA: PlantillaEnCuadricula = {
  forma: 2,
  columnas: Array.from({ length: COLUMNAS }, (_, k) => ({
    id: `k${String(k)}`,
    ancho: ANCHO_DE_COLUMNA,
  })),
  filas: Array.from({ length: FILAS }, (_, f) => ({
    id: `f${String(f)}`,
    alto: ALTO_DE_FILA,
    ocultar_si: 'nunca' as const,
  })),
  celdas: [
    {
      id: 'c_titulo',
      fila: 'f0',
      columna: 'k0',
      abarca_columnas: 3,
      contenido: { tipo: 'texto', texto: 'Cotización de prueba' },
    },
    {
      id: 'c_remate',
      fila: 'f2',
      columna: 'k0',
      contenido: { tipo: 'dato', nodo: 'remate', mostrar: 'etiqueta' },
    },
    {
      id: 'c_remate_monto',
      fila: 'f2',
      columna: 'k1',
      contenido: { tipo: 'dato', nodo: 'remate', mostrar: 'monto' },
    },
    {
      id: 'c_total',
      fila: 'f4',
      columna: 'k0',
      contenido: { tipo: 'texto', texto: 'TOTAL' },
      estilo: { negrita: true },
    },
    {
      id: 'c_total_monto',
      fila: 'f4',
      columna: 'k1',
      contenido: { tipo: 'dato', nodo: 'total', mostrar: 'monto' },
    },
  ],
}

export type TerrenoDeArrastrar = { origen: { id: string; nombre: string }; configuradora: string }

const misOrigenes = () =>
  `select id from public.origenes where clave like '${PREFIJO_CLAVE_E2E}${RAIZ}%'`

export function limpiarTerrenoDeArrastrar(): void {
  sql(`delete from public.origenes where id in (${misOrigenes()})`)
}

export async function prepararTerrenoDeArrastrar(proyecto: string): Promise<TerrenoDeArrastrar> {
  limpiarTerrenoDeArrastrar()
  const origen = await crearOrigenDePrueba(`E2E arrastrar ${proyecto}`, `${RAIZ}_${proyecto}`, {
    tipo: 'subasta',
  })
  copiarLaFormulaDeLaSubasta(origen.id)
  // Alguien que gestiona el equipo tiene que existir antes de dar de alta a otra persona.
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-${RAIZ}-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Arrastre',
  })
  const configuradora = await crearConfiguradoraDeTarjeta(proyecto, RAIZ, [origen.id])
  sembrarBorradorDePlantilla(origen.id, PLANTILLA_ANCHA_Y_ALTA)
  return { origen, configuradora }
}

export const lienzo = (page: Page) => page.getByRole('grid', { name: 'Lienzo de la tarjeta' })
export const casilla = (page: Page, f: number, k: number) =>
  lienzo(page).locator(`[data-pos="${String(f)}:${String(k)}"]`)

// El ancho de una barra de desplazamiento clásica en esta página (0 si se superponen o están escondidas).
export async function anchoDeLaBarra(page: Page): Promise<number> {
  return page.evaluate(() => {
    const sonda = document.createElement('div')
    sonda.style.cssText = 'position:absolute;top:-999px;width:100px;height:100px;overflow:scroll'
    document.body.append(sonda)
    const ancho = sonda.offsetWidth - sonda.clientWidth
    sonda.remove()
    return ancho
  })
}

type Muestra = string

// Una muestra: el ancho del marco del lienzo, el de la tarjeta dibujada (ancho × escala) y el de la página, en px con decimales.
const tomar = (): Muestra => {
  const ancho = (selector: string) => {
    const caja = document.querySelector(selector)?.getBoundingClientRect()
    return caja === undefined ? '—' : String(Math.round(caja.width * 100) / 100)
  }
  return `${ancho('[data-lienzo-marco]')}|${ancho('[data-tarjeta-de-cotizacion]')}|${String(document.documentElement.clientWidth)}`
}

// Cada `cada` ms durante `ms`, dentro de la página: la lista de muestras.
export async function muestras(page: Page, ms = 2_000, cada = 100): Promise<Muestra[]> {
  return page.evaluate(
    async ({ ms, cada, tomar }) => {
      const leer = new Function(`return (${tomar})()`) as () => string
      const lista: string[] = []
      await new Promise<void>((listo) => {
        const reloj = setInterval(() => {
          lista.push(leer())
          if (lista.length * cada >= ms) {
            clearInterval(reloj)
            listo()
          }
        }, cada)
      })
      return lista
    },
    { ms, cada, tomar: tomar.toString() },
  )
}

// Muestras en cada cuadro durante `ms`: distintas = el lienzo se movió.
async function muestrasPorCuadro(page: Page, ms: number): Promise<Muestra[]> {
  return page.evaluate(
    async ({ ms, tomar }) => {
      const leer = new Function(`return (${tomar})()`) as () => string
      const lista: string[] = []
      const fin = performance.now() + ms
      await new Promise<void>((listo) => {
        const cuadro = () => {
          lista.push(leer())
          if (performance.now() < fin) requestAnimationFrame(cuadro)
          else listo()
        }
        requestAnimationFrame(cuadro)
      })
      return lista
    },
    { ms, tomar: tomar.toString() },
  )
}

const distintas = (lista: readonly Muestra[]) => [...new Set(lista)]

// Durante 2 s, cada 100 ms, el lienzo y la página miden lo mismo.
export async function quieto(page: Page, donde: string): Promise<void> {
  const lista = await muestras(page)
  expect(
    distintas(lista),
    `${donde}: el lienzo cambió de tamaño (marco|tarjeta|página): ${lista.join(', ')}`,
  ).toHaveLength(1)
}

// La banda de alto de la ventana donde la barra de la página aparece o no según la escala: con la barra puesta (ventana baja) la página mide `H`; sin ella, la tarjeta
// gana `alto × barra / ancho`. Se recorre de a 1 px, un poco más ancha que el cálculo, y en cada alto el lienzo queda quieto. Deja la ventana en el centro de la banda.
export async function barridoDeAlto(page: Page, donde: string): Promise<void> {
  const tamano = page.viewportSize()
  if (tamano === null) throw new Error('Sin tamaño de ventana.')
  const barra = await anchoDeLaBarra(page)
  await page.setViewportSize({ width: tamano.width, height: 400 })
  await page.waitForTimeout(150)
  const { alto, ancho, pagina } = await page.evaluate(() => {
    const t = document.querySelector('[data-tarjeta-de-cotizacion]')?.getBoundingClientRect()
    return {
      alto: t?.height ?? 0,
      ancho: t?.width ?? 1,
      pagina: document.documentElement.scrollHeight,
    }
  })
  const delta = Math.ceil((alto * barra) / ancho)
  const desde = pagina - 3
  const hasta = pagina + delta + 5
  for (let h = desde; h <= hasta; h++) {
    await page.setViewportSize({ width: tamano.width, height: h })
    // Lo que tarda en asentar un cambio de ventana (no esconde un ciclo: después se exigen 300 ms sin cambios).
    await page.waitForTimeout(150)
    const lista = await muestrasPorCuadro(page, 300)
    expect(
      distintas(lista),
      `${donde}, ventana de ${String(tamano.width)} × ${String(h)} (banda ${String(desde)}–${String(hasta)}): el lienzo cambió de tamaño (marco|tarjeta|página): ${distintas(lista).join(', ')}`,
    ).toHaveLength(1)
  }
  await page.setViewportSize({
    width: tamano.width,
    height: Math.round(pagina + delta / 2),
  })
  await page.waitForTimeout(150)
}

// Un clic elige la casilla y deja el foco en la grilla (con el lienzo moviéndose, Playwright no llega a hacer el clic).
export async function elegirCelda(page: Page, f: number, k: number): Promise<void> {
  await casilla(page, f, k).click({ timeout: 5_000 })
  await expect(casilla(page, f, k)).toHaveAttribute('aria-selected', 'true')
  await expect(lienzo(page)).toBeFocused()
}

// Arrastra con el puntero de un punto a otro en pasos (el asa de una fila pide más de 4 px antes de tomarla).
export async function arrastrar(
  page: Page,
  desde: { x: number; y: number },
  hasta: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(desde.x, desde.y)
  await page.mouse.down()
  await page.mouse.move(hasta.x, hasta.y, { steps: 10 })
  await page.mouse.up()
}

// El centro de una caja, ya quieta.
export async function centro(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const caja = await page.locator(selector).boundingBox()
  if (caja === null) throw new Error(`No se ve ${selector}.`)
  return { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 }
}
