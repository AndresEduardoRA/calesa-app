# cotizaciones

Cotizador configurable: fórmula por origen como grafo de nodos versionado, XCell con ⚙ de default global, tablas de referencia, snapshot por cotización, preventa/final, versiones, comentarios, adjuntos, reportes, plantilla de tarjeta y PDF, comprobantes.

El dominio (nodos, motor, reglas, niveles, cómo se guarda) está en `docs/COTIZADOR.md`: esta ficha no lo repite.

## Entra y sale

- **`/cotizaciones/nuevo?origen=&lead=&vehiculo=`** (pide `cotizaciones.crear` y `cotizaciones.ver` del origen, 4-32). Lead y vehículo son ids,
  sin importar esos módulos: sobre la hoja van la barra del vehículo de `vehiculos/pantallas/cotizar` (`?panel=vehiculo`, escribe `CLAVE_DE_VEHICULO`)
  y la del cliente de `leads/pantallas/cotizar` (`?panel=cliente`, `CLAVE_DE_LEAD`); un lead o vehículo que quien mira no ve se suelta. Lead y vehículo son
  **obligatorios salvo con `cotizaciones.crear.sin_lead` y `cotizaciones.crear.sin_vehiculo` del origen** (una final, siempre): la página los calcula con
  `sesion.permisos` (`obligatoriosAlCotizar()`, `eleccionesDeLaHoja()`: con «Ver como», los del rol elegido; la base usa los reales) y manda booleanos y
  textos; `loQueFalta()` (el lead primero, como la base) da el motivo junto a «Guardar» (`FALTA_EL_LEAD`, `FALTA_EL_VEHICULO`) y `<ElegirLoQueFalta>` el
  botón «Elegir el cliente» o «Elegir el vehículo» (abre `?panel=cliente` o `?panel=vehiculo`, nombres que pasa `src/app`) o, sin `leads.ver` o
  `vehiculos.ver` del origen, el pedido a quien administra los roles; si la regla cambió con la hoja abierta, el rechazo (`falta_lead`, `falta_vehiculo`) trae
  la misma salida. El pedido lleva `leadId` nulo con la clave. El borrador de la hoja va por persona, origen y
  vehículo, **sin el lead** (elegir el cliente remonta la hoja y repone lo tipeado); el pendiente del guardado va por lead. Guardar: la action
  `features/hoja/actions/crear-cotizacion.ts` (`cotizacion_crear`, siempre `ok(ResultadoDeCrear)`, sin `revalidatePath`).
- **El título de la cotización** (`entities/titulo-de-la-cotizacion.ts`, glosario): `tituloDeLaCotizacion({ titulo, vehiculo, numero })` es la única regla de lo
  que se muestra (el suyo, el del vehículo o «Cotización n.º N», con su `fuente` para no repetir el número o el vehículo); la tarjeta y el PDF usan
  `tituloAparteDelNumero()`. Lo que se edita vive en `<ProveedorDelTitulo>` (`features/hoja/components/titulo/`, por `pantallas/cotizar` y `pantallas/cotizacion`), que
  `src/app` pone **sobre las barras y la hoja** (fuera de la `key` de la hoja; `key` del origen en la nueva y de la versión en una guardada); `useTituloDeLaCotizacion()`
  (`client.ts`) da `mostrado`, `estado`, `escribir`, `pedirFoco`, `rechazo` y `alGuardar` (nulo fuera del proveedor: la hoja no lo pide). Su borrador va en la pestaña
  (`claveDelTitulo()`, por el vehículo con que se abrió; `claveDelTituloDeUnaGuardada()`, por versión). El campo (`CampoDelTituloDiferido`) entra al panel del vehículo
  por el hueco `arribaDelPanel` de la barra; la barra recibe el título ya resuelto. `loQueFalta()` suma `'titulo'` (sin vehículo, después del lead y del vehículo;
  `FALTA_EL_TITULO`, «Escribir el título», que pide el foco y abre `?panel=vehiculo`); el rechazo `falta_titulo` / `titulo_largo` (`campo: 'titulo'`) se repite
  debajo del campo. El pedido lleva `titulo` (sólo el manual) y `tituloManual` (`tituloParaGuardar()`); la base pone el automático.
- **`/cotizaciones`** (`cotizaciones.ver` en algún origen): `?q=` (el buscador: número, título, cliente, vehículo y autor; 3 letras o un número,
  `MINIMO_DE_BUSQUEDA_DE_COTIZACIONES`; con texto la página lee `cotizaciones_buscar()` en vez de `cotizaciones_listado()`, con los mismos filtros y cursor, y la
  página dice `acotada` si una fuente nombró más de `TOPE_DE_COINCIDENCIAS`), las vistas guardadas en «Vista y opciones» (`pantalla = 'cotizaciones'`, `VistasDeCotizacionesDiferido`:
  `<VistasGuardadas>` pesa ≈ 70 KB gz y el presupuesto de la ruta es 380), `?origen=` (sólo con 2 o más), `?clase=preventa|final`, `?cuales=mias` (las que creó quien
  mira), `?por=`, `?cursor=`; `?vehiculo=` y `?lead=` no son del esquema (ni chip ni los borra «Limpiar»): los escribe `rutaDelListado()` como camino a
  lo antiguo del historial del vehículo y del lead, y el aviso de arriba (`textoDelAviso()`) sólo nombra lo que quien mira ve. Los nombres llegan por
  clave primaria (leads sólo con `leads.ver`) y los une `filasConNombres()`: lo que no llega es «—». Lee `cotizaciones_listado()` (invocadora: decide la
  RLS) por cursor, con `MAXIMO_DE_PAGINA_DE_COTIZACIONES` (100). El clic abre el resumen `?cotizacion=` (por `diferido()`; abrir o cerrar borra `?pestana=`); la que no está
  en la página la lee el servidor con `leerUnaDelListado()` (su fila y `cotizaciones_listado()` de tamaño `UNA` con el cursor `(creado_en, id + 1)`) y, si
  no llega, `usePedidoAlServidor()` pide una vez y luego «Reintentar»; `idDelResumen()` es la única lectura de la clave. **Las pestañas del resumen** (`?pestana=todo|adjuntos|revisiones|comentarios`, `entities/pestanas-del-resumen.ts`; «Todo» no escribe nada) son un hueco
  (`HuecosDelResumen`, `features/hoja/components/huecos-del-resumen.ts`): `src/app` une `pantallas/comentarios-resumen.ts` (`Pestanas`, sólo la cáscara `diferido()`) y
  `pantallas/comprobantes-resumen.ts` (`Comprobantes`, bajo los adjuntos) en `listado-con-acciones.tsx`, y el servidor manda `quienesDelResumen()` (`puedeAdjuntar` y `puedeModerar` por
  id, de las reglas del «⋯» sobre la fila: ninguna pregunta a la base; una cotización sin entrada ahí no adjunta ni modera). Detalle: `areas/comentarios/CLAUDE.md` › «El resumen». «Nueva cotización»
  (`origenParaNueva()`) y la tecla `N`. **El «⋯» de cada fila** (`accionesDeCotizacion()`, la lista del núcleo que también dibuja el «⋯» de la guardada: primero y solo «Compartir cotización…», aprobar, marcar final, favorita, reportar, invalidar / descartar /
  reactivar y, al final, la papelera) se compone en `src/app/(app)/cotizaciones/`: `menus-de-la-pagina.ts` (servidor) lee las marcas y la versión de la
  página (`leerMarcasDeLaPagina()`, tres lecturas por clave primaria) y arma lo que cada fila ofrece con las reglas de cada área (`ofertasDeLaFila()`;
  `puedeGuardarDesdeElListado()` espeja `_cotizacion_puede_guardar()`); `listado-con-acciones.tsx` y `use-acciones-de-la-lista.ts` (navegador) llaman a las
  actions de la guardada y montan una vez los diálogos de compartir, marcar final, reportar y moderar (`?panel=…&para=<id>`, `CLAVE_DE_LA_FILA`, `usePanelDeFila()`). Una
  fila sin sus marcas no tiene «⋯». La lista del menú sale por `pantallas/listado.ts`, nunca por `client.ts` (ese barril trae el JS de la hoja).
