// Para las pruebas de lo que suma líneas al «⋯» de la guardada (las áreas, la vista previa, cotizar encima): lo monta con su proveedor y el menú, y lo abre. Sólo para las
// pruebas (el sufijo `.soporte.` lo deja fuera del mapa).
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect } from 'vitest'
import { MenuDeLaGuardada } from './menu-de-la-guardada'
import { ProveedorDelMenuDeLaGuardada } from './proveedor-del-menu-de-la-guardada'

export function ConElMenu({ children, numero = 7 }: { children: ReactNode; numero?: number }) {
  return (
    <ProveedorDelMenuDeLaGuardada>
      {children}
      <MenuDeLaGuardada cotizacionId="00000000-0000-4000-8000-00000000menu" numero={numero} />
    </ProveedorDelMenuDeLaGuardada>
  )
}

// Abre el «⋯» y espera a que tenga alguna línea; sin líneas, falla.
export async function abrirElMenu(numero = 7): Promise<void> {
  const boton = screen.getByRole('button', { name: `Más acciones de N.º ${String(numero)}` })
  act(() => {
    fireEvent.pointerDown(boton)
    fireEvent.mouseDown(boton)
    fireEvent.click(boton)
  })
  await waitFor(() => {
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
  })
}

// Una línea del «⋯» ya abierto (acción o casilla), o nula.
export function lineaDelMenu(nombre: string | RegExp): HTMLElement | null {
  return (
    screen.queryByRole('menuitem', { name: nombre }) ??
    screen.queryByRole('menuitemcheckbox', { name: nombre })
  )
}

// Abre el «⋯» y devuelve la línea (null si no está).
export async function lineaAlAbrir(
  nombre: string | RegExp,
  numero = 7,
): Promise<HTMLElement | null> {
  await abrirElMenu(numero)
  return lineaDelMenu(nombre)
}

// Abre el «⋯» y elige la línea.
export async function elegirEnElMenu(nombre: string | RegExp, numero = 7): Promise<void> {
  const linea = await lineaAlAbrir(nombre, numero)
  if (linea === null) {
    throw new Error(`No está «${String(nombre)}» en el «⋯»`)
  }
  fireEvent.click(linea)
}
