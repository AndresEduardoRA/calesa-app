// Los datos clave de un vehículo como los muestra «Datos principales» de su ficha (docs/GLOSARIO.md › «Datos clave»): la lista del origen (la guardada o
// la de fábrica, ya resuelta por `origenes`), con el valor de este vehículo. Un dato común se lee de su columna y se muestra con `valorComun()`; un
// campo del layout, de `atributos` con `valorMostrado()`. Sin I/O.
import { valorMostrado, type CampoMostrable, type ValorMostrado } from '@/shared/lib/campos'
import type { CategoriaDeVehiculo } from './campo'
import { camposComunes, valorComun, type ClaveComun } from './comunes'
import type { Vehiculo } from './vehiculo'

// Un dato clave del origen ya resuelto (la forma de `DatoClaveResuelto` de `origenes`, que este módulo no importa): un dato común por el nombre de su
// columna, o un campo del layout por su clave y su id.
export type DatoClaveDelOrigen =
  | { de: 'comun'; clave: string; etiqueta: string }
  | { de: 'campo'; clave: string; etiqueta: string; campoId: string }

export type CampoDeDatoClave = CampoMostrable & { id: string; clave: string }

export type DatoClaveMostrado = { clave: string; etiqueta: string; valor: ValorMostrado }

type Contexto = {
  tipoDeOrigen: 'subasta' | 'manual'
  // Los campos del layout que son datos clave (≤ 4): los demás no hacen falta.
  campos: readonly CampoDeDatoClave[]
  categorias: readonly CategoriaDeVehiculo[]
  locale?: string
  zona?: string
}

// El nombre de la columna (`categoria_id`) al de la propiedad del vehículo (`categoriaId`).
const PROPIEDAD: Readonly<Record<string, ClaveComun>> = {
  categoria_id: 'categoriaId',
  url_origen: 'urlOrigen',
}

function valorDeUnComun(
  columna: string,
  vehiculo: Vehiculo,
  contexto: Contexto,
): ValorMostrado | null {
  const propiedad = PROPIEDAD[columna] ?? columna
  const campo = camposComunes(contexto.tipoDeOrigen).find((uno) => uno.clave === propiedad)
  if (!campo) return null
  return valorComun(campo, vehiculo, {
    categorias: contexto.categorias,
    ...(contexto.locale === undefined ? {} : { locale: contexto.locale }),
  })
}

/** Los datos clave con su valor, en el orden del origen. Uno que ya no se puede leer (un campo que no llegó, un común de otro tipo) no se muestra. */
export function datosClaveDelVehiculo(
  datos: readonly DatoClaveDelOrigen[],
  vehiculo: Vehiculo,
  contexto: Contexto,
): DatoClaveMostrado[] {
  return datos.flatMap((dato): DatoClaveMostrado[] => {
    if (dato.de === 'comun') {
      const valor = valorDeUnComun(dato.clave, vehiculo, contexto)
      return valor === null ? [] : [{ clave: dato.clave, etiqueta: dato.etiqueta, valor }]
    }
    const campo = contexto.campos.find((uno) => uno.id === dato.campoId)
    if (!campo) return []
    const formato = {
      ...(contexto.locale === undefined ? {} : { locale: contexto.locale }),
      ...(contexto.zona === undefined ? {} : { zona: contexto.zona }),
    }
    return [
      {
        clave: dato.clave,
        etiqueta: dato.etiqueta,
        valor: valorMostrado(campo, vehiculo.atributos[campo.clave], formato),
      },
    ]
  })
}
