// Los datos del vehículo que se eligen en «Tipo de celda» y en lo que casa una tabla: las columnas comunes con su nombre y, después, las claves propias del origen.
import { CAMPOS_COMUNES } from '../../../../../entities/campos-que-faltan'

const NOMBRE_DEL_CAMPO: Readonly<Record<string, string>> = {
  anio: 'Año',
  marca: 'Marca',
  modelo: 'Modelo',
  kilometraje: 'Kilometraje',
  precio: 'Precio',
}

export const nombreDelCampo = (campo: string) => NOMBRE_DEL_CAMPO[campo] ?? campo

export const camposDelVehiculo = (propios: readonly string[]) => [
  ...CAMPOS_COMUNES,
  ...propios.filter((c) => !CAMPOS_COMUNES.includes(c)),
]
