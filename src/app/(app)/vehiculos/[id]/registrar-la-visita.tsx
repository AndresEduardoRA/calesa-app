import { RegistrarVisita } from '@/modules/buscador/pantallas/visita'
import { RegistrarVisto } from '@/modules/equipo/client'

// La visita a la ficha de un vehículo: para el buscador (los últimos abiertos) y para lo «visto» de las listas.
export function RegistrarLaVisita({ id }: { id: string }) {
  return (
    <>
      <RegistrarVisita tipo="vehiculo" id={id} />
      <RegistrarVisto modulo="vehiculos" tipo="vehiculo" id={id} />
    </>
  )
}
