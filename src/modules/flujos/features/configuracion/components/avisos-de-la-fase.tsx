'use client'

import { CircleXIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react'
import type { NivelDeMarca } from '../../../entities/marcas-del-diagrama'
import { useMarcasDelDiagrama } from '../hooks/use-marcas-del-diagrama'

const POR_NIVEL: Record<NivelDeMarca, { palabra: string; Icono: typeof InfoIcon; color: string }> =
  {
    error: { palabra: 'Error', Icono: CircleXIcon, color: 'text-(--color-peligro-ink)' },
    aviso: { palabra: 'Aviso', Icono: TriangleAlertIcon, color: 'text-(--color-aviso-ink)' },
    info: { palabra: 'Información', Icono: InfoIcon, color: 'text-(--color-info-ink)' },
  }

const PESO: Record<NivelDeMarca, number> = { error: 0, aviso: 1, info: 2 }

// Los avisos de «Revisar» de esta fase, arriba del panel: icono y la palabra del nivel (nunca sólo color) y el texto de la base, error › aviso › información.
// Sin avisos, nada (mientras se lee o si falló, tampoco: la franja lo dice).
export function AvisosDeLaFase({ faseId }: { faseId: string }) {
  const marcas = useMarcasDelDiagrama()
  const deLaFase = [...(marcas.porFase.get(faseId) ?? [])].sort(
    (a, b) => PESO[a.nivel] - PESO[b.nivel] || a.mensaje.localeCompare(b.mensaje, 'es'),
  )
  if (deLaFase.length === 0) {
    return null
  }
  return (
    <section
      aria-label="Avisos de Revisar"
      className="rounded-(--radius-md) bg-(--color-surface-2) px-3 py-2 text-(length:--text-sm)"
    >
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
        {deLaFase.map((marca, i) => {
          const { palabra, Icono, color } = POR_NIVEL[marca.nivel]
          return (
            <li key={`${marca.nivel}:${String(i)}`} className="flex min-w-0 items-start gap-2">
              <Icono aria-hidden className={`mt-0.5 size-4 shrink-0 ${color}`} />
              <span className="min-w-0 text-(--color-ink)">
                <span className={`font-medium ${color}`}>{palabra}:</span> {marca.mensaje}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
