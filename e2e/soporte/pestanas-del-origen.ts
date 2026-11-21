import { expect, type Page } from '@playwright/test'

type Pestana =
  | 'Datos'
  | 'Campos'
  | 'Categorías'
  | 'Flujo'
  | 'Fórmulas'
  | 'Planilla'
  | 'Hoja'
  | 'Tarjeta'
  | 'Tablas'

// La página de un origen (`/configuracion/origenes/<id>/…`) ya dibujada con `titulo` abierta: su h1 es el nombre del origen y la pestaña
// abierta va marcada. «Fórmula» es a la vez pestaña del origen y la primera sub-pestaña de Fórmula: las dos van marcadas y la sub-pestaña es la
// última. Con `?panel=` el modal puede montarse antes de mirar y deja la página detrás con `aria-hidden`: `includeHidden` la mira igual.
export async function enLaPestana(
  page: Page,
  titulo: Pestana,
  { includeHidden = false }: { includeHidden?: boolean } = {},
) {
  await expect(
    page.getByRole('tab', { name: titulo, exact: true, selected: true, includeHidden }).last(),
  ).toBeVisible()
}
