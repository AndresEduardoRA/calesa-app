import type { CodigoError } from '@/shared/lib/errores'

// Lo que se dice si el PDF de una guardada no baja (el pie de «Vista previa» y la línea del «⋯»): textos propios, nunca el cuerpo de la respuesta.
export function textoDelFalloDelPdf(codigo: CodigoError): string {
  if (codigo === 'no_encontrado') {
    return 'Esta cotización ya no está disponible.'
  }
  if (codigo === 'no_autenticado') {
    return 'Tu sesión ya no vale: vuelve a entrar.'
  }
  return 'No se pudo armar el PDF.'
}
