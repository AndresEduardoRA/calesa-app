'use client'

import { Button } from '@/shared/ui/button'
import { DetalleDelCambioDiferido } from '../../diff/components/diferidos'
import type { CambioAbierto } from '../../diff/hooks/use-cambio-abierto'

// Un `?cambio=` que no está en lo cargado (es más viejo, o quien mira no lo ve): arriba de la lista, desplegado y leído por `actividad_diff`; la
// lista sigue debajo. Sin acceso o inválido: «No tienes acceso a este cambio.».
export function CambioQueAbriste({ cambio }: { cambio: CambioAbierto }) {
  return (
    <section
      aria-labelledby="cambio-que-abriste"
      className="grid min-w-0 gap-2 rounded-(--radius-card) border border-(--color-primario) bg-(--color-surface) p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="cambio-que-abriste" className="font-medium text-(--color-ink)">
          El cambio que abriste
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 md:min-h-8"
          onClick={cambio.cerrar}
        >
          Cerrar
        </Button>
      </div>
      <DetalleDelCambioDiferido id={cambio.id} conCabecera />
    </section>
  )
}
