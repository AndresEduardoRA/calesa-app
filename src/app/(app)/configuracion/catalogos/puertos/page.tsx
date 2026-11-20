import { metadataDeCatalogo, PaginaDeCatalogoDeLogistica } from '../pagina-de-catalogo-de-logistica'

export const metadata = metadataDeCatalogo('puertos')

export default function PaginaDePuertos() {
  return <PaginaDeCatalogoDeLogistica clave="puertos" />
}