- **`/cotizaciones/[id]`** (`cotizaciones.ver`): la hoja de una guardada con SU versión (`cotizacion_hoja_guardada()` y `cotizacion_evaluar(p_cotizacion)`
  con lo guardado; `entradasDeLoGuardado()` espeja `_cotizacion_entradas_de`); sin `puede_guardar` de la base, sólo lectura. El recálculo usa tablas y
  vehículo de hoy: si difiere (`difiereAlAbrir()`) se dice y se muestra «Total guardado». «Guardar» (`cotizacion_guardar`, siempre
  `ok(ResultadoDeCrear)`, `revalidatePath` sólo si entró) manda la versión vista (`actualizadoEn`), las entradas al día, el título y si es manual (del
  proveedor), las notas sin tocar y el vehículo de la hoja; apagado sin cambios (cambiar el título o el vehículo es un cambio), salvo con un pendiente (4-21) o si lo de hoy no es lo
  guardado. Sin vehículo y sin título pide el título como la nueva (`panelDelTitulo`, que pasa `src/app`). La cabecera (`CabeceraDeLaGuardada`, hueco `barra`)
  dibuja la barra del vehículo de `vehiculos` que arma `src/app/(app)/cotizaciones/[id]/` (`barra-de-la-guardada.tsx`, diferida): el título grande y el
  vehículo debajo; con `puede_guardar` abre el panel con el campo del título arriba. Pendiente y borrador van por persona y cotización, el
  borrador además con la versión (`claves-de-la-hoja.ts`).
- **La cabecera de una guardada, compacta** (`docs/UX.md` › «Cotización guardada»): a la vista la clase, la vigencia, las insignias, «Guardar» (sólo con
  `puede_guardar`: el `BotonGuardar` del resumen se dibuja en su lugar por un portal, `useRanuraDeGuardar()`) y «Compartir» (`compartir()` del hueco de la vista
  previa); lo demás en el «⋯» (`features/hoja/components/menu-de-la-guardada/`: `ProveedorDelMenuDeLaGuardada`, que la página pone sobre la cabecera y la hoja,
  `useAporteAlMenu()` y `<MenuDeLaGuardada>`). Suman líneas la vista previa (`vista-previa`, sin botón en el pie cuando hay «⋯»), `<PdfDelMenu>` del área `tarjeta`
  (`pdf`), las revisiones, `<AvisoDeVersion>` (`encima`, sólo si el aviso lo ofrece) y las áreas por `Acciones`; quien suma no lee las líneas (si no, se vuelve a
  dibujar en bucle) y el foco vuelve al «⋯» (`botonRef`). La lista y su orden son del núcleo (`entities/acciones-de-cotizacion.ts`: `accionesDeCotizacion(ofertas,
{ aLaVista })`, `A_LA_VISTA_EN_LA_GUARDADA`), la misma del «⋯» del listado.
- **Cambiar el vehículo de una preventa guardada** (T315): `cambioDeVehiculo({ clase, puedeGuardar })` (`entities/vehiculo-de-la-guardada.ts`, del núcleo) da
  `elige` (la barra en modo `cambiar`: el panel de cotizar sin «Quitar», con alta; el dato del vehículo de una tabla no se elige ahí), `final` (`ver_elegido` con
  `MOTIVO_DE_LA_FINAL`) o `no` (`solo_mostrar`). Lo elegido vive en `?vehiculo=` (`CLAVE_DE_VEHICULO`, lo escribe el panel con `shallow: false`): `leerHojaDeUnaGuardada(id,
{ vehiculo })` calcula con él si `vehiculoParaCalcular()` lo deja (preventa, `puede_guardar`, otro que el guardado) y devuelve `vehiculoNuevo`; si la base lo rechaza,
  calcula con el suyo y `vehiculoSoltado` (la barra dice «No se puede usar ese vehículo.» con «Elegir otro vehículo»). `PantallaDeUnaGuardada` recibe `vehiculoNuevo`
  (congelado con la hoja) y `cambiaVehiculo`; la `key` de la hoja suma el vehículo (el borrador repone lo tipeado), el aviso de C11 no se dice con otro vehículo
  (el «Total guardado», sí), guardar manda `cambiaElVehiculo` (no va a la RPC: con él, un 42501 sin detalle es `vehiculo_sin_acceso`, que ofrece «Elegir otro
  vehículo») y, guardado, suelta `?vehiculo=` con `nuqs` sin ir al servidor; «Recargar» lo suelta yendo (`useSoltarElVehiculo()`). Tarjeta, PDF, huecos y cabecera
  siguen con lo guardado; la barra, el título y la hoja, con el nuevo.
- **`/cotizaciones/comparar?ids=a,b[,c]&returnTo=`** (pide sesión; `cotizaciones.ver` de cada una lo decide la base): «Comparar cotizaciones», del área
  `aprobada` (`areas/aprobada/CLAUDE.md` › «Comparar cotizaciones»; `pantallas/aprobada-comparar.ts` y `aprobada-esqueleto-de-comparar.ts`). Lo guardado sin
  recálculo. El enlace (`rutaDeComparar`) y la lectura de `ids` (`idsParaComparar`: 2 o 3 guids distintos, en minúsculas, en el orden de la URL) son del
  núcleo (`entities/ruta-de-comparar.ts`): los usan «De este vehículo» y la lista agrupada.
- La hoja guarda en la URL lo que abre (se borra al guardar): `?panel=avanzado`, `?panel=vista-previa` (la tarjeta; sólo con `<ProveedorDeLaTarjeta>`,
  también para quien sólo ve; en una guardada dibuja lo guardado), `?ayuda=texto|tabla&nodo=<id>` (sólo lectura; la URL no abre lo que la hoja no dibuja)
  y, con el proveedor del área, `?ajuste=celda&nodo=<id>` (el ⚙, también dentro de «Avanzado») y `?ajuste=cabecera` (el ⚙ de la cabecera: «Configuración por
  defecto de <Origen>», junto a los modos; sólo con `cabecera.ajustes` de la base y el hueco `AjusteDeLaCabecera` lleno).
- **Los pasos de la hoja** (`<PasosDeLaHoja>`, `entities/pasos-de-la-hoja.ts`, en `ColumnaDeLaHoja` debajo de `CabeceraDeHoja`): `src/app` pasa `pasos`
  (`{ vehiculo, cliente }`, cada uno `{ panel, elegido, obligatorio }` o nulo: en la nueva lo arma `reglasDeLaHoja()` con `vehiculos.ver` y `leads.ver`; en una
  guardada, sólo «Vehículo» si la barra no es `solo_mostrar`). «Hoja» suelta `panel`, `ayuda`, `ajuste` y `nodo` y enfoca la primera celda que se edita; «Vista
  previa», sólo con `ContextoDeLaVistaPrevia`. El nombre del botón es su etiqueta; el punto, su descripción (un texto `hidden`), su `title` y `data-punto` con
  guiones. Fuera del orden de Tab (la tarea de oro no suma paradas). Sin `pasos` (pruebas, vista previa del
  diseño) no se dibujan. La línea de arriba de «Avanzado» sale de `explicacionDelAvanzado()`; los enlaces de la ayuda de texto, de `enlacesDeLaAyuda()`.
