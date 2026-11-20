import type { ComponentType } from 'react'
import { datosO } from '@/shared/lib/errores'
import { leerCatalogoDeTablas, leerFormulaDelOrigen } from '../../../areas/formula/composicion'
import type {
  LecturaDeLaTarjetaEnVivo,
  PropsDeLaTarjetaEnVivo,
} from '../../../entities/tarjeta-en-vivo'
import { FormulaDelOrigen } from './formula-del-origen'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // El origen abierto: la página ya comprobó que la persona tiene `cotizaciones.configurar` en él (este módulo no depende de `origenes`).
  origen: Origen
  // La tarjeta de trabajo del origen (área `plantilla`): la página la pide sin esperarla y aquí se espera junto a la fórmula. Nunca rechaza.
  tarjeta: Promise<LecturaDeLaTarjetaEnVivo>
  // El dibujo de la tarjeta en vivo (área `tarjeta`): lo pasa la página; este área no la importa.
  TarjetaEnVivo: ComponentType<PropsDeLaTarjetaEnVivo>
  // `empresa.tipos_cambio.gestionar`: la banda «Tipo de cambio» ofrece «Cambiar en Empresa › Monedas».
  puedeCambiarTiposDeCambio: boolean
}

// La pestaña «Fórmula» de la Fórmula de un origen (Configuración › Orígenes) (4.20-2a), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: la
// publicada, el borrador y la primera página de versiones, la tarjeta de trabajo y el catálogo de tablas (BUSCARV; null si no se leyó), a la vez. La base vuelve a decidir (policy `formulas: leer`). Una lectura de la
// fórmula que falla sube al `error.tsx` de la ruta, que ofrece «Reintentar».
export async function SeccionDeLaFormula({
  origen,
  tarjeta,
  TarjetaEnVivo,
  puedeCambiarTiposDeCambio,
}: Props) {
  const [leida, deLaTarjeta, tablas] = await Promise.all([
    leerFormulaDelOrigen(origen.id),
    tarjeta,
    leerCatalogoDeTablas(origen.id),
  ])
  return (
    <FormulaDelOrigen
      origen={origen}
      formula={datosO(leida)}
      tarjeta={deLaTarjeta}
      tablas={tablas}
      TarjetaEnVivo={TarjetaEnVivo}
      puedeCambiarTiposDeCambio={puedeCambiarTiposDeCambio}
    />
  )
}
