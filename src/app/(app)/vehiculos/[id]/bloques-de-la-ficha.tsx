import type { Route } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { CotizacionesDelVehiculo } from '@/modules/cotizaciones/pantallas/vehiculo'
import type { Permisos } from '@/modules/equipo'
import { DocumentosEnLaFicha } from '@/modules/logistica/pantallas/documentos-unidad'
import type { LayoutDeOrigen, OrigenResumen } from '@/modules/origenes'
import { EsqueletoDeResumen } from '@/modules/repuestos/pantallas/proyectos-vehiculo'
import type { AvisosDelMenu, Vehiculo } from '@/modules/vehiculos'
import { EsqueletoDeFotos, FichaDeVehiculo } from '@/modules/vehiculos/pantallas/ficha'
import { unidadDeLogistica } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { BloqueDeFicha } from '@/shared/ui/ficha-en-bloques'
import { TITULO_DE_BLOQUE } from '@/shared/ui/ficha-en-bloques/estilos'
import { Skeleton } from '@/shared/ui/skeleton'
import { RelacionadosDeLaFicha } from '../../_relacionados/relacionados-del-vehiculo'
import { BloqueDocumentos } from './bloque-documentos'
import { BloqueFase } from './bloque-fase'
import { BloqueFotos } from './bloque-fotos'
import { BloqueRepuestos } from './bloque-repuestos'
import type { AnclaDeLaFicha, BloqueDeLaFicha } from './bloques'
import { EsqueletoDeDocumentos } from './esqueleto-de-documentos'
import { EsqueletoDelHuecoDeLaFase } from './esqueleto-de-la-fase'

type Props = {
  visibles: readonly BloqueDeLaFicha[]
  vehiculo: Vehiculo
  origen: OrigenResumen
  layout: LayoutDeOrigen
  editable: boolean
  permisos: Permisos
  // «Relacionados»: la papelera que ofrece el aviso de desvinculado y lo que ofrece si la base rechaza el envío.
  ofrecerPapelera: boolean
  avisos: AvisosDelMenu
}

// El título del bloque «Fase y qué falta» con «Ver en logística» en su línea: mover es de logística (lo ve quien ve el bloque, con `logistica.ver`
// del origen). La cabecera lleva el mismo enlace corto hasta que este bloque deje la derecha (`docs/PENDIENTES.md`).
function FaseYQueFalta({ vehiculoId, titulo }: { vehiculoId: string; titulo: string }) {
  return (
    <section aria-labelledby="fase-titulo" className="grid min-w-0 gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h2 id="fase-titulo" tabIndex={-1} className={TITULO_DE_BLOQUE}>
          {titulo}
        </h2>
        <Link
          href={unidadDeLogistica(vehiculoId) as Route}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'ml-auto min-h-11 md:min-h-8',
          })}
        >
          Ver en logística
        </Link>
      </div>
      <Suspense fallback={<EsqueletoDelHuecoDeLaFase />}>
        <BloqueFase vehiculoId={vehiculoId} />
      </Suspense>
    </section>
  )
}

// Los bloques que montan su parte de cliente recién al acercarse (200 px antes de entrar a la vista): «Cotizaciones» y la lista de «Documentos»
// leen desde el navegador recién ahí; lo que se lee en el servidor (la unidad, la galería) llega con el documento y sólo espera su código.
function AlAcercarse({
  ancla,
  titulo,
  props,
}: {
  ancla: 'cotizaciones' | 'documentos' | 'fotos'
  titulo: string
  props: Props
}) {
  const { vehiculo, origen, editable } = props
  switch (ancla) {
    case 'cotizaciones':
      return (
        <BloqueDeFicha
          ancla={ancla}
          titulo={titulo}
          conTitulo
          alAcercarse
          esqueleto={<Skeleton className="h-40 rounded-(--radius-card)" />}
        >
          <CotizacionesDelVehiculo key={vehiculo.id} vehiculoId={vehiculo.id} />
        </BloqueDeFicha>
      )
    case 'documentos':
      return (
        <DocumentosEnLaFicha ancla={ancla}>
          <BloqueDeFicha
            ancla={ancla}
            titulo={titulo}
            conTitulo
            alAcercarse
            esqueleto={<EsqueletoDeDocumentos />}
          >
            <Suspense fallback={<EsqueletoDeDocumentos />}>
              <BloqueDocumentos vehiculoId={vehiculo.id} />
            </Suspense>
          </BloqueDeFicha>
        </DocumentosEnLaFicha>
      )
    case 'fotos':
      return (
        <BloqueDeFicha
          ancla={ancla}
          titulo={titulo}
          conTitulo
          alAcercarse
          esqueleto={<EsqueletoDeFotos />}
        >
          <Suspense fallback={<EsqueletoDeFotos />}>
            <BloqueFotos
              vehiculoId={vehiculo.id}
              origenId={origen.id}
              deSubasta={origen.tipo === 'subasta'}
              puedeEditar={editable}
            />
          </Suspense>
        </BloqueDeFicha>
      )
  }
}

// Lo de adentro de cada bloque. Lo que abre la URL (Relacionados con sus paneles y «Ver todos») nunca espera a acercarse; sólo «Cotizaciones»,
// «Documentos» y «Fotos» (ver `AlAcercarse`).
function Contenido({
  ancla,
  titulo,
  props,
}: {
  ancla: AnclaDeLaFicha
  titulo: string
  props: Props
}) {
  const { vehiculo, origen, layout } = props
  switch (ancla) {
    case 'fase':
      return (
        <BloqueDeFicha ancla={ancla} titulo={titulo}>
          <FaseYQueFalta vehiculoId={vehiculo.id} titulo={titulo} />
        </BloqueDeFicha>
      )
    case 'relacionados':
      return (
        <BloqueDeFicha ancla={ancla} titulo={titulo}>
          <RelacionadosDeLaFicha
            vehiculoId={vehiculo.id}
            permisos={props.permisos}
            ofrecerPapelera={props.ofrecerPapelera}
            avisos={props.avisos}
          />
        </BloqueDeFicha>
      )
    case 'ficha':
      return (
        <BloqueDeFicha ancla={ancla} titulo={titulo} conTitulo>
          <FichaDeVehiculo
            vehiculo={vehiculo}
            origen={origen}
            campos={layout.campos}
            categorias={layout.categorias}
          />
        </BloqueDeFicha>
      )
    case 'repuestos':
      return (
        <BloqueDeFicha ancla={ancla} titulo={titulo} conTitulo>
          <Suspense fallback={<EsqueletoDeResumen />}>
            <BloqueRepuestos vehiculoId={vehiculo.id} />
          </Suspense>
        </BloqueDeFicha>
      )
    case 'cotizaciones':
    case 'documentos':
    case 'fotos':
      return <AlAcercarse ancla={ancla} titulo={titulo} props={props} />
  }
}

// Los bloques de la columna principal de la ficha, en el orden del índice y sólo los que quien mira ve (`bloquesDeQuienMira`). Cada uno con su
// límite de error: uno roto dice «No pudimos cargar «<título>».» con «Reintentar» y los demás siguen.
export function BloquesDeLaFicha(props: Props) {
  return (
    <>
      {props.visibles.map((bloque) => (
        <Contenido key={bloque.ancla} ancla={bloque.ancla} titulo={bloque.titulo} props={props} />
      ))}
    </>
  )
}