- `index.ts`: `recalcularAlAbrir()` va DESPUÉS de leer la hoja (4-28), con `modoInicial()` (el modo por defecto del diseño o, sin él, el primero); `contarCotizacionesDelVehiculo()`
  («Cotizado (n)») es acotado y con la RLS de quien mira; `rutaDeLaHoja()` la usan «Cotizar» de `/vehiculos` y de `/leads/[id]`;
  `datosDelVehiculoDeLaHoja(hoja)` dice qué campo del vehículo casa con qué tabla (qué se elige lo decide `vehiculos`). Lo consumen `logistica`, `chat`,
  `buscador`, `web` (precio público), `tablero`.
- `client.ts`: `useLectorDeOpciones()`, las opciones de un dato del vehículo (los textos de su columna en `cotizacion_tabla`, 5 min con
  `memoriaDeLectura()`): con él la página arma el lector del panel del vehículo (`vehiculos` no conoce `cotizaciones`). La celda sin valor de un campo que
  se elige (`seEligen`; `campo_sin_valor`, `fila_sin_coincidencia`) dice «Elige el dato del vehículo en «Vehículo»…».
- **«Revisiones»** (`?panel=revisiones`): lee `cotizacion_revisiones` desde el navegador por `composicion-revisiones.client.ts`, con «Ver más» por
  cursor (el id de la última); lo leído es de una versión (`actualizadoEn`). La RPC recorta cada diff al nivel de quien mira; `cambiosDeLaRevision()` da el
  total sólo si llegan los dos números. Un cambio de vehículo se nombra al leer (T315): `idsDeVehiculosDe()` junta los ids de la página y una lectura de `vehiculos`
  por pk (≤ 2 × `TAMANO_DE_VER_MAS`, RLS de quien mira, sin papelera) los vuelve `conVehiculos()` («Cambió el vehículo: A → B», primero; lo que no vuelve es «un
  vehículo que no puedes ver», un lado nulo «sin vehículo»); si esa lectura falla, «Cambió el vehículo». Ningún título se copia a la revisión. «Ir a una fecha»: `p_hasta` es el inicio del día siguiente en la zona de la empresa (exclusivo); el salto
  reemplaza lo leído, «Ver más» sigue sin `p_hasta` y la ventana no va a la URL (`useTurno`). La base supone que el id crece con `creado_en`
  (`docs/PENDIENTES.md`, 4-95).
- **La cadena** (`cadena` de `cotizacion_hoja_guardada`): «Versión V de la n.º N» con enlace a la anterior si se ve, «Hay una versión nueva: n.º M
  (versión W).» o «Hay una versión nueva que no puedes ver.».
- **«Cotizar encima»** (`features/encima/`): el aviso (`avisoDeVersion()`: otra versión que la publicada hoy, o vencida) lo ve todo el que abre; el
  botón, sólo con `cadena.puedeCotizarEncima` (lo decide la base, no `puede()`: una anterior sin lead pide `sin_lead` y una sin vehículo, `sin_vehiculo`). El intento es el id de la nueva y se conserva sólo tras una pérdida; con
  cambios sin guardar o un pendiente el botón espera, porque la nueva lleva lo guardado.
- **Historial** (pestaña de `/vehiculos/[id]` con `cotizaciones.ver` del origen del vehículo; sección de `/leads/[id]` con `cotizaciones.ver` en algún
  origen, sin mirar la cartera: la RLS recorta): se lee al montarse desde el navegador por `composicion-historial.client.ts` (por
  `cotizaciones_vehiculo_creado_idx` o `cotizaciones_lead_creado_idx`), de a 20 hasta 500, y el tope dice «Ver todas en Cotizaciones». Va aparte de
  `composicion.client.ts` y cada cáscara de `diferido()` en su `diferidos.tsx` (`features/historial/components/{pestana,lead}/`) porque lo que importa la
  hoja viaja en la carga en frío de `/cotizaciones/nuevo` (4-73). `usePaginasDelHistorial(de)` descarta lo viejo con `ultimo`; `<ListaDelHistorial>` espera
  300 ms el esqueleto salvo con `esperarEsqueleto={false}` (pestaña y sección: llegan tras el esqueleto del `diferido()`).
- Niveles: `/configuracion/cotizacion?seccion=niveles` (`equipo.roles.ver|gestionar`; `?panel=nuevo-nivel|renombrar-nivel|eliminar-nivel&nivel=<id>`).
- Con Live, las cifras de la ayuda de una celda de dinero pasan por `<Monto>`; las de otra celda quedan a la vista.
- Los `loading.tsx` de la hoja importan `pantallas/esqueleto-de-hoja.ts`, nunca el barril de su pantalla (con él, el HTML en frío baja dos chunks casi
  iguales). El núcleo del guardado (`useNucleoDelGuardado`: pendiente, un envío a la vez, reintento al volver la red) es el mismo de la hoja nueva y de la
  guardada. `hoja-de-una-guardada.ts` viaja al navegador sin Zod; su lectura es `hoja-de-una-guardada-lectura.ts` (sólo servidor).
- **Tablas de referencia** (área `tablas`; `/configuracion/cotizacion?seccion=tablas&origen=&tabla=`, `cotizaciones.configurar`): la lista del origen y
  las compartidas (tope 100; una compartida tapada por una propia va `tapada`) y, con `?tabla=` de esa lista, el editor por `diferido()` de a 100 filas.
  `leerTablaParaEditar()` lee **todas** las filas por cursor `(orden, id)` hasta 2.001: con una fila que no se lee o más de 2.000 no devuelve nada, porque
  publicar reemplaza todas. Se edita en memoria y se valida con el espejo de la base (`entities/tablas/validacion.ts`, `TOPE_DE_FILAS` = 2.000); el
  borrador va por versión en `sessionStorage` (pausado mientras publica) y el editor lleva `key` id:versión. «Publicar» (`?panel=publicar-tabla`,
  `tabla_referencia_publicar()`): el PT409 y el 22023 con `hint` llegan tal cual (`porCampo` con el camino de la celda).
- **El PDF** (área `tarjeta`): `GET /cotizaciones/[id]/pdf` (`requerirSesion()`; 404 en texto igual al de la página para lo que no existe, está en la
  papelera o no se ve; `rutaDelPdf(id)`) arma la página (fecha del último guardado en la zona de `leerAjustes()`, que falla en vez de dar lo de fábrica) y
  pide `pdfDeUnaGuardada()` con el contexto de `contextoDeLaPagina()` (el cliente sólo con `leads.ver`: `src/app/(app)/cotizaciones/datos-de-la-tarjeta.ts`, que
  comparte con la página): `cotizacion_tarjeta` como quien pide, sin memoria, y `infra/tarjeta/pdf/` (Geist TTF recta e itálica). Lo baja quien ve la cotización, sin
  clave propia (pie de «Vista previa» y «⋯» de la cabecera de una guardada, `<PdfDelMenu>`; `<a download>` en la tarjeta de lo guardado de la hoja nueva). Las pruebas leen su texto con
  `scripts/pdf/texto-del-pdf.ts`.
