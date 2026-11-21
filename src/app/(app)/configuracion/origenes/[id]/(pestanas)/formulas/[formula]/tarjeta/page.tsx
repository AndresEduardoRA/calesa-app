import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDeLaPlantilla } from '@/modules/cotizaciones/pantallas/plantilla'
import { LienzoDeLaPlantillaDiferido } from '@/modules/cotizaciones/pantallas/tarjeta-plantilla'
import { CONSULTA_DE_LA_EDICION, enLaEdicion } from '@/shared/lib/edicion'
import { redirigir } from '@/shared/lib/navegacion'
import { puede } from '@/shared/lib/permisos'
import { rutaDeLaFormula } from '@/shared/lib/rutas'
import { EntrarALaEdicion } from '@/shared/ui/edicion-a-pantalla-completa'
import { NoSeAbre } from '../../../../no-se-abre'
import { abrirFormula } from '../abrir-formula'
import { EdicionDeLaFormula } from '../edicion-de-la-formula'
import { EsqueletoDeLaTarjeta } from './esqueleto-de-la-tarjeta'
import { leerReferenciaDeLaTarjeta } from './referencia'

export const metadata: Metadata = { title: 'Tarjeta de la fórmula' }

// Configuración › Orígenes › un origen › Fórmulas › una fórmula › Tarjeta: la imagen que recibe el cliente (la plantilla de la tarjeta de la cotización), editada
// como un Excel sobre el lienzo, a todo el ancho: el lienzo es la vista previa (`?panel=publicar-tarjeta`, `descartar-plantilla`; `?lugar=` elige esa celda al
// abrir). La referencia del lienzo (la cotización más reciente del origen que quien configura ve) se pide aquí como promesa, sin esperarla: la sección la espera
// junto a la plantilla y la latencia es la de la más lenta.
export default async function PaginaDeLaTarjeta({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]/formulas/[formula]/tarjeta'>) {
  const [pedida, parametros] = await Promise.all([params, searchParams])
  const enModo = enLaEdicion(parametros)
  const contenido = (
    <Suspense fallback={<EsqueletoDeLaTarjeta />}>
      <Tarjeta origenId={pedida.id} formulaId={pedida.formula} enModo={enModo} />
    </Suspense>
  )
  return enModo ? (
    <EdicionDeLaFormula
      origenId={pedida.id}
      formulaId={pedida.formula}
      parte="tarjeta"
      titulo="Tarjeta"
    >
      {contenido}
    </EdicionDeLaFormula>
  ) : (
    contenido
  )
}

async function Tarjeta({
  origenId,
  formulaId,
  enModo,
}: {
  origenId: string
  formulaId: string
  enModo: boolean
}) {
  const abierto = await abrirFormula(origenId, formulaId)
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  if (abierto.archivada) {
    return enModo ? redirigir(rutaDeLaFormula(origenId, formulaId, 'tarjeta')) : null
  }
  const { sesion } = abierto
  const { id, nombre, activo } = abierto.origen
  return (
    <div className="grid min-w-0 gap-4">
      {enModo ? null : (
        // El editor de la tarjeta sólo se ofrece desde 1.024 px (`ANCHO_DEL_EDITOR`): bajo ese ancho, el aviso de siempre.
        <div className="hidden justify-end lg:flex">
          <EntrarALaEdicion
            href={rutaDeLaFormula(id, formulaId, 'tarjeta', CONSULTA_DE_LA_EDICION)}
            nombre="la tarjeta"
          />
        </div>
      )}
      <SeccionDeLaPlantilla
        origen={{ id, nombre, activo }}
        formula={abierto.formula}
        referencia={leerReferenciaDeLaTarjeta(id, sesion.permisos)}
        Lienzo={LienzoDeLaPlantillaDiferido}
        puedeCambiarElLogo={puede(sesion.permisos, 'empresa.ajustes.gestionar')}
      />
    </div>
  )
}
