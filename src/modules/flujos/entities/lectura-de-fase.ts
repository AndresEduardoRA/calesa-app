// Los textos de lo que el inspector de una fase muestra, sólo lectura (5.02). Puros: sin I/O ni componentes. De los requisitos sólo se dice cuántos hay
// por tipo y si bloquean: sus claves y los nombres de los tipos de documento los dicen 5.07 a 5.09 (D16).
import { formatearNumero } from '@/shared/lib/formato'
import type { FaseParaConfigurar, FlujoParaConfigurar, RequisitoParaConfigurar } from './flujo'

export type MarcaDeFase = 'Inicial' | 'Final' | 'Subasta' | 'Jubilada'

// Lo que se dice de una fase junto a su nombre, en la lista y en el diagrama: «Subasta» es la fase de subasta (`es_subasta`).
export function marcasDeLaFase(
  fase: Pick<FaseParaConfigurar, 'esInicial' | 'esFinal' | 'esSubasta' | 'activa'>,
): MarcaDeFase[] {
  const marcas: MarcaDeFase[] = []
  if (fase.esInicial) marcas.push('Inicial')
  if (fase.esFinal) marcas.push('Final')
  if (fase.esSubasta) marcas.push('Subasta')
  if (!fase.activa) marcas.push('Jubilada')
  return marcas
}

// `demora_dias` nulo hereda la de la empresa; 0 apaga la alerta.
export function textoDeLaDemora(demoraDias: number | null): string {
  if (demoraDias === null) return 'Usa la demora de la empresa'
  if (demoraDias === 0) return 'Sin alerta de demora'
  if (demoraDias === 1) return 'Alerta al día 1'
  return `Alerta a los ${formatearNumero(demoraDias)} días`
}

export type RolLeido = { id: string; nombre: string }

// Un rol que no está en la lista leída (más de 100 roles) se dice «otro rol».
function nombresDeRoles(rolIds: readonly string[], roles: readonly RolLeido[]): string[] {
  return rolIds.map((id) => roles.find((r) => r.id === id)?.nombre ?? 'otro rol')
}

export type SalidaDeFase = { accion: string; destino: string; roles: string[] }

// Las transiciones que salen de la fase: la acción (o «Mover»), la fase de destino y los roles de esa transición. Sin roles = quien tenga el permiso.
export function salidasDeLaFase(
  flujo: FlujoParaConfigurar,
  faseId: string,
  roles: readonly RolLeido[],
): SalidaDeFase[] {
  return flujo.transiciones
    .filter((t) => t.deFaseId === faseId)
    .map((t) => ({
      accion: t.accion ?? 'Mover',
      destino: flujo.fases.find((f) => f.id === t.aFaseId)?.nombre ?? 'otra fase',
      roles: nombresDeRoles(
        flujo.rolesPorTransicion.filter((r) => r.transicionId === t.id).map((r) => r.rolId),
        roles,
      ),
    }))
}

// Los roles que pueden mover una unidad HASTA la fase (la lista de la transición, si existe, manda sobre ésta: `fases_roles` en la base).
export function rolesDeLaFase(
  flujo: FlujoParaConfigurar,
  faseId: string,
  roles: readonly RolLeido[],
): string[] {
  return nombresDeRoles(
    flujo.rolesPorFase.filter((r) => r.faseId === faseId).map((r) => r.rolId),
    roles,
  )
}

const ROTULO_DE_TIPO = { documento: 'Documentos', dato: 'Datos', espera: 'Esperas' } as const

// «Documentos: 1 (bloquea)», «Datos: 2 (1 bloquea)». Sin requisitos, lista vacía.
export function resumenDeRequisitos(
  requisitos: readonly RequisitoParaConfigurar[],
  faseId: string,
): string[] {
  const resumen: string[] = []
  for (const tipo of ['documento', 'dato', 'espera'] as const) {
    const deEsteTipo = requisitos.filter((r) => r.faseId === faseId && r.tipo === tipo)
    if (deEsteTipo.length === 0) continue
    const bloquean = deEsteTipo.filter((r) => r.bloqueante).length
    const aviso =
      bloquean === 0
        ? ''
        : bloquean === deEsteTipo.length && deEsteTipo.length === 1
          ? ' (bloquea)'
          : ` (${formatearNumero(bloquean)} ${bloquean === 1 ? 'bloquea' : 'bloquean'})`
    resumen.push(`${ROTULO_DE_TIPO[tipo]}: ${formatearNumero(deEsteTipo.length)}${aviso}`)
  }
  return resumen
}

// Los requisitos de una fase en una línea, para la caja del diagrama: «2 requisitos · 1 bloquea», «1 requisito» o «Sin requisitos».
export function requisitosEnCorto(
  requisitos: readonly RequisitoParaConfigurar[],
  faseId: string,
): string {
  const deLaFase = requisitos.filter((r) => r.faseId === faseId)
  if (deLaFase.length === 0) return 'Sin requisitos'
  const cuantos = `${formatearNumero(deLaFase.length)} ${deLaFase.length === 1 ? 'requisito' : 'requisitos'}`
  const bloquean = deLaFase.filter((r) => r.bloqueante).length
  return bloquean === 0
    ? cuantos
    : `${cuantos} · ${formatearNumero(bloquean)} ${bloquean === 1 ? 'bloquea' : 'bloquean'}`
}

const NOMBRES_EN_CORTO = 2

// Quién puede mover hasta la fase en una línea: «Mueve: cualquiera con permiso», «Mueve: Logística», «Mueven: A, B» o «Mueven: A, B y 3 más».
export function quienMueveEnCorto(nombres: readonly string[]): string {
  if (nombres.length === 0) return 'Mueve: cualquiera con permiso'
  const vistos = nombres.slice(0, NOMBRES_EN_CORTO).join(', ')
  const resto = nombres.length - NOMBRES_EN_CORTO
  const lista = resto > 0 ? `${vistos} y ${formatearNumero(resto)} más` : vistos
  return `${nombres.length === 1 ? 'Mueve' : 'Mueven'}: ${lista}`
}
