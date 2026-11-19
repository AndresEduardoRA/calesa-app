'use client'

import { ChevronRightIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/button'
import { EstadoError } from '@/shared/ui/estados'
import { TituloDeBloqueConAccion } from '@/shared/ui/ficha-en-bloques/titulo-con-accion'
import { Monto } from '@/shared/ui/monto'
import type { CampoDeVehiculo } from '../../../entities/campo'
import {
  textoDeMotivo,
  type PermisoDeVitrina,
  type VistaPreviaDeVitrina as Previa,
} from '../../../entities/vitrina'
import { usePanelDeVitrina } from '../hooks/use-panel-de-vitrina'
import { BadgeDeVitrina } from './badge-de-vitrina'
import { VistaPreviaDeVitrina } from './vista-previa-de-vitrina'

type Props = {
  // Lo que respondió la base (`vehiculo_vitrina_previa()`, la misma lectura de la cabecera); null si no se pudo leer.
  previa: Previa | null
  permiso: PermisoDeVitrina
  // Los nombres del motivo por el que un publicado no se ve.
  origen: { nombre: string }
  fase: { nombre: string } | null
  // Sólo los campos públicos que trae la tarjeta (los filtra la página: el layout entero ya viaja con el panel).
  campos: readonly CampoDeVehiculo[]
}

const ID_DEL_TITULO = 'vitrina-titulo'
const ROTULO = 'text-(length:--text-xs) text-(--color-ink-soft)'

// El bloque «Vitrina» de la ficha del vehículo (`docs/UX.md` › «Vehículo»): si está en la web, su precio público y cómo lo verá el visitante; si no,
// «No está en la web». Su acción, en el título: «Editar» o «Publicar en la web…», que abren el panel de la vitrina (`?panel=vitrina`); sin
// `vehiculos.vitrina`, sólo lectura (sin botón: el de la foto ya dice el motivo).
export function BloqueDeVitrina({ previa, permiso, origen, fase, campos }: Props) {
  const panel = usePanelDeVitrina()
  const accion =
    previa === null || permiso.estado === 'deshabilitado' ? null : (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 md:min-h-8"
        onClick={panel.abrir}
      >
        {previa.publicado ? 'Editar' : 'Publicar en la web…'}
      </Button>
    )
  return (
    <section aria-labelledby={ID_DEL_TITULO} className="grid min-w-0 gap-3">
      <TituloDeBloqueConAccion id={ID_DEL_TITULO} titulo="Vitrina" accion={accion} />
      <Cuerpo previa={previa} origen={origen} fase={fase} campos={campos} />
    </section>
  )
}

function Cuerpo({ previa, origen, fase, campos }: Omit<Props, 'permiso'>) {
  const router = useRouter()
  if (previa === null) {
    return (
      <div role="alert">
        <EstadoError
          compacto
          titulo="No pudimos cargar «Vitrina»."
          alReintentar={() => {
            router.refresh()
          }}
        />
      </div>
    )
  }
  if (!previa.publicado) {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">No está en la web</p>
  }
  const [primero] = previa.motivos
  const motivo =
    !previa.visible && primero
      ? textoDeMotivo(primero, { origen: origen.nombre, fase: fase?.nombre ?? null })
      : null
  const { tarjeta } = previa
  const precio = {
    precio: tarjeta.precio,
    precioHasta: tarjeta.precioHasta,
    nota: tarjeta.precioNota,
  }
  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <BadgeDeVitrina estado={previa.visible ? 'en_vitrina' : 'no_visible'} className="w-fit" />
        {/* El motivo, escrito a la vista (no sólo en el `title` de la insignia). */}
        {motivo ? <p className="text-(length:--text-sm) text-(--color-ink)">{motivo}</p> : null}
      </div>
      <PrecioPublico {...precio} />
      {/* Plegada y sin JS: la tarjeta con su foto mide más que la columna y el precio ya está arriba; cerrada no pide la foto. */}
      <details className="group grid min-w-0 gap-2">
        <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 text-(length:--text-sm) font-medium text-(--color-ink) md:min-h-8 [&::-webkit-details-marker]:hidden">
          <ChevronRightIcon aria-hidden className="size-4 transition group-open:rotate-90" />
          Así lo verá el visitante
        </summary>
        <VistaPreviaDeVitrina
          tarjeta={tarjeta}
          precio={precio}
          destacado={tarjeta.destacado}
          campos={campos}
          conTitulo={false}
        />
      </details>
    </div>
  )
}

function PrecioPublico({
  precio,
  precioHasta,
  nota,
}: {
  precio: number | null
  precioHasta: number | null
  nota: string | null
}) {
  return (
    <div className="grid gap-0.5">
      <p className={ROTULO}>Precio público</p>
      <p className="text-(length:--text-lg) font-semibold text-(--color-ink) tabular-nums">
        {precio === null ? (
          'Consultar'
        ) : (
          <>
            <Monto valor={precio} />
            {precioHasta === null ? null : (
              <>
                {' – '}
                <Monto valor={precioHasta} />
              </>
            )}
          </>
        )}
      </p>
      {nota ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{nota}</p> : null}
    </div>
  )
}
