import { leerFormulaDeTrabajo } from '@/modules/cotizaciones'
import { EmpezarDesdeUnaPlantilla } from '@/modules/cotizaciones/pantallas/plantilla-de-v1'
import { LienzoDeLaPlantillaDiferido } from '@/modules/cotizaciones/pantallas/tarjeta-plantilla'
import { rutaDeConfiguracionDeCotizacion } from '@/shared/lib/rutas'
import { puedeAbrirLaPestana } from '../../acceso'
import { SUBPESTANAS_DE_LA_FORMULA } from '../../pestanas'
import { abrirOrigen } from '../abrir-origen'
import { PestanasDeLaRuta } from '../pestanas-de-la-ruta'

// Sobre las sub-pestañas de Fórmula: Fórmula · Hoja · Tarjeta y, a la derecha, «Empezar desde una plantilla», que es del origen y no de una
// sub-pestaña. Sólo para quien abre la pestaña Fórmula en este origen (`cotizaciones.configurar`): a los demás, la página les dice por qué.
export async function CabezaDeLaFormula({ id }: { id: string }) {
  const abierto = await abrirOrigen(id, 'formula')
  if (
    abierto.tipo !== 'abierto' ||
    !puedeAbrirLaPestana(abierto.sesion.permisos, abierto.origen.id, 'formula')
  ) {
    return null
  }
  const { origen } = abierto
  const deTrabajo = await leerFormulaDeTrabajo(origen.id)
  const formula = deTrabajo.ok ? deTrabajo.data : null
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <PestanasDeLaRuta
          sinSegmento="formula"
          pestanas={SUBPESTANAS_DE_LA_FORMULA.map(({ clave, titulo }) => ({
            clave,
            titulo,
            ruta: rutaDeConfiguracionDeCotizacion(origen.id, clave),
          }))}
        />
      </div>
      {formula ? (
        <EmpezarDesdeUnaPlantilla
          origen={{ id: origen.id, nombre: origen.nombre }}
          formula={{ id: formula.id, nombre: formula.nombre }}
          Lienzo={LienzoDeLaPlantillaDiferido}
        />
      ) : null}
    </div>
  )
}