- **«Compartir la cotización»** (área `tarjeta`; glosario, `docs/UX.md` › «Cotización: compartir»): el panel `PanelDeCompartir` (`features/tarjeta/components/compartir/`, por
  `diferido()`), en `?panel=compartir` en el detalle (`CompartirDeLaGuardada`, a la vista en la cabecera por el hueco `compartir` de la vista previa, sólo con
  `cotizacionId`) y en `?panel=compartir&para=<id>` fuera de él (`DialogoDeCompartirDeLaFila` y `useAbrirCompartirDeLaFila()` por `pantallas/tarjeta-compartir.ts`:
  el «⋯» del listado; también para las tarjetas, el resumen y la ficha del vehículo); la pestaña en `?compartir=texto` (`entities/tarjeta/compartir/url.ts`). Con
  el Modo Live ni el botón ni la línea del «⋯»; por URL, el aviso. Lee `GET /cotizaciones/[id]/compartir` (`DatosParaCompartir`: `paraCompartirDeUnaGuardada()`
  da los montos de la tarjeta de lo guardado con `lineasDeLaTarjeta()`; `src/app` suma el vehículo con `zonaDelPatioDe()` de `vehiculos` y la subasta) y, al
  elegir «Fotos», `…/compartir/fotos` (`leerVehiculoDeLaCotizacion()` por `cotizaciones_pkey` y `leerGaleria()`); la portada, por su ruta con la caché del
  navegador, pasada a PNG en el navegador. El texto lo arma `textoParaCompartir()` (puro); los motivos de los botones, `motivosDeCompartir()`. Desde el navegador,
  por `areas/tarjeta/composicion-compartir.client.ts` (la importa sólo el panel). Lo genérico del navegador, `src/shared/lib/compartir.ts`.
- **La portada de la cotización** (área `tarjeta`; `docs/COTIZADOR.md` › «La portada de la cotización»): `GET /cotizaciones/[id]/portada` (`rutaDeLaPortada(id)`,
  el mismo 404 que el PDF) lee `leerLaPortada()` (`cotizacion_portada`) y `queHacerConLaPortada()` decide: 304 con la ETag de hoy, bajar la guardada al día
  (`bajarLaPortada()`) o armarla (`armarLaPortada(id, contextoDe)`, en `features/tarjeta/` porque cruza con `empresa`: la hoja de lo guardado, los ajustes y el
  WebP de `imagenDeLaPortada()`, `sharp` con `import()`). La compartida (quien ve todo lo que dibuja, sin «Ver como») usa el contexto de la base y se guarda
  **antes de responder** (`guardarLaPortada()`: subir por hash y `cotizacion_portada_poner`; un PT409 no se guarda); la de quien no ve todo, el de
  `datos-de-la-tarjeta.ts` (como el PDF), sin ETag ni guardar. Al guardar, el núcleo avisa por el hueco de la vista previa y `<ProveedorDeLaTarjeta>` pide la ruta
  (`pedirLaPortada()`, `areas/tarjeta/composicion-portada.client.ts`: un `fetch` que no se espera). El componente `<PortadaDeLaCotizacion>` sale por
  `pantallas/tarjeta-portada.ts` (marco de la proporción que le den, recuadro con el total, visor por `diferido()`, Modo Live por CSS en `globals.css`).
- **El diseño** (`/configuracion/cotizacion?seccion=diseno&origen=`, `cotizaciones.configurar`): lee el borrador o la publicada y los niveles de
  `cotizaciones_niveles` (no de `niveles_con_uso()`); edita secciones, celdas (ver y editar juntos con `ponerNiveles()`; `admiteNivel` apaga lo que la base
  rechazaría con `nivel_no_admitido`), atajos, interruptor, ayuda, modos, la tarjeta del total (variante y subtotal no se editan) y **el aspecto** de cada
  pieza (`components/aspecto/`, operaciones puras en `entities/diseno/edicion-del-aspecto.ts`: el valor por defecto quita la clave), con el aviso «se deduce
  restando» (sin bloquear). **Ordena** secciones e ítems (estos dentro de su sección: `entities/diseno/orden-del-diseno.ts`) con dnd-kit y su sensor de
  teclado (`components/orden/`, `hooks/use-fila-ordenable.ts`: los callbacks del asa van desestructurados, el compilador de React toma un `x.ref` por un ref);
  dnd-kit sólo viaja en el `diferido()` de la pestaña. El color sale del catálogo de colores (`catalogo` nulo si no se leyó: no se elige y `contextoDelEditor()`
  cuenta los colores que el diseño ya nombra); un rechazo de forma del aspecto va bajo su select (`campoDelRechazo()`). «Guardar el borrador» (`formula_guardar_borrador`, con la esperada de la publicada o la hora del borrador) manda `definicion` y
  `params` sin cambios. El área `diseno` replica la lectura y escritura de `formula` porque un área no importa otra.
- **Los colores** (la pestaña «Colores»: `/configuracion/cotizacion?seccion=tonos`, `cotizaciones.configurar`; `?panel=nuevo-tono|editar-tono|eliminar-tono&tono=<id>`,
  URL con el nombre técnico): son de la empresa, un nombre y un #hex, y se guardan al instante (`tono_crear(p_id, p_nombre, p_hex)`, `tono_guardar` con
  `{nombre?, hex?}` y `tono_eliminar` devuelven la lista entera). `entities/diseno/tonos.ts` espeja `_tono_nombre()` y `_tono_hex()` (los mismos textos);
  `entities/colores.ts` (núcleo: lo usan diseño, plantilla y tarjeta) espeja `_color_derivar()` (la hoja derivada con AA) y `_color_tinta_de_la_tarjeta()`,
  con el juego `supabase/tests/casos-de-colores.json`. El modal muestra en vivo la hoja y la tarjeta (`como-se-ve-el-color.tsx`) y avisa sin bloquear si el
  texto de la tarjeta no se lee. Un color en uso: 23503 con la fórmula que lo usa. Componentes y hooks se llaman «color»; tabla, RPC, actions, schemas e
  infra conservan «tono».
- **La vista previa del diseño** (`?vista=412|1280|200`): `hojaDeLaVistaPrevia()` espeja `_cotizacion_hoja()` (con el aspecto y los colores de las secciones
  que dibuja y de la cabecera) **sin niveles, tablas ni `dato_del_vehiculo`**; usa la misma rejilla que la hoja (`CONTENEDOR_DE_SECCIONES`,
  `REJILLA_DE_SECCIONES`, `enLaRejilla`); `cifrasDelDiseno()` evalúa con datos en 0 y nunca lanza. Dibuja con las piezas del núcleo y **no con `LugaresDeLaHoja`** (lee
  `?ayuda=` y `?panel=`, que chocarían con la pestaña); un hijo de ancho propio en px dentro de una caja con scroll (los cortes `@4xl/hoja` y `@5xl` miran al
  hijo); «200 %» es 206 px con `zoom: 2`. Va `inert`, en un `diferido()` aparte.
- Depende de `leads`, `vehiculos`, `empresa` (tipos de cambio; los ajustes, en `armarLaPortada()`) y `equipo` (`<VistasGuardadas>`); los orígenes entran por props desde `src/app`.

## Áreas

El módulo se parte por **área**: `listado`, `tarjeta`, `plantilla`, `formula`, `diseno`, `tablas`, `papelera`, `final`, `comprobantes`, `comentarios`.
Lo demás es el **núcleo** (la hoja, guardar, encima, revisiones, historial, niveles, el motor, el compilador, los validadores, el diseño, la apertura, la
ruta): lo que comparten. La lista y las carpetas del núcleo están en `scripts/guardas/areas-de-cotizaciones.ts`.

- **Dónde va:** `features/<área>/`, `entities/<área>/`, `infra/<área>/` y sus entradas `areas/<área>/{index,client,composicion}.ts` (la composición empieza
  con `import 'server-only'`). Su pantalla es `pantallas/<área>.ts`; otra, `pantallas/<área>-<pantalla>.ts` (una pantalla paga lo que reexporta su archivo).
  Una carpeta nueva se suma a un área o al núcleo en la guarda.
- **Las entradas de la raíz** (`index.ts`, `client.ts`, `composicion.ts`) sólo llevan `export * from './areas/<x>/<mismo nombre>'` por el núcleo y cada
  área; un nombre repetido entre dos áreas es un error de `tsc`. T13 de `scripts/mapa.test.ts` pide al menos 87 nombres en la API del mapa.
