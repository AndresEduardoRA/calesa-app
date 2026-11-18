// Los datos clave del lead: lo que la columna de la izquierda de la ficha muestra a la vista (tipo, origen, país, teléfono principal y
// notas); todo lo demás va en «Ver más». «País» y «Notas» no son columnas: son campos del layout que la empresa puede tener o no, y se
// encuentran por su nombre. La base ya recortó los privados: acá sólo se decide qué se dice. Nada de React.
import type { CampoDeLead } from './campo'

// Lo que hace falta de un campo para encontrarlo y decir su valor.
type CampoConNombre = Pick<CampoDeLead, 'clave' | 'etiqueta' | 'activo' | 'tipo' | 'soloCartera'>

// Sin tildes, mayúsculas ni espacios en los bordes: «PAÍS », «país» y «pais» son el mismo nombre.
function plegar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim()
}

// El primer campo activo cuya etiqueta o clave es `nombre` (plegados los dos). Uno apagado no cuenta: no se muestra en ningún lado.
export function campoPorNombre<C extends CampoConNombre>(
  campos: readonly C[],
  nombre: string,
): C | null {
  const buscado = plegar(nombre)
  return (
    campos.find(
      (campo) =>
        campo.activo && (plegar(campo.etiqueta) === buscado || plegar(campo.clave) === buscado),
    ) ?? null
  )
}

export const NOMBRE_DEL_CAMPO_PAIS = 'País'
export const NOMBRE_DEL_CAMPO_NOTAS = 'Notas'

export function campoDelPais<C extends CampoConNombre>(campos: readonly C[]): C | null {
  return campoPorNombre(campos, NOMBRE_DEL_CAMPO_PAIS)
}

// «Notas» sólo si es un texto largo: un «Notas» de una línea es otro dato y va en «Ver más».
export function campoDeNotas<C extends CampoConNombre>(campos: readonly C[]): C | null {
  const campo = campoPorNombre(campos, NOMBRE_DEL_CAMPO_NOTAS)
  return campo?.tipo === 'texto_largo' ? campo : null
}

// Qué se sabe del valor de un campo para quien mira:
// - `valor`: tiene algo que mostrar;
// - `privado`: es «solo la cartera» y quien mira no lo recibe (no se sabe si hay algo: nunca un guion que haría creer que no);
// - `vacio`: el campo existe y no tiene nada;
// - `sin_campo`: la empresa no tiene ese campo (o lo apagó).
export type DatoDelCampo<C> =
  | { tipo: 'valor'; campo: C; valor: unknown }
  | { tipo: 'privado'; campo: C }
  | { tipo: 'vacio'; campo: C }
  | { tipo: 'sin_campo' }

function esVacio(valor: unknown): boolean {
  return (
    valor === undefined ||
    valor === null ||
    (typeof valor === 'string' && valor.trim() === '') ||
    (Array.isArray(valor) && valor.length === 0)
  )
}

// Privado con la regla de siempre (la de «Datos» y el listado): no llegó, es «solo la cartera» y el lead no es de la cartera de quien mira.
export function datoDelCampo<C extends CampoConNombre>(
  campo: C | null,
  atributos: Readonly<Record<string, unknown>>,
  enCartera: boolean,
): DatoDelCampo<C> {
  if (!campo) {
    return { tipo: 'sin_campo' }
  }
  const valor = atributos[campo.clave]
  if (valor === undefined && campo.soloCartera && !enCartera) {
    return { tipo: 'privado', campo }
  }
  return esVacio(valor) ? { tipo: 'vacio', campo } : { tipo: 'valor', campo, valor }
}

// De dónde sale el país que se muestra: el campo «País» con valor manda; un «País» privado se dice como privado (no se adivina por el
// teléfono: sería contar lo que la empresa quiso guardar sólo para la cartera); sin campo o vacío, el del teléfono principal; si tampoco,
// nada («—»).
export type PaisDeLosDatos<C> =
  | { tipo: 'campo'; campo: C; valor: unknown }
  | { tipo: 'privado' }
  | { tipo: 'telefono'; pais: string }
  | { tipo: 'nada' }

export function paisDeLosDatos<C>({
  dato,
  paisDelTelefono,
}: {
  dato: DatoDelCampo<C>
  paisDelTelefono: string | null
}): PaisDeLosDatos<C> {
  switch (dato.tipo) {
    case 'valor':
      return { tipo: 'campo', campo: dato.campo, valor: dato.valor }
    case 'privado':
      return { tipo: 'privado' }
    case 'vacio':
    case 'sin_campo':
      return paisDelTelefono ? { tipo: 'telefono', pais: paisDelTelefono } : { tipo: 'nada' }
  }
}

// ¿Hace falta el país del teléfono? Sólo si el campo no lo dice y el número sirve para saberlo (el enmascarado no: con tres dígitos no es
// seguro). Con esto se pide la tabla de países sólo cuando se va a usar.
export function necesitaElPaisDelTelefono(dato: DatoDelCampo<unknown>, numero: string): boolean {
  return (
    (dato.tipo === 'vacio' || dato.tipo === 'sin_campo') && numero !== '' && !numero.includes('•')
  )
}
