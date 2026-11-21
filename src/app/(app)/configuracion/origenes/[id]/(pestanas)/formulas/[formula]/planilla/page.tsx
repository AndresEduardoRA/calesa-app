import type { Metadata } from 'next'
import { Suspense } from 'react'
import { leerLaTarjetaDeLaFormula } from '@/modules/cotizaciones'
import { getTiposCambio } from '@/modules/empresa'
import { SeccionDeLaFormula } from '@/modules/cotizaciones/pantallas/formula'
import { TarjetaEnVivoDiferida } from '@/modules/cotizaciones/pantallas/tarjeta-formula'
import { puede } from '@/shared/lib/permisos'
import { CONSULTA_DE_LA_EDICION, enLaEdicion } from '@/shared/lib/edicion'
import { redirigir } from '@/shared/lib/navegacion'
import { rutaDeLaFormula } from '@/shared/lib/rutas'
import { EntrarALaEdicion } from '@/shared/ui/edicion-a-pantalla-completa'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { NoSeAbre } from '../../../../no-se-abre'
import { abrirFormula } from '../abrir-formula'
import { EdicionDeLaFormula } from '../edicion-de-la-formula'

export const metadata: Metadata = { title: 'Planilla de la fórmula' }

// Configuración › Orígenes › un origen › Fórmulas › una fórmula › Planilla: qué se calcula. Arriba la publicada, el borrador y las versiones
// (`?panel=publicar-formula`, `revertir-formula&version=`, `descartar-borrador`); abajo la planilla con sus paneles en la URL; con `?fila=<id>`, esa fila
// elegida. A todo el ancho: al costado de la planilla van «Totales» y la tarjeta en vivo. La tarjeta de la fórmula (área `plantilla`) y los tipos de cambio de la
// empresa («Tipo de celda › Tipo de cambio») se piden aquí como promesas, sin esperarlas: la sección las espera junto a la fórmula, y el dibujo de la tarjeta (área
// `tarjeta`) entra por el hueco `TarjetaEnVivo`.
export default async function PaginaDeLaPlanilla({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]/formulas/[formula]/planilla'>) {
  const [pedida, parametros] = await Promise.all([params, searchParams])
  const enModo = enLaEdicion(parametros)
  const contenido = (
    <Suspense fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
      <Planilla origenId={pedida.id} formulaId={pedida.formula} enModo={enModo} />
    </Suspense>
  )
  return enModo ? (
    <EdicionDeLaFormula
      origenId={pedida.id}
      formulaId={pedida.formula}
      parte="planilla"
      titulo="Planilla"
    >
      {contenido}
    </EdicionDeLaFormula>
  ) : (
    contenido
  )
}

async function Planilla({
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
    // Una archivada no se edita: la vista sin el modo trae su aviso con «Copiar».
    return enModo ? redirigir(rutaDeLaFormula(origenId, formulaId, 'planilla')) : null
  }
  const { id, nombre, activo } = abierto.origen
  const origen = { id, nombre, activo }
  return (
    <div className="grid min-w-0 gap-4">
      {enModo ? null : (
        <div className="flex justify-end">
          <EntrarALaEdicion
            href={rutaDeLaFormula(id, formulaId, 'planilla', CONSULTA_DE_LA_EDICION)}
            nombre="la planilla"
          />
        </div>
      )}
      <SeccionDeLaFormula
        origen={origen}
        formula={abierto.formula}
        tarjeta={leerLaTarjetaDeLaFormula(origen, abierto.formula.id)}
        TarjetaEnVivo={TarjetaEnVivoDiferida}
        tiposDeCambio={getTiposCambio().then((tipos) =>
          tipos.map(({ clave, nombre }) => ({ clave, nombre })),
        )}
        puedeCambiarTiposDeCambio={puede(abierto.sesion.permisos, 'empresa.tipos_cambio.gestionar')}
      />
    </div>
  )
}