- **La dirección:** un área importa lo suyo y el núcleo, **nunca otra área**; el núcleo no importa ningún área; adentro nadie importa las entradas de la
  raíz (los casos de uso del núcleo importan `areas/nucleo/composicion.ts`). Cuentan `import type`, `import()` y los tests. Lo que dos áreas necesitan va
  al núcleo. Lo vigila `scripts/guardas/areas-de-cotizaciones.test.ts` (también que cada área tenga sus lugares).
- **La composición del navegador** del núcleo (`composicion.client.ts`, `-historial.client.ts`, `-revisiones.client.ts`) queda en la raíz (la nombran los
  `vi.mock`). La de un área va en `areas/<área>/composicion.client.ts`, la importa sólo su feature y ningún barril la reexporta: lo que suma un
  `areas/<área>/client.ts` lo paga toda pantalla que importa `@/modules/cotizaciones/client`.

## Los huecos

Lo que un área llena en una pantalla del núcleo es un **hueco** (tipos sin código en `features/hoja/components/huecos.ts`); la página de `src/app` los une
por `pantallas/<área>-<pantalla>.ts`. Un hueco vacío es un objeto sin componentes: no se dibuja nada.

- **La hoja** (`HuecosDeLaHoja`, `pantallas/formula-hoja.ts`): `EnlaceSinPublicar` (el enlace de «Falta publicar la fórmula») y `Proveedor`, que enciende
  el ⚙ por `ContextoDelAjuste` (`{ Ajuste, AjusteDeLaCabecera }`: el de cada celda y el de la cabecera): sin él ninguna celda lo dibuja ni se llama ningún hook del
  ajuste. Los campos «Por defecto» de la cabecera son del núcleo (`features/hoja/components/por-defecto/`): los usan el ⚙ de la cabecera y el editor del diseño. La base dice qué celda lo lleva (`ajustes`);
  `<LugarDelAjuste>` se monta con las secciones principales y también **dentro del modal «Avanzado»**, como la ayuda.
- **La guardada** (`HuecosDeLaGuardada`): `Acciones` (las líneas que el área suma al «⋯» de la cabecera con `useAporteAlMenu()` y sus diálogos, nada a la vista;
  el orden lo da `accionesDeCotizacion()`), `Insignias` (cabecera, tras la clase y la vigencia), `BajoLaCabecera`
  (entre la cabecera y la hoja: la línea de «De este vehículo») y `Debajo` (bajo la hoja, fuera del proveedor del ⚙). Los llenan
  `pantallas/{final,aprobada,comprobantes,comentarios,papelera}-cotizacion.ts` (cada uno con un vacío en `features/<área>/components/huecos-en-la-guardada.ts`)
  y `src/app/(app)/cotizaciones/[id]/huecos-de-la-guardada.tsx` los dibuja en el orden de las insignias y de lo de debajo («Aprobada» antes de «Reportada»;
  «De este vehículo» antes de «Comprobantes»). Cada componente recibe `{ cotizacion, puedeGuardar, permisos, vehiculo }` (`vehiculo`, el que la página leyó
  si quien mira lo ve, o nulo). Fichas: `areas/<área>/CLAUDE.md`.
- **El resumen del listado** (`HuecosDelResumen`): `Portada` (primero, arriba de los datos: `pantallas/tarjeta-resumen.ts`), `Pestanas`, `Comprobantes` y
  `DeEsteVehiculo` (entre «Abrir cotización» y las pestañas, sólo con un vehículo que quien mira ve; `aprobarEn` lo manda la página y `alCambiar` refresca el
  listado; `pantallas/aprobada-resumen.ts`). Cerrar el resumen borra también `?visor=&foto=` (el visor de la portada).
- **La ficha del vehículo** (`/vehiculos/[id]`, columna izquierda, la compone `src/app`): «Cotización aprobada» con `leerAprobadaDelVehiculo()` (`index.ts`),
  la tarjeta de `pantallas/aprobada-del-vehiculo.ts` (`AprobadaDelVehiculo`, `EsqueletoDeLaAprobada`) y, como un área no importa otra, la portada diferida y
  `BotonDeCompartirDeLaFila` de `pantallas/tarjeta-aprobada-del-vehiculo.ts` en sus ranuras; el diálogo, `DialogoDeCompartirDeLaFila` de `pantallas/tarjeta-compartir.ts`.
- **El listado** (`HuecosDelListado`): `Junto`, en el grupo «Más» de «Vista y opciones» (el vacío ofrece sólo «Nueva»), y `hayJunto(permisos)`: la página pasa
  `Junto` sólo si quien mira lo vería (si no, «Más» quedaría vacío); lo llena `pantallas/papelera-listado.ts`.
- **La vista previa de la tarjeta:** `ContextoDeLaVistaPrevia` (`features/hoja/components/hueco-de-la-vista-previa.tsx`) lleva `dibujar(props)`,
  `compartir()` (lo que la cabecera de una guardada dibuja a la vista: «Compartir») y `alGuardarLaCotizacion(id)` (lo llaman `useNucleoDelGuardado` y `useCotizarEncima` con la cotización guardada: la portada); la llena
  `<ProveedorDeLaTarjeta>` (`pantallas/tarjeta.ts`) con la cáscara del modal y lo que sabe la página (vehículo, asesor, número, logo). El modal lee
  `cotizacion_tarjeta(p_formula)` al abrirse (5 min por versión) y dibuja `geometriaDeLaTarjeta()` (pura) con `<TarjetaDeCotizacion>`: un lienzo del ancho de
  la tarjeta con cada celda en posición absoluta (`<CeldaDeLaTarjeta>`, en orden de lectura, con `data-celda`, `data-fila`, `data-columna`, `data-nodo`,
  `data-mostrar`, `data-variable`, `data-color` y `data-total-usd`), escalado como una imagen (`useEscalaDeLaTarjeta()`, nunca agranda); la página manda título,
  cliente, vehículo con lote y VIN, asesor, número, vencimiento y logo (`PaginaDeLaTarjeta`). «Vencida» va en los avisos del modal, no en la tarjeta. El pie:
  Live y «Copiar texto» (`textoDeLaTarjeta()`, de la misma geometría, apagado sin tarjeta, con «Total desactualizado.» o sin total) y, en una guardada,
  «Descargar PDF» (`pedirElPdf()`: `fetch` sin seguir la redirección ni caché; un 404, la sesión que no vale u otro fallo se dicen en el pie con «Reintentar»).
  **Los retoques** (`docs/COTIZADOR.md` › «Retoques de la tarjeta»): la página de una guardada pasa `DatosDeLaPagina.retoque` (`{ retoques, actualizadoEn,
puedeRetocar }`, de `HojaDeUnaGuardada`; la hoja nueva no lo pasa) y el modelo los aplica (`lecturaRetocada()`). «Retocar» va en el pie con
  `puedeRetocar` (apagado con su motivo: la tarjeta por omisión o la hoja con cambios) y pasa el mismo modal al modo «Retocar la tarjeta»: el estado
  (`useEstadoDelModo()`, `useModoRetocar()`) vive en la vista previa y su interfaz llega en un chunk propio (`components/retoques/diferidos.tsx`: tarjeta
  retocable con un botón por celda y el canal de filas, el campo, la fila elegida, el pie y la pregunta de «Volver a la plantilla»). «Listo» llama a la
  action `retocarLaTarjeta` (revalida la página: la hoja se vuelve a montar con la versión nueva) y pide la portada. El modal es `propio` en
  `scripts/guardas/modales-con-salida.ts` (pregunta al salir con cambios).

## Archivos clave

