import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { ActualizarTablero } from '@/modules/web/pantallas/cola'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { EncabezadoDeConfiguracion } from '../_navegacion/encabezado-de-configuracion'
import { SECCION_DE_COLA_WEB } from './seccion'
import { TableroDeLaCola } from './tablero-de-la-cola'

export const metadata: Metadata = { title: SECCION_DE_COLA_WEB.titulo }

// Configuración › Cola web (8.04-2): una página con tres secciones en orden —«Sin asignar», «En la rueda» y «Política de la cola»—, cada una con su
// título y su frase; «Actualizar» queda arriba. Entra quien tiene `web.cola.gestionar`;
// sin la clave, «No tienes permiso». Las lecturas y las escrituras de la base vuelven a exigir la clave. `?panel=agregar-a-la-rueda&q=` abre «Agregar a la
// rueda» y busca en el equipo (8.04-3).
export default async function PaginaDeColaWeb({
  searchParams,
}: PageProps<'/configuracion/cola-web'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'web.cola.gestionar')) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EncabezadoDeConfiguracion {...SECCION_DE_COLA_WEB} />
        <ActualizarTablero />
      </div>
      <Suspense fallback={<EsqueletoListado filas={6} columnas={3} />}>
        <TableroDeLaCola
          permisos={sesion.permisos}
          panel={unParametro(parametros['panel'])}
          busqueda={unParametro(parametros['q'])}
        />
      </Suspense>
    </div>
  )
}
