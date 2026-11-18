import { EsqueletoTabla } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/web`: el esqueleto no carga el barril de pantallas.
export default function CargandoWebTestimonios() {
  return <EsqueletoTabla filas={6} columnas={3} />
}
