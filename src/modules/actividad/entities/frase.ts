// Un cambio de la actividad dicho como frase (`docs/UX.md` › «Actividad»): «Ana cambió Precio de Toyota Hilux #12: 10.000 → 12.000». Quién,
// qué hizo, qué campo (el primero y «y N más»), sobre qué registro (enlazado si existe y se ve) y, con un solo campo, su antes y su después.
// Una fila que quien mira no ve dice sólo que hubo un cambio. Todo sale de la fila que dio la base: ningún valor se lee de otro lado.
import type { FilaDeActividad } from './actividad'
import { presentarDiff, type ValorPresentado } from './diff'
import { etiquetaDeCampo, nombreDelActor, verboDeLaAccion } from './etiquetas'
import {
  cuelgaDeUnaUnidad,
  enlaceDelRegistro,
  entidadEnFrase,
  iconoDeEntidad,
  type IconoDeEntidad,
} from './registro'

export type FraseDeActividad = {
  persona: string
  icono: IconoDeEntidad
  // Lo que va antes del registro, en minúscula: «cambió», «creó», «resolvió la subasta de».
  predicado: string
  // El campo que cambió y, si hubo otros, cuántos más («2», «4+»).
  campo: { etiqueta: string; otros: string | null } | null
  // El registro: `prefijo` en lo que cuelga de una unidad («un gasto» de Toyota Hilux #12).
  registro: { prefijo: string | null; texto: string; enlace: string | null }
  // Sólo con un campo: su antes y su después.
  cambio: { antes: ValorPresentado; despues: ValorPresentado } | null
  // Quien mira no ve la fila: «… que no puedes ver», nunca qué.
  oculta: boolean
}

export type FilaParaLaFrase = Omit<FilaDeActividad, 'id' | 'creadoEn'>

function enMinuscula(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1)
}

function registroDe(fila: FilaParaLaFrase): FraseDeActividad['registro'] {
  const enFrase = entidadEnFrase(fila.tabla)
  if (!fila.visible) {
    return { prefijo: null, texto: enFrase, enlace: null }
  }
  const enlace = enlaceDelRegistro(fila)
  if (fila.registroTitulo === null) {
    return { prefijo: null, texto: enFrase, enlace }
  }
  return {
    prefijo: cuelgaDeUnaUnidad(fila.tabla) ? enFrase : null,
    texto: fila.registroTitulo,
    enlace,
  }
}

// El primer campo presentado como en el diff (un monto como monto, cada lado con la moneda de su foto); de `atributos`, la clave de adentro.
function primerCampoPresentado(fila: FilaParaLaFrase) {
  const primero = fila.primerCambio
  if (primero === null) {
    return null
  }
  const [presentado] = presentarDiff(
    {
      id: 0,
      visible: true,
      accion: fila.accion,
      tabla: fila.tabla,
      registroId: fila.registroId,
      actorId: fila.actorId,
      actorNombre: fila.actorNombre,
      creadoEn: '',
      cambios: { [primero.campo]: { antes: primero.antes, despues: primero.despues } },
      monedaAntes: primero.monedaAntes,
      monedaDespues: primero.monedaDespues,
      origenId: null,
    },
    { monedaAntes: primero.monedaAntes, monedaDespues: primero.monedaDespues },
  )
  return presentado ?? null
}

function campoDe(
  fila: FilaParaLaFrase,
  presentado: ReturnType<typeof primerCampoPresentado>,
): FraseDeActividad['campo'] {
  const [primero] = fila.campos
  if (primero === undefined) {
    return null
  }
  const otros = fila.campos.length - 1
  return {
    etiqueta: presentado?.etiqueta ?? etiquetaDeCampo(fila.tabla, primero),
    otros: fila.masCampos ? `${String(otros)}+` : otros > 0 ? String(otros) : null,
  }
}

export function fraseDeActividad(fila: FilaParaLaFrase): FraseDeActividad {
  const presentado = fila.visible ? primerCampoPresentado(fila) : null
  const campo = fila.visible ? campoDe(fila, presentado) : null
  const unSoloCampo = campo !== null && campo.otros === null
  return {
    persona: nombreDelActor(fila),
    icono: iconoDeEntidad(fila.tabla),
    predicado: enMinuscula(verboDeLaAccion(fila.accion)),
    campo,
    registro: registroDe(fila),
    cambio:
      unSoloCampo && presentado ? { antes: presentado.antes, despues: presentado.despues } : null,
    oculta: !fila.visible,
  }
}

// Un valor en texto plano, para el nombre accesible y las pruebas (la pantalla dibuja un monto con `<Monto>`).
function valorEnTexto(valor: ValorPresentado): string {
  switch (valor.tipo) {
    case 'vacio':
      return 'vacío'
    case 'monto':
      return String(valor.valor)
    case 'fecha':
      return valor.iso
    case 'si_no':
      return valor.valor ? 'Sí' : 'No'
    case 'texto':
      return valor.texto
  }
}

// La frase entera en una línea: «Ana cambió Precio de Toyota Hilux #12: 10000 → 12000».
export function textoDeLaFrase(frase: FraseDeActividad): string {
  const campo = frase.campo
    ? ` ${frase.campo.etiqueta}${frase.campo.otros ? ` y ${frase.campo.otros} más` : ''} de`
    : ''
  const registro = `${frase.registro.prefijo ? `${frase.registro.prefijo} de ` : ''}${frase.registro.texto}`
  const oculta = frase.oculta ? ' que no puedes ver' : ''
  const cambio = frase.cambio
    ? `: ${valorEnTexto(frase.cambio.antes)} → ${valorEnTexto(frase.cambio.despues)}`
    : ''
  return `${frase.persona} ${frase.predicado}${campo} ${registro}${oculta}${cambio}`
}
