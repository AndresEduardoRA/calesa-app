'use client'

import { PlusIcon } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import type { Moneda } from '../../../entities/tipos-cambio'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Todas, también las inactivas.
  monedas: readonly Moneda[]
  monedaBase: string
  alAbrir: (codigo: string) => void
  alCrear: () => void
}

// «Gestionar» las monedas (`?panel=monedas`): la lista de hoy. Tocar una abre su panel (`?moneda=`) y «Nueva moneda» el de crear.
export function ModalDeMonedas({
  abierto,
  alCerrar,
  monedas,
  monedaBase,
  alAbrir,
  alCrear,
}: Props) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Monedas"
      descripcion="No se borran: se desactivan."
      ancho="amplio"
      pie={
        <>
          <Button variant="ghost" onClick={alCerrar}>
            Cerrar
          </Button>
          <Button onClick={alCrear}>
            <PlusIcon aria-hidden />
            Nueva moneda
          </Button>
        </>
      }
    >
      <ul className="divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
        {monedas.map((moneda) => (
          <li key={moneda.codigo}>
            <button
              type="button"
              className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus)"
              onClick={() => {
                alAbrir(moneda.codigo)
              }}
            >
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="font-mono text-(length:--text-sm) text-(--color-ink-soft)">
                  {moneda.codigo}
                </span>
                {/* El nombre se parte, no se corta con «…»: al 200 % tiene que leerse entero. */}
                <span className="min-w-0 text-(length:--text-base) font-medium break-words text-(--color-ink)">
                  {moneda.nombre}
                </span>
                {moneda.codigo === monedaBase ? <Badge variant="secondary">Base</Badge> : null}
                {moneda.activa ? null : <Badge variant="outline">Inactiva</Badge>}
              </span>
              <span className="shrink-0 text-(length:--text-sm) text-(--color-ink-faint)">
                {moneda.simbolo}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
