import { EsqueletoDeLaBandeja } from '@/modules/logistica/pantallas/alertas-esqueletos'
import { EsqueletoDeLaGrafica } from '@/modules/logistica/pantallas/cadena-esqueletos'

export default function CargandoLogistica() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <EsqueletoDeLaBandeja />
      <EsqueletoDeLaGrafica />
    </div>
  )
}
