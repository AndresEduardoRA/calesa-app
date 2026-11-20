import { metadataDeCatalogo, PaginaDeCatalogoDeLogistica } from '../pagina-de-catalogo-de-logistica'

export const metadata = metadataDeCatalogo('navieras')

export default function PaginaDeNavieras() {
  return <PaginaDeCatalogoDeLogistica clave="navieras" />
}
