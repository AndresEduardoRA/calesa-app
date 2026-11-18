import { z } from 'zod'
import { esquemaVersion } from '@/shared/lib/campos'
import { esquemaDatosClave } from '../../../entities/datos-clave'

// La lista entera de datos clave de un origen, con la versión del origen que se tenía en pantalla.
export const esquemaGuardarDatosClave = z.object({
  origenId: z.guid(),
  datos: esquemaDatosClave,
  actualizadoEnEsperado: esquemaVersion,
})
