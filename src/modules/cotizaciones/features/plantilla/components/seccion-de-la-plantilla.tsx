import { IdCardIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import Link from 'next/link'
import { datosO } from '@/shared/lib/errores'
import { rutaDeConfiguracionDeCotizacion } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { leerPlantillaDelOrigen } from '../../../areas/plantilla/composicion'
import { propsDelEditor } from '../../../entities/plantilla/props-del-editor'
import type { PropsDeLaVistaPreviaDeLaPlantilla } from '../../../entities/vista-previa-de-la-plantilla'
import { PestanaDeLaTarjeta } from './pestana-de-la-tarjeta'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // El origen abierto: la página ya comprobó que la persona tiene `cotizaciones.configurar` en él (este módulo no depende de `origenes`).
  origen: Origen
  // La vista previa del editor (4.19-4): la página la trae del área `tarjeta` y este módulo no la importa.
  VistaPrevia?: ComponentType<PropsDeLaVistaPreviaDeLaPlantilla>
}

// La pestaña «Tarjeta» de un origen en Configuración › Cotización (4.19-3b), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: el
// borrador, la publicada y la fórmula con la que se validan. Al editor sólo llega lo que dibuja (`propsDelEditor()`). La base vuelve a decidir (policy
// `plantillas_tarjeta: leer`). Una lectura que falla sube al `error.tsx` de la ruta, que ofrece «Reintentar».
export async function SeccionDeLaPlantilla({ origen, VistaPrevia }: Props) {
  const editor = propsDelEditor(datosO(await leerPlantillaDelOrigen(origen.id)), origen)
  if (editor === null) {
    return (
      <EstadoVacio
        Icono={IdCardIcon}
        titulo={`Falta publicar la fórmula de ${origen.nombre}: la tarjeta se arma con sus grupos.`}
        accion={
          <Link
            href={rutaDeConfiguracionDeCotizacion(origen.id, 'formula')}
            className={buttonVariants({ className: 'min-h-11 md:min-h-8' })}
          >
            Ir a «Fórmula»
          </Link>
        }
        compacto
      />
    )
  }
  return <PestanaDeLaTarjeta editor={editor} VistaPrevia={VistaPrevia} />
}
