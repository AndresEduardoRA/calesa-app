import type {
  ConsultaDeVistos,
  LecturaDeVistos,
  ModuloDeVistos,
  TipoDeVistos,
} from '../../entities/vistos'

// La E/S de «visto» (supabase-js en el navegador) se pide al usarse: una lista no la carga en frío y, con «Vistos» apagado, ni se pide. No son
// Server Actions a propósito: el router ejecuta las actions de a una y una lectura por montaje haría esperar a las mutaciones reales.
// Un fallo (red, el chunk que no llega) no se dice: marcar lo visto nunca frena lo que la persona hacía.

export async function leerVistosAlUsar(
  modulo: ModuloDeVistos,
  consultas: readonly ConsultaDeVistos[],
): Promise<LecturaDeVistos | null> {
  try {
    return await (
      await import('../../composicion-vistos.client')
    ).leerVistosDelContexto(modulo, consultas)
  } catch {
    return null
  }
}

export async function registrarVistoAlUsar(
  modulo: ModuloDeVistos,
  tipo: TipoDeVistos,
  id: string,
): Promise<void> {
  try {
    await (await import('../../composicion-vistos.client')).registrarVisto(modulo, tipo, id)
  } catch {
    // En silencio.
  }
}