- Motor y grafo (`docs/COTIZADOR.md`: léelo antes de tocar el motor): `entities/nodos.ts` (Zod por `tipo`, `referenciasDe()`), `formula.ts`, `motor.ts` y
  `motor-*.ts` (`evaluar()`, una pasada), `redondeo.ts` (`round(numeric)` de Postgres), `compilador*.ts` (texto a nodos, puro, nunca lanza),
  `casos-del-motor.json`.
- Validación: `entities/validar*.ts` espeja `validar_formula()` (`docs/COTIZADOR.md` › «Las reglas») y `validar-diseno*.ts` a `validar_diseno()` (con el
  tope de 40 ítems, `demasiados_items`, primero tras la forma); juegos `casos-de-{formula,diseno}.json` (regla nueva = su caso).
- La plantilla: `validar_plantilla()` (`docs/COTIZADOR.md` › «Plantilla de tarjeta (PDF)»), espejo `entities/plantilla/validar-plantilla.ts` (code points,
  `btrim`, orden C, tope en bytes del texto jsonb, sin prototipo) con su juego `casos-de-plantilla.json`; dos formas: la de grupos (`forma-de-plantilla.ts`,
  `nodos-de-plantilla.ts`) y la cuadrícula (`forma-de-cuadricula.ts`, `celdas-de-cuadricula.ts`, `reglas-de-la-grilla.ts`, `nodos-de-cuadricula.ts`; tipos y
  topes en el núcleo, `entities/cuadricula-de-la-tarjeta.ts`). La conversión de la forma 1 (`convertir-plantilla.ts`, `armado-de-la-conversion.ts`,
  `grupos-de-la-conversion.ts`, `ids-de-la-conversion.ts`, `altos-de-la-conversion.ts`), espejo `_plantilla_convertir()`, con su juego `casos-de-conversion.json`
  (lo genera `casos-de-conversion.test.ts` con `ACTUALIZAR_CASOS=1`; Prettier no lo toca). **Lo que va a un `jsonb` o `text` pasa por
  `revisarTextoParaLaBase()`** (un `\u0000`, un surrogate suelto o más de 8 niveles no los lee la base). Los dos ayudantes de un validador espejo están en el
  núcleo (los usan `plantilla` y `tarjeta`): `entities/json-de-la-base.ts` (`jsonb_typeof`, bytes del texto jsonb, code points, `btrim`, orden C) y
  `entities/texto-de-la-base.ts` (`revisarTextoParaLaBase(valor, { raiz })`).
- Los retoques de la tarjeta: `validar_retoques()` y su espejo `entities/tarjeta/retoques/validar-retoques.ts` con el juego `casos-de-retoques.json`
  (lo corren Vitest y `supabase/tests/areas/tarjeta/retoques.sql`); `aplicar-retoques.ts` (la cuadrícula retocada, las combinaciones reparadas y los que no
  aplican), `para-guardar.ts` (lo que se manda: sólo lo que aplica y cambió), `borrador-de-retoques.ts` (el reductor del modo), `modo-de-la-tarjeta.ts`
  (las filas con su banda, dónde va el campo, los motivos) y `fallo-del-modo.ts`; `infra/tarjeta/rpc-de-los-retoques.ts`.
- Base: `evaluar_formula()` (espejo exacto de `motor.ts`), `cotizacion_evaluar()`, `cotizacion_hoja()`, `cotizacion_crear()`, `cotizacion_guardar()`,
  `_nodos_visibles()`, `_publicar_formula()` / `_preparar_publicacion()`; semillas `supabase/semillas/cotizador-*.sql`. Detalle: `docs/COTIZADOR.md` ›
  «El diseño de la hoja», «Niveles de acceso», «Quién escribe una cotización y cómo», «Cómo se guarda», «La lectura que abre la hoja», «La hoja abierta».
- Hoja en el cliente: `entities/{hoja,recalculo,entradas,binding,guardado,claves-de-la-hoja,borrador-de-hoja,…}.ts`, `infra/queries/`. **La rejilla y el
  aspecto:** `entities/rejilla-de-la-hoja.ts` (la regla de los 16 rem, `corteDe()`), `entities/aspecto-de-la-hoja.ts` (copia sólo las claves que vinieron) y
  `features/hoja/components/clases-de-la-rejilla.ts` (tablas de clases escritas enteras; sin aspecto, la clase de siempre). `<SeccionDeHoja enLaRejilla>` pone
  sus columnas sólo en la rejilla de las secciones (en el modal «Avanzado», un `grid` sin pistas, no); el color de una sección va en `data-tono`. `features/hoja/`
  marca para los e2e `data-nodo`, `data-atajos`, `data-seccion`, `data-avanzado`, `data-cabecera`, `data-secciones`, `data-modo`, `data-total-bs`,
  `data-pie-de-panel`.
- El resumen al pie se pliega (`useResumenPlegado`): «Ver el detalle» / «Ocultar el detalle» esconde el total en moneda local, los secundarios y el modo;
  el total, sus avisos, lo guardado, la región viva y el pie quedan. Nace plegado con la fuente raíz ≥ 24 px; al costado (`@4xl/hoja`) no hay botón. El
  modo de tipo de cambio es parte de `Entradas`; «Ver total Bs» no (no cambia el cálculo), pero vuelve con el borrador.

## Tablas

`formulas`, `tonos`, `cotizaciones_niveles`, `tablas_referencia`, `tablas_referencia_filas`, `plantillas_tarjeta`, `cotizaciones`, `cotizaciones_revisiones`,
`cotizaciones_comentarios`, `cotizaciones_adjuntos`, `cotizaciones_reportes`, `cotizaciones_favoritos`, `cotizaciones_aprobadas`, `cotizaciones_portadas`, `comprobantes`,
`comprobantes_contadores`, `comprobantes_ajustes`. `cotizaciones.tarjeta_retoques` (jsonb nulo, con `grant select` de columna: viaja en `cotizacion` por
`_cotizacion_respuesta()`) guarda los retoques de la tarjeta de cada cotización.

RPC: `formula_guardar_borrador`, `formula_publicar`, `formula_descartar_borrador`, `formula_cambiar_constante`, `formula_cambiar_cabecera` (el ⚙ de la
cabecera: modo por defecto, «Ver total» por defecto y modos visibles) y `formula_revertir` (publican la N+1 desde la publicada sin pisar el borrador), `tabla_referencia_publicar` (reemplaza las filas, sube la versión y publica la N+1 de cada fórmula que la usa),
`tono_crear|guardar|eliminar` (los colores), `nivel_crear|renombrar|retirar|restaurar|eliminar`, `niveles_con_uso`, `validar_formula`, `validar_diseno`,
`validar_plantilla`, `evaluar_formula`, `cotizacion_evaluar`, `cotizacion_hoja`, `cotizacion_tabla`, `cotizacion_tarjeta`, `cotizacion_crear`,
`cotizacion_guardar` (`p_titulo_manual` al final), `cotizacion_retocar_tarjeta` (los retoques de la tarjeta, con la versión; valida con `validar_retoques`
contra la plantilla publicada de hoy), `cotizaciones_listado`, `cotizaciones_buscar` (la búsqueda del listado, invocadora; el título por
`_cotizaciones_ids_por_titulo`), `plantilla_guardar_borrador|publicar|descartar_borrador` (versión esperada y candado por origen; esperada
nula al guardar = crear), `cotizacion_marcar_final`, `cotizacion_aprobar` (con la versión de la que se aprueba), `cotizaciones_de_este_vehiculo` (el bloque «De este vehículo», invocadora), `cotizaciones_aprobadas_de_vehiculos` (el «Costo estimado» de `/vehiculos`, invocadora), `cotizacion_moderar` (con la versión),
`cotizacion_comentarios|comentario_respuestas|comentar|comentario_editar|comentario_borrar`, `cotizacion_adjuntar|adjunto_quitar`,
`cotizacion_reportar|reporte_retirar`, `cotizacion_favorito_poner`, `cotizacion_portada|portada_poner|portada_visible` (la portada de la cotización: el estado para
quien pide, anotar la subida y, para la policy del bucket, si se puede bajar), `comprobante_emitir|anular`, `comprobantes_serie_cambiar`, `margen_vehiculo`.

