'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { MasAcciones } from '@/shared/ui/lista'

// El «⋯» de la cabecera de la puesta en marcha, arriba a la derecha: «Salir de la puesta en marcha» lleva a la página del origen. Lo guardado ya está
// en la base; lo que un editor tiene sin guardar lo cuida su propia guarda.
export function MenuDeLaPuestaEnMarcha({ nombre, salida }: { nombre: string; salida: string }) {
  const router = useRouter()
  return (
    <MasAcciones
      nombre={nombre}
      conBorde
      acciones={[
        {
          tipo: 'accion',
          clave: 'salir',
          etiqueta: 'Salir de la puesta en marcha',
          alElegir: () => {
            // La ruta la arma `src/app` con `rutaDeParteDelOrigen()`.
            router.push(salida as Route)
          },
        },
      ]}
    />
  )
}
