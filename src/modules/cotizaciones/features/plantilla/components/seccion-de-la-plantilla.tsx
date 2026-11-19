import { IdCardIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import Link from 'next/link'
import { datosO } from '@/shared/lib/errores'
import { rutaDeConfiguracionDeCotizacion } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { leerPlantillaDelOrigen } from '../../../areas/plantilla/composicion'
import { idsDelContexto, propsDelEditor } from '../../../entities/plantilla/props-del-editor'
import {
  recortarLaReferencia,
  type ReferenciaDeLaTarjeta,
} from '../../../entities/referencia-de-la-tarjeta'
import type { PropsDelLienzoDeLaPlantilla } from '../../../entities/vista-previa-de-la-plantilla'
import { PestanaDeLaTarjeta } from './pestana-de-la-tarjeta'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // El origen abierto: la página ya comprobó que la persona tiene `cotizaciones.configurar` en él (este módulo no depende de `origenes`).
  origen: Origen
  // La cotización de referencia del lienzo: la página la pide sin esperarla (la compone `src/app`, que cruza el listado, la hoja guardada, `leads` y `vehiculos`) y aquí
  // se espera en paralelo con la plantilla. Nunca rechaza: sin cotización o si no se leyó, lo dice.
  referencia: Promise<ReferenciaDeLaTarjeta>
  // El lienzo (el dibujo de la tarjeta): lo llena el área `tarjeta` y este módulo no la importa.
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
}

// La pestaña «Tarjeta» de un origen en Configuración › Cotización, leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: el borrador, la
// publicada y la fórmula con la que se validan, y la referencia, a la vez. Al editor sólo llega lo que dibuja (`propsDelEditor()`) y la referencia recortada a sus
// nodos. La base vuelve a decidir (policy `plantillas_tarjeta: leer`). Una lectura de la plantilla que falla sube al `error.tsx` de la ruta, con «Reintentar».
export async function SeccionDeLaPlantilla({ origen, referencia, Lienzo }: Props) {
  const [lectura, deReferencia] = await Promise.all([leerPlantillaDelOrigen(origen.id), referencia])
  const editor = propsDelEditor(datosO(lectura), origen)
  if (editor === null) {
    return (
      <EstadoVacio
        Icono={IdCardIcon}
        titulo={`Falta publicar la fórmula de ${origen.nombre}: la tarjeta se arma con sus nodos.`}
        accion={
          <Link
            href={rutaDeConfiguracionDeCotizacion(origen.id, 'formula')}
            className={buttonVariants({ className: 'min-h-11 md:min-h-8' })}
          >
            Ir a la fórmula
          </Link>
        }
        compacto
      />
    )
  }
  return (
    <PestanaDeLaTarjeta
      editor={editor}
      referencia={recortarLaReferencia(deReferencia, idsDelContexto(editor.contexto))}
      Lienzo={Lienzo}
    />
  )
}
