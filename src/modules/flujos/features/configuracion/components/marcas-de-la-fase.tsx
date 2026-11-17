'use client'

import { CircleXIcon, TriangleAlertIcon } from 'lucide-react'
import { cn } from 'cn'
import { Badge } from '@/shared/ui/badge'
import { marcasDeLaFase } from '../../../entities/lectura-de-fase'
import type { FaseParaConfigurar } from '../../../entities/flujo'
import { resumenDeMarcas } from '../../../entities/marcas-del-diagrama'
import { useMarcasDelDiagrama } from '../hooks/use-marcas-del-diagrama'

// El nombre de la fase con su color (el de la fila: texto y color, nunca sólo color).
export function NombreConColor({ fase }: { fase: Pick<FaseParaConfigurar, 'nombre' | 'color'> }) {
  return (
    <Badge variant="outline" className="max-w-full gap-1.5">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: fase.color }}
      />
      <span className="truncate">{fase.nombre}</span>
    </Badge>
  )
}

// «Inicial», «Final», «Subasta» y «Jubilada», las que tenga.
export function MarcasDeLaFase({ fase }: { fase: FaseParaConfigurar }) {
  const marcas = marcasDeLaFase(fase)
  return marcas.length === 0 ? null : (
    <>
      {marcas.map((marca) => (
        <Badge key={marca} variant="secondary">
          {marca}
        </Badge>
      ))}
    </>
  )
}

export const POR_NIVEL_DE_MARCA = {
  error: { Icono: CircleXIcon, clases: 'bg-(--color-peligro-soft) text-(--color-peligro-ink)' },
  aviso: { Icono: TriangleAlertIcon, clases: 'bg-(--color-aviso-soft) text-(--color-aviso-ink)' },
} as const

// Los avisos de «Revisar» de la fase («1 error y 2 avisos»), con ícono, texto y color; sin avisos (o sólo información), nada.
export function InsigniaDeRevisar({ faseId }: { faseId: string }) {
  const marcas = useMarcasDelDiagrama()
  const resumen = resumenDeMarcas(marcas.porFase.get(faseId) ?? [])
  if (resumen === null) {
    return null
  }
  const { Icono, clases } = POR_NIVEL_DE_MARCA[resumen.nivel]
  return (
    <Badge variant="outline" className={cn('gap-1 border-transparent', clases)}>
      <Icono aria-hidden />
      {resumen.texto}
    </Badge>
  )
}
