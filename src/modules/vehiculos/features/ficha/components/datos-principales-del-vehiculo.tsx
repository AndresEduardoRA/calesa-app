'use client'

import { useId } from 'react'
import type {
  CampoDeLayout,
  Categoria,
  DatoClaveResuelto,
  OrigenResumen,
} from '@/modules/origenes/client'
import { Button } from '@/shared/ui/button'
import { Dato, ValorMostrado } from '@/shared/ui/campos'
import { TITULO_DE_BLOQUE } from '@/shared/ui/ficha-en-bloques/estilos'
import { useRegional } from '@/shared/ui/regional'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { datosClaveDelVehiculo } from '../../../entities/datos-clave-del-vehiculo'
import type { Vehiculo } from '../../../entities/vehiculo'
import { ModalDeFichaCompletaDiferido } from './ficha-completa/diferidos'
import { useFichaCompleta } from './ficha-completa/use-ficha-completa'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  categorias: readonly Categoria[]
  // Los datos clave del origen (≤ 4, la lista guardada o la de fábrica) y los campos del layout que son datos clave: los demás no viajan.
  datosClave: readonly DatoClaveResuelto[]
  camposClave: readonly CampoDeLayout[]
}

// «Datos principales» de la columna izquierda de la ficha: sólo los datos clave del origen, en su orden (en dos columnas en la lateral de escritorio;
// en una en el celular y al 200 %: la rejilla mira su contenedor en rem), y «Ver más» a lo ancho, que abre la ficha completa (`?ver=ficha`).
export function DatosPrincipalesDelVehiculo({
  vehiculo,
  origen,
  categorias,
  datosClave,
  camposClave,
}: Props) {
  const { locale, zonaHoraria } = useRegional()
  const id = useId()
  const fichaCompleta = useFichaCompleta()
  const montarFicha = useAbiertoAlgunaVez(fichaCompleta.abierto)
  const datos = datosClaveDelVehiculo(datosClave, vehiculo, {
    tipoDeOrigen: origen.tipo,
    campos: camposClave,
    categorias,
    locale,
    zona: zonaHoraria,
  })
  return (
    <section aria-labelledby={id} className="@container grid min-w-0 gap-3">
      <h2 id={id} className={TITULO_DE_BLOQUE}>
        Datos principales
      </h2>
      {datos.length > 0 ? (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 @[22rem]:grid-cols-2">
          {datos.map((dato) => (
            <Dato key={dato.clave} etiqueta={dato.etiqueta}>
              <ValorMostrado valor={dato.valor} />
            </Dato>
          ))}
        </dl>
      ) : null}
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        className="min-h-11 w-full md:min-h-9"
        onClick={() => {
          fichaCompleta.abrir()
        }}
      >
        Ver más
      </Button>
      {montarFicha ? (
        <ModalDeFichaCompletaDiferido
          abierto={fichaCompleta.abierto}
          alCerrar={fichaCompleta.cerrar}
          vehiculo={vehiculo}
          origen={origen}
          categorias={categorias}
        />
      ) : null}
    </section>
  )
}
