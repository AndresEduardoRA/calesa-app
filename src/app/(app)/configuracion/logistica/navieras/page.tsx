import { metadataDeCatalogo, PaginaDeCatalogoDeLogistica } from '../pagina-de-catalogo'

export const metadata = metadataDeCatalogo('navieras')

export default function PaginaDeNavieras() {
  return <PaginaDeCatalogoDeLogistica clave="navieras" />
}
