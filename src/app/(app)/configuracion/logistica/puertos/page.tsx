import { metadataDeCatalogo, PaginaDeCatalogoDeLogistica } from '../pagina-de-catalogo'

export const metadata = metadataDeCatalogo('puertos')

export default function PaginaDePuertos() {
  return <PaginaDeCatalogoDeLogistica clave="puertos" />
}