## No se rompe

- Una cotización se recalcula **siempre** con su `formula_id`, nunca con la vigente. El snapshot (`valores`, `fuentes`, `tipos_cambio`, `totales`) es la
  autoridad.
- Versionado append-only: un borrador y una publicada por origen; revertir = publicar una copia. El ⚙ de una constante publica N+1; el de un tipo de
  cambio lo cambia para la empresa (`tipo_cambio_guardar`).
- **El listado** (`cotizaciones_listado()`) corre como quien mira y cada ruta va por su índice: la clase nunca es columna de un índice (`enum_eq` no es
  leakproof; la final va por parciales con `'final'` literal) y `lead_id` y `origen_id` tienen un solo índice entero al frente
  (`cotizaciones_lead_creado_idx`, `cotizaciones_origen_creado_idx`; L8 de `cotizaciones-listado.sql`). Con `p_lead` es una sola ruta por
  `cotizaciones_lead_creado_idx`, sin la cartera, y el vehículo es un filtro sobre esas filas (L9). Lo que devuelve es la regla (L2 de
  `cotizaciones-visibilidad.sql`). **La búsqueda** (`cotizaciones_buscar()`, `supabase/tests/areas/cotizaciones/buscar.sql`, `medir-cotizaciones-buscar.sql`) es
  invocadora: nombra hasta `v_tope` (50) ids por fuente —clientes por `leads_candidatos()` y `leads_vista_por_ids()`, vehículos por origen, autores por
  `perfiles`, títulos por `_cotizaciones_ids_por_titulo()` (definer, `cotizaciones_titulo_trgm`, sólo lo que quien busca ve)— y de cada uno lee una página por `cotizaciones_lead_creado_idx`, `cotizaciones_vehiculo_creado_idx` o `cotizaciones_creador_idx` (el número, por
  `cotizaciones_numero_key`; el título, por la PK); lo que quien busca no ve no se nombra. La cotización de otra persona sólo se busca por autor donde se ve «todos».
- Crear con un vehículo, o guardar una que pasa a otro, mueve `vehiculos.cotizado_en` (trigger `trg_vehiculo_cotizado`, «sólo si es mayor»): cotizar toma
  la fila del vehículo `for no key update` hasta confirmar. Historial y «Cotizado (n)» van por `cotizaciones_vehiculo_creado_idx`
  (`vehiculo_id, creado_en desc, id desc`).
- A lo sumo una final activa por vehículo. `cotizacion_marcar_final` toma lead → vehículo → la cotización y las vivas del vehículo (detalle:
  `areas/final/CLAUDE.md`). Al entrar a logística la final se congela; si sale, vuelve a preventa.
- Sin motor de expresiones al cotizar: sólo las operaciones cerradas de `calculo`. La fórmula como texto se compila a nodos **al configurar**; lo que no
  compila se rechaza. Un nodo nuevo = tipo discriminado (`nodos.ts`) + caso en `referenciasDe()` + caso en `validar_formula()` y en el juego.
- **Toda copia de una versión lleva el diseño** (el ⚙, revertir y la N+1 de una tabla; publicar lo exige). Un color o nivel que una versión nombra no se
  elimina (`_tono_en_uso()`, `_nivel_uso()`; un nivel se retira). Colores y niveles salen de un solo punto (tabla `tonos`, `_niveles_de_cotizacion()`): nada
  escribe «costos» a mano ni razona por el nombre o la clave de un nivel. `formulas` y `plantillas_tarjeta` sólo las lee quien tiene
  `cotizaciones.configurar` del origen (los demás leen la plantilla por `cotizacion_tarjeta`).
- **La hoja calcula en la base** (`cotizacion_evaluar()` sobre `evaluar_formula()`) para todos; la fórmula (`definicion`, `params`, texto) viaja sólo a
  `cotizaciones.configurar` (`motor.ts` queda para el editor y la paridad), salvo el `dato_del_vehiculo` de una celda de tabla que se ve (qué columna casa
  con qué campo, sin las entradas del `match` que nombran un nodo; `_hoja_datos_del_vehiculo()`); lo que un nivel esconde no viaja por ninguna lectura
  (`docs/COTIZADOR.md` › «Niveles de acceso»).
- **Nadie escribe `cotizaciones` ni `cotizaciones_revisiones` directo** (sin grants ni policies de escritura): una escritura nueva es una RPC
  `security definer`, nunca un grant (`cotizacion_crear`, `cotizacion_guardar`, `cotizacion_encima`, `cotizacion_retocar_tarjeta`…). `authenticated` no lee `valores|fuentes|totales|tipos_cambio` ni el `diff`; lo oculto sale por
  `cotizacion_leer|evaluar|revisiones|tabla`, recortado con `_cotizacion_recorte()` y `_nodos_visibles(formula_id)` de SU versión.
- **Inventario de lo oculto:** una función nueva que pueda devolver esas columnas, `formulas.*` o las tablas de referencia, o un guardado/lectura nuevos del
  diseño, se registra en el inventario de `supabase/tests/cotizaciones-visibilidad.sql` y entra a la matriz por nivel de `cotizacion-hoja.sql`.
- `cotizacion_guardar` es la única edición: calcula con SU fórmula y SUS tipos de cambio y conserva lo que quien guarda no ve ni edita; mismo `intento` con
  otros datos = `intento_reusado`; quién guarda lo decide sólo `_cotizacion_puede_guardar()` (ver y editar; una final, ver y
  `cotizaciones.final.gestionar`), antes y después del candado. La revisión guarda `totales` por clave (grupos enteros) y su lectura no delata un grupo.
- **La hoja abierta la firma la base** (`abierta` = fórmula.µs.huella.HMAC con la clave de Vault `cotizacion:abierta`; la huella, de las tarifas que vio): `cotizacion_crear`, `cotizacion_evaluar` y
  `cotizacion_tabla` la reciben como `p_abierta`, nunca una hora del cliente (4-27); el recálculo y la tabla de una ayuda usan la versión (y el recálculo,
  las tarifas) de la hoja dibujada (4-28). La pantalla la trata como opaca. Un cálculo o alta nuevo recibe `p_abierta`; una prueba SQL la firma por persona.
- En el cliente: entradas inmutables; lo que se busca por id usa `Map`; los textos del candado, estado y faltante son **propios, nunca el mensaje de la
  base**, salvo: el PT409 de `cotizacion_guardar` (`version_cambiada`: una persona y cuándo), los de `formula_publicar()`, `formula_cambiar_constante()`,
  `formula_revertir()` y `tabla_referencia_publicar()` (una persona, una versión y cuándo), los de `plantilla_*` (cuándo, sin nombre) y los de
  `comprobante_emitir|anular` y `comprobantes_serie_cambiar` (escritos para la persona). El porcentaje de un par va a `inputs` u `overrides` según
  `secundario.tipoDeNodo` (4-31); todo error con SQLSTATE suelta el pendiente; la `key` de la hoja lleva la abierta.
- La hoja calcula **por su origen o por su cotización, nunca por las dos** (`DeDondeCalcula`: la base rechaza `p_abierta` con `p_cotizacion`); una
  guardada no manda `p_origen` ni `p_abierta`; `p_vehiculo`, sólo el elegido en una preventa para cambiarlo (T315). `actualizadoEn` (y toda versión esperada) es el texto de la base con sus microsegundos:
  **nunca pasa por `Date`**.
