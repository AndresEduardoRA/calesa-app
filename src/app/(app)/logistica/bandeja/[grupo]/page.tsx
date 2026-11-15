import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { requerirSesion } from '@/modules/equipo'
import {
  grupoDelSlug,
  gruposVisibles,
  leerGrupoDeLaBandeja,
  TITULO_DE_LOS_GRUPOS,
} from '@/modules/logistica'
import { ErrorDelGrupo, ListaDelGrupo } from '@/modules/logistica/pantallas/alertas-grupo'
import { EsqueletoDeLaBandeja } from '@/modules/logistica/pantallas/alertas-esqueletos'
import { conteoCorto } from '@/shared/lib/conteo'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { leerCursor, TAMANO_DE_LA_BANDEJA } from '@/shared/lib/paginacion'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { contextoDeLaBandeja } from '../../contexto-de-la-bandeja'
import { MarcasDeLogistica } from '../../marcas-de-logistica'

export const metadata: Metadata = { title: 'Bandeja del día · Logística' }

// `/logistica/bandeja/[grupo]`: un grupo de la bandeja del día entero (demorados, trabados, por aprobar…), de a `TAMANO_DE_LA_BANDEJA` por cursor, con el mismo detalle y la misma acción que la
// portada. El nombre de la URL sale de `grupos.ts`; uno que no existe dice que no hay tal bandeja. Un grupo que quien mira no ve (sin el permiso de documentos) es «sin permiso».
export default function PaginaDeUnGrupo({
  params,
  searchParams,
}: PageProps<'/logistica/bandeja/[grupo]'>) {
  return (
    <Suspense fallback={<EsqueletoDeLaBandeja />}>
      <Grupo params={params} searchParams={searchParams} />
    </Suspense>
  )
}

const volver = (
  <Link href={RUTAS.logistica as Route} className={buttonVariants({ variant: 'outline' })}>
    Ver la bandeja
  </Link>
)

async function Grupo({
  params,
  searchParams,
}: Pick<PageProps<'/logistica/bandeja/[grupo]'>, 'params' | 'searchParams'>) {
  await connection()
  const [sesion, { grupo: slug }, parametros] = await Promise.all([
    requerirSesion(),
    params,
    searchParams,
  ])
  const grupo = grupoDelSlug(slug)
  if (grupo === null) {
    return <EstadoVacio titulo="Esa bandeja no existe." accion={volver} />
  }
  if (!gruposVisibles(sesion.permisos).includes(grupo)) {
    return <EstadoSinPermiso />
  }
  const textoDelCursor = unParametro(parametros[CLAVE_DE_CURSOR])
  const cursor = leerCursor(textoDelCursor)
  const [lectura, contexto] = await Promise.all([
    leerGrupoDeLaBandeja({
      grupo,
      tope: TAMANO_DE_LA_BANDEJA,
      // El conteo («37», «100+») sólo en la primera página.
      conConteo: cursor === null,
      cursor: cursor === null ? null : { desde: cursor.instante, id: cursor.id },
    }),
    contextoDeLaBandeja(sesion.permisos),
  ])
  const titulo = TITULO_DE_LOS_GRUPOS[grupo]
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <header className="grid gap-1">
        <Link
          href={RUTAS.logistica as Route}
          className="inline-flex min-h-11 w-fit items-center text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:underline md:min-h-0"
        >
          La bandeja del día
        </Link>
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">{titulo}</h1>
      </header>
      {lectura.ok ? (
        <MarcasDeLogistica ids={lectura.data.filas.map((fila) => fila.vehiculoId)}>
          <ListaDelGrupo
            grupo={grupo}
            titulo={
              lectura.data.conteo
                ? `${conteoCorto(lectura.data.conteo)} en este grupo.`
                : 'Siguientes del grupo.'
            }
            lectura={lectura.data}
            hayCursor={cursor !== null}
            permisos={sesion.permisos}
            ahora={new Date()}
            zona={contexto.zona}
            origenes={contexto.origenes}
          />
        </MarcasDeLogistica>
      ) : (
        <ErrorDelGrupo titulo={titulo} />
      )}
    </div>
  )
}
