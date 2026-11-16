// Lo que comparten los e2e de «visto» como un correo leído: el peso del nombre de una fila o tarjeta (el `[data-abre-resumen]`) y lo que
// la persona lee de ella. No visto = negrita (700); visto, también el último = peso normal (400).
import { expect, type Locator } from '@playwright/test'

export const NEGRITA = 700
export const PESO_NORMAL = 400

export async function pesoDelNombre(fila: Locator): Promise<number> {
  const nombre = fila.locator('[data-abre-resumen]').first()
  return nombre.evaluate((el) => Number(getComputedStyle(el).fontWeight))
}

// La marca de la fila y su peso, juntos: `nuevo` en negrita; `visto` y `ultimo` en peso normal.
export async function esperarMarca(
  fila: Locator,
  marca: 'nuevo' | 'visto' | 'ultimo',
): Promise<void> {
  await expect(fila).toHaveAttribute('data-visto', marca)
  await expect.poll(() => pesoDelNombre(fila)).toBe(marca === 'nuevo' ? NEGRITA : PESO_NORMAL)
  if (marca === 'ultimo') await expect(fila.getByText('Último visto')).toBeVisible()
  else await expect(fila.getByText('Último visto')).toHaveCount(0)
}