- «Recargar» en una guardada remonta la hoja (la `key` suma una lectura pedida): sin remonte `useRecalculo` ignora el primer cálculo nuevo y lo rechazado
  se reenvía. `difiereAlAbrir` compara `valores` y `totales.usd` de lo guardado con el primer recálculo.
- **La hoja de una guardada** (`cotizacion_hoja_guardada`) edita sólo con `_cotizacion_puede_guardar()` (no con `_nodos_visibles()`, que da editar con
  `crear`). **Cotizar encima** (`cotizacion_encima`) crea la N+1 en el acto, una viva por anterior (`cotizaciones_encima_unica`), y se lleva lo oculto (se
  guarda, no se devuelve); es la excepción a «un alta nueva recibe `p_abierta`».
- **La tarjeta** (`cotizacion_tarjeta(p_formula)`) dibuja la plantilla publicada del origen como cuadrícula (la de la forma 1, convertida) **validada otra vez
  contra la versión de esa cotización**: si no le sirve, `sin_plantilla` sin motivo. Sólo sale lo que la cuadrícula nombra y del nivel «todos» (nodos, grupos,
  tipos de cambio por su nombre y su nodo, variante, colores); ningún id ni texto de un nodo de un nivel, para nadie (K4 de `cotizacion-tarjeta.sql`, en las dos
  formas). La geometría toma valores, estados y totales por id de nodo (`CalculoDeLaTarjeta`), nunca de la hoja de quien mira. En una guardada dibuja **lo guardado** (`calculoDeLoGuardado()`: el
  snapshot, con los estados del primer recálculo) y lo que difiere se dice fuera.
- **El editor de la plantilla** (`/configuracion/cotizacion?seccion=tarjeta`): al navegador llega sólo el contexto reducido y nada se importa del área
  `formula`. Los modales de publicar y descartar (`?panel=publicar-tarjeta|descartar-plantilla`) **viven fuera de la `key` del editor**
  (`origen:esperada`) para que «Recargar» tras un PT409 no pierda la nota. Su vista previa es un hueco: el tipo sin código
  `entities/vista-previa-de-la-plantilla.ts` (la cuadrícula convertida con lo que nombra, `LecturaEnCuadricula`, plana y sin `Map`), que `plantilla` arma
  (`lecturaParaLaVistaPrevia()`: 4 miembros por grupo, cifras y textos de ejemplo) y `tarjeta` dibuja con «Ocultas con esta referencia (N)»
  (`pantallas/tarjeta-plantilla.ts`). Una cuadrícula guardada no se edita aquí (`MOTIVO_DE_LA_CUADRICULA`).
- **El PDF** dibuja la misma geometría que la tarjeta de esa guardada, en una página A4 escalada entera (`escalaDelPdf()`): lo guardado y sólo lo que la lectura nombra.
  El título de la cotización es la variable `titulo` (`PaginaDeLaTarjeta.titulo`, `tituloAparteDelNumero()`; nunca de `cotizacion_tarjeta`): en la hoja nueva, el que se
  está escribiendo (`useTituloDeLaCotizacion()`). Los montos van con `formatearMonto()` y siempre con
  cifras aunque Live esté encendido: es lo que se entrega al cliente (la excepción a `<Monto>`, `docs/DECISIONES.md`). react-pdf se carga sólo al pedir un
  PDF (`import()` en `areas/tarjeta/composicion.ts`) y nunca llega al navegador. El logo lo baja `logo-del-pdf.ts` con tope (`PESO_MAXIMO_LOGO`) y 2 s y
  llega como `Buffer`, nunca URL; un SVG con lo que react-pdf se salta o con `<image>`, y un WebP, dejan el PDF sin logo (`docs/PENDIENTES.md`, 4-98). Los
  metadatos no nombran al cliente, al asesor ni al vehículo. «Copiar texto» sale de la misma geometría. **La imagen** (`imagenDeUnaGuardada()`,
  `infra/tarjeta/imagen/`, `ImageResponse` con `import()`): la misma geometría como PNG al ancho de la tarjeta, la base de la portada (su ruta suma las fuentes
  de `infra/tarjeta/pdf/fuentes/` a `outputFileTracingIncludes`).
- **Las tablas de referencia se escriben sólo con `tabla_referencia_publicar()`** (sin insert, update ni delete para `authenticated`). Candados: la tabla
  (`for update`) y después `formulas:<origen>` en orden de origen, como el ⚙ y revertir. Pruebas: `supabase/tests/areas/tablas/`,
  `scripts/carreras/tablas*.mjs`.
- **Comentarios, adjuntos, reportes y favoritas se escriben sólo por RPC.** Todas piden ver la cotización; adjuntar pide lo que pide guardarla, igual que
  las policies del bucket `cotizaciones` (`cotizacion_puede_adjuntar`, 4-69). Candados: la raíz antes que la respuesta (comentar la toma `for share`,
  borrar `for update`); la cotización antes que sus reportes. Borrar no deja respuestas eliminadas ni raíces eliminadas sin respuestas
  (`cotizaciones_comentarios_respuesta_viva_check`). Pruebas: `supabase/tests/areas/comentarios/`.

- **La portada** (`cotizaciones_portadas`, una fila por cotización; `docs/COTIZADOR.md` › «La portada de la cotización»): **nadie la escribe directo**, sólo
  `cotizacion_portada_poner()` (pide ver, poder guardar y ver todo lo que dibuja la compartida, antes de mirar la ruta y otra vez tras tomar la cotización
  `for no key update`; la clave, la vigente tras el candado, o PT409). Su policy pregunta por fila con `puede_cotizacion`; el objeto de `portada/` del bucket
  lo lee sólo quien ve todo lo que dibuja (`cotizacion_portada_visible()` en la policy «cotizaciones: leer» de storage). La imagen no depende del nivel de quien
  la arma: la tarjeta sólo nombra nodos del nivel «todos» (K4) y los totales viajan para todos. La clave
  (`_cotizacion_portada_clave()`) mira todo lo que el dibujo lee: algo nuevo que la tarjeta dibuje entra ahí, y un cambio en cómo se dibuja sube
  `_portada_version_del_dibujo()` en una migración. Su ruta cuenta en `storage_refcount()` y en la rama `cotizaciones` del barrido; quien la reemplaza o la
  purga, la encola. Pruebas: `supabase/tests/areas/tarjeta/portada.sql`.
- **La aprobada** (`cotizaciones_aprobadas`, una fila por vehículo; `docs/COTIZADOR.md` › «La cotización aprobada»): **nadie la escribe directo**, sólo
  `cotizacion_aprobar()` y `_aprobada_reponer()`, que corre al confirmar (`trg_cotizaciones_aprobadas_al_confirmar`, diferido: en un bloque de prueba que se
  revierte hay que forzarlo con `set constraints … immediate`). Invariante: con alguna cotización activa y el vehículo vivo, exactamente una fila y apunta
  a una activa suya. Candados: vehículo `for key share` → cotización `for share` → el candado de aviso por vehículo (en orden de id); sin FK a `vehiculos`.
  Su policy espeja «cotizaciones: leer» (si una cambia, cambia la otra). Pruebas: `supabase/tests/areas/aprobada/`, `scripts/carreras/cotizaciones-aprobada.mjs`.

## Ojo

- `fuentes[id]` pinta la XCell: `override` → anillo, `sugerido` → punto. No derivarlo comparando números.
- `comprobantes_contadores` es tabla, no sequence: la numeración no puede tener huecos.
- Cambiar una fórmula del seed = cambiar su caso del juego (`semilla.test.ts`) **y su diseño**.
