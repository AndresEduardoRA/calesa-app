// Lo que comparten los e2e de «visto» como un correo leído: el peso del nombre de una fila o tarjeta (el `[data-abre-resumen]`) y lo que
// la persona lee de ella. No visto = negrita (700); visto, también el último = peso normal (400).
import { expect, type Locator } from '@playwright/test'

export const NEGRITA = 700
export const PESO_NORMAL = 400

// La marca del último visto: un ojo con tooltip «Último visto» y el texto «, último visto» para el lector; ningún texto a la vista.
export function marcaDeUltimoVisto(fila: Locator): Locator {
  return fila.getByTitle('Último visto', { exact: true })
}

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
  if (marca === 'ultimo') await expect(marcaDeUltimoVisto(fila)).toBeVisible()
  else await expect(marcaDeUltimoVisto(fila)).toHaveCount(0)
}
