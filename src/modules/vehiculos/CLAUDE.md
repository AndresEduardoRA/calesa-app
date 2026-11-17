# vehiculos

Inventario de vehículos por origen con atributos dinámicos: listado con filtros en la URL y vistas guardadas, ficha según el layout del origen, alta y edición en un panel, fotos (hasta 24, con portada), el bloque «Relacionados» (vinculado, interesado y cotizado, siempre arriba de cada detalle: en una línea en los resúmenes y en logística, compacto en las fichas) y el vínculo a un lead (con «Desvincular»; y, al pie de Relacionados en la ficha del lead, lo que no repite: «Vínculos anteriores», el panel «Vincular o marcar un vehículo» y la confirmación de desvincular, `GestionDeVehiculosDelLead`), la vitrina (publicar en la web con precio público y vista previa de lo que verá el visitante) la papelera por lotes (enviar con «Deshacer», restaurar y purgar) y, en un origen de subasta con apibara encendida, el alta pegando un enlace de Copart o IAAI, un VIN o un lote (de a uno o varios), con sus fotos, y «Refrescar» la subasta desde la ficha; y la limpieza automática de lo importado de una subasta que nadie compró, con su aviso previo y «Conservar».

## Entra y sale

- Entra: `/vehiculos` (`?origen=`, filtros —entre ellos `?situacion=`—, `?cursor=`, `?vitrina=si|no`, `?vehiculo=<id>` abre el resumen con `?pestana=fotos`; un `?pestana=interesados` viejo abre «Resumen»),
  `/vehiculos/papelera`, `/vehiculos/[id]` (`?seccion=ficha|fotos|cotizaciones`; la última sólo con `cotizaciones.ver` del origen, la dibuja
  `cotizaciones/pantallas/vehiculo` compuesta por `src/app`; sin esa clave abre «Ficha»). Paneles: `?panel=nuevo`, `?editar=<id>`,
  `?panel=vitrina`, `?panel=desvincular` (con `&luego=papelera`, desde el aviso «Quitar el vínculo»: el aviso de desvinculado ofrece la papelera),
  `?panel=purgar&lote=`. Layout, categorías y orígenes (`origenes`), fases (`flujos`) y vistas guardadas
  (`equipo`) los lee la página y los pasa por props.
- Hoja de cotizar (`/cotizaciones/nuevo`, la compone `app/`): `<BarraDelVehiculo>` (`pantallas/cotizar`, con `obligatorio`: sin vehículo elegido, la etiqueta «Obligatorio»; de ahí sale también `PANEL_DEL_VEHICULO`, que la página pasa a la hoja para su «Elegir el vehículo») abre
  `?panel=vehiculo&lista=ultima|cierre&buscar=&cursor=`:
  - Búsqueda por nombre, VIN o lote (`?buscar=`, desde 3 letras o números, `entities/texto-del-panel.ts`) y las listas «Últ. cotización» y, en
    subasta, «Cierre subasta», leídas desde el navegador (`infra/panel-para-cotizar.client.ts`) sin ir al servidor. Elegir escribe en `claveDeLaUrl`.
  - «+» y «Traer» cambian el cuerpo por el alta (`?alta=mano|subasta`, `alta-desde-el-panel.tsx`, mismo formulario y borrador); «Crear y elegir»
    usa `crearVehiculo`. Enter trae un enlace, y un VIN o lote sólo si su búsqueda volvió vacía (cada consulta a apibara gasta cuota); recargar con
    `?alta=subasta` no vuelve a consultar.
  - La barra recibe armados `cotizado` (texto sin `<Badge>`, que arrastra Base UI a la carga en frío) y `historial` (un `ReactNode` de `cotizaciones`).
  - En «Elegido», el dato que casa con una tabla de la hoja se elige entre sus filas (`dato-del-elegido.tsx`, `datosParaElegirDe()`; a lo sumo 50,
    con «Buscar en las opciones»): un toque guarda con `guardarDatoDelVehiculo` (sólo ese atributo, con versión, por `vehiculo_guardar`); quien no
    edita lo ve sin elegir.
  - **Subasta cerrada** (`features/panel-para-cotizar/`): `avisoDeSubastaCerrada()` (de `index.ts`, lee `leerSubasta` sólo si el vehículo es de un origen de
    subasta y no está en su fase) arma `DatosDelAviso`; `<AvisoDeSubastaCerrada>` (`pantallas/cotizar`, con `diferido()`) lo dibuja bajo la barra. La regla es
    `entities/subasta-cerrada.ts` (`subastaCerrada`, sobre la situación de la base). «Refrescar la subasta» pide un toque y usa `useRefrescoDeSubasta().consultar`
    (el mismo de la ficha, que devuelve cómo terminó); «La ganamos» lo arma `src/app` (`vehiculos` no conoce `logistica`). La fila del panel lee `situacion`.
- `index.ts` (sin componentes): `buscarVehiculos`, `leerVehiculo` (null si no existe, está en papelera o no se ve), `condicionesDe`, `editablesDe`,
  `leerPapelera`, `leerSubasta`, `limpiezaDe`… (ver `docs/MAPA.md`), `MAXIMO_DE_PAGINA_DE_VEHICULOS` (100) y:
  - `camposComunes(tipo)` y sus tipos (`CampoComun`, `ClaveComun`, `TipoComun`), para exportar en `datos`.
  - `identidadDeVehiculo(vehiculo, principal, formato)` e `identidadEnUnaLinea()` (logística): con campo principal activo y un valor no vacío ni
    monto, el valor nombra y el título acompaña; si no, el título. Fila, tarjeta y resumen: `useIdentidad(campos)`; ficha, PDF, web y hoja: el título.
  - `leerTitulosDeVehiculos(ids)`: títulos de una página de `/cotizaciones` por pk, con la RLS de quien mira y sin papelera; hasta 100 ids.
- **«Relacionados»** (`features/relacionados/`, `pantallas/relacionados.ts`; glosario): arriba de la ficha del vehículo, su resumen, la unidad de logística (página y drawer de gastos), la ficha del lead y su resumen. Tres grupos:
  Vinculado, Interesado y Cotizado (éste sólo con `cotizaciones.ver`); un grupo sin nada no se dibuja (`gruposALaVista()`) y sus acciones van al «⋯» del bloque o de la línea
  (`entities/acciones-fuera-de-los-grupos.ts`: con todo vacío, una a la vista y el resto en el «⋯»). `presentacion` es obligatoria en cada capa (`PresentacionDeRelacionados`, de `index.ts`):
  `'linea'` (un chip por grupo con su popover diferido) en los resúmenes y en logística; `'compacta'` (los grupos con sus filas, la leyenda como `title` y descripción para el lector,
  las acciones en el «⋯») en las fichas. Lo leen cuatro RPC `security definer` con el predicado de las policies y el alcance resuelto una vez
  (`vehiculo_relacionados()`, `lead_relacionados()`, `*_pagina()` para «Ver todos» por cursor `(fecha, id)`); `set random_page_cost = 1.1` en las cuatro, o el plan genérico ordena todo lo de un vehículo caliente.
  **Lo que quien mira no ve llega contado (`ocultos`) y sin ningún dato** (ni id, ni nombre, ni nota); lo que está en una papelera no cuenta; el cursor es siempre una fila visible. Índices:
  `vehiculos_interesados_{vehiculo,lead}_reciente_idx`, `vehiculos_vinculos_lead_abierto_idx`, `cotizaciones_relacion_{vehiculo,lead,par}_idx` (parciales de la cotización activa: el literal `estado in ('activa','reportada')`).
  `entities/relacionados*.ts` (tipos, Zod de las RPC, `null` si la forma se rompe), `acciones-de-relacionados.ts` (qué acciones ofrece cada fila y cada grupo, de banderas de la base y de `ParaRelacionados`, que arma
  `src/app/(app)/_relacionados/para-relacionados.ts`: `cotizarEn`, claves de la hoja, `rutaDeCotizacion`, `editarLeads`). Dos lecturas: en el servidor (`index.ts`: `leerRelacionadosDelVehiculo|DelLead`, ficha y unidad) y en el navegador
  (resúmenes y «Ver todos»: `infra/relacionados.client.ts`). El selector de leads (`HuecosDeRelacionados.ElegirLead`) lo une `src/app` con el panel de `leads`; un componente no cruza de servidor a cliente
  como prop, por eso `relacionados-del-vehiculo.client.tsx`. `?panel=desvincular`, `?panel=vincular-lead`, `?panel=marcar-interesado` y `?relacionados=<tipo>` viven en la ficha del vehículo; en un resumen o en la unidad
  «Desvincular», los selectores y «Ver todos» llevan a la ficha con eso abierto. «Quitar interés» y «Cotizar» funcionan en el lugar. `vehiculo_interesados()` ya no la llama la app (`docs/PENDIENTES.md`).
- Pantallas por `pantallas/<pantalla>.ts` (`listado`, `ficha`, `papelera`, `vehiculos-del-lead` (`GestionDeVehiculosDelLead`: los anteriores, 3 a la vista y «Ver los N anteriores» hasta 50, `?panel=agregar-vehiculo` y `?panel=desvincular`; `leerVehiculosDelLead` es `cache()`: una lectura de `lead_vehiculos` por pedido), `cotizar`, `relacionados`, `unidad-de-logistica`: `FotosEnElLugar` para la cabecera de la unidad de logística;
  `proyecto-de-repuestos`: `leerLeadVinculado(vehiculoId)` para el lead por defecto de «Nuevo proyecto» de repuestos).
- `leerLeadVinculado(vehiculoId)` (`features/vinculo/hooks/leer-lead-vinculado.ts`): el vínculo vigente por `vehiculo_vinculos` (invocadora, desde el
  navegador) vuelto `LeadVinculado | null` con `leadVinculadoDe()`: nulo si no tiene o quien mira no lo ve, sin distinguirlos. Lee por
  `composicion-vinculo.client.ts` (sólo esa lectura), lo importa sólo una composición diferida y nunca lanza.
- `client.ts`: `<BadgeDeSituacion>` (la situación real; con `fase` delega en `<BadgeDeFase>`. Lo importa `logistica`: nada pesado puede colgar de ahí),
  `Situacion`, `SITUACIONES`, `esquemaDeSituacion`, `etiquetaDeSituacion`, `Vehiculo`; para la importación de `datos`, `validarVehiculo`, `camposComunes`, `camposActivos`,
  `claveDeAtributo` y sus tipos (cada fila se valida con el esquema del alta).
- **Filtro «Situación»** (`entities/filtros.ts`, `FILTRO_SITUACION`, condición `situacion_en`): sus fases y «Sin fase» en todo origen y, en uno de subasta (`conSubasta`), «En subasta», «Sin resolver» y «No ganadas» (`SITUACIONES_PROPIAS`); reemplaza al de «Fase». `condicionesDe()` suelta `CONDICION_POR_DEFECTO` si se pide «No ganadas». `<AtajoSinResolver>` (`features/listado/`) recibe `sinResolver` (`ConteoAcotado | null`, de `sinResolverDe()`: `tope + 1` por `vehiculos_situacion_idx`, «99+») y pone o quita ese filtro.
- **Situación en la ficha** (`features/situacion/`, `pantallas/ficha.ts` › `<AvisoDeSituacion>`): «Sin resolver» con «La ganamos» (el `href` lo
  arma `src/app`: `vehiculos` no conoce `logistica`) y «No la ganamos» (`marcarNoGanada`, con «Deshacer» 10 s); «No ganada» con quién y cuándo
  (`resolucionDeSubasta`, de `index.ts`) y «Deshacer». `puedeResolverLaSubasta(permisos, origen)`: `flujos.mover` o `.cualquiera` y `logistica.ver`. `useNoGanada({ vehiculoId, origenId, alLograrlo })` sale por `client.ts`: `logistica` lo usa en la fila de «Subastas sin resolver» de su bandeja del día (con `router.refresh()` al lograrlo).
- «Cotizar» del resumen: `paraCotizar` (`entities/ruta-para-cotizar.ts`, o `null` si no cotiza: `origenesParaCotizar()`); abre la hoja sin lead.
- **«Cotización aprobada»** (columna de la tabla y línea de la tarjeta): `ListadoDeVehiculos` recibe `aprobadas` (`AprobadasDeLaPagina`, por id de vehículo:
  `{ ruta, monto, moneda }`, o `null` si quien mira no tiene `cotizaciones.ver` en algún origen: la columna no se dibuja) y lo arma `src/app/(app)/vehiculos/aprobadas.ts`
  con `leerAprobadasDeVehiculos()` de `cotizaciones` (este módulo no la importa). `entities/cotizacion-aprobada-de-la-fila.ts`; `celda-de-aprobada.tsx` dibuja
  `<Monto valor moneda>` enlazado (`data-no-abre`), «Sin total» sin monto y «—» sin aprobada. El monto cruza como texto.
- Depende de `origenes`, `flujos`, `equipo`; no importa `cotizaciones` ni `leads`. `leads` no importa `vehiculos`: vínculo, interesados y «Relacionados» viven acá aunque se
  vean en la ficha del lead (los une `src/app`).

## Archivos clave

- `entities/`: `filtros.ts` (`Condicion[]` neutras que `infra/` traduce), `comunes.ts` (único lugar con etiquetas fijas), `esquema.ts`
  (`validarVehiculo()`, igual para formulario y action), `acciones-de-vehiculo.ts` (lista única del «⋯»; «Ver actividad» sólo en la ficha, con
  `actividad.ver` y `rutaDeActividadDe`), `limpieza.ts` (sólo lee y dice), `papelera`, `vinculo`, `vitrina`, `foto`, `apibara`, `subasta*`,
  `resumen`, `panel-para-cotizar.ts`. `infra/`: lecturas en `queries/`, escrituras por RPC, `*.client.ts` para el navegador.
- `features/`: `alta`, `ficha`, `fotos`, `vitrina`, `papelera`, `vinculo`, `listado`, `acciones`, `resumen`, `subasta`, `limpieza`,
  `panel-para-cotizar`. `CLAVE_DE_EDICION` vive en `features/alta/claves.ts`, no en un `'use client'`.
- El panel de alta y edición avisa y cierra cuando el envío terminó (`features/alta/hooks/use-tras-el-envio.ts`, copia de la de `leads`).
- El listado dibuja una sola vista (tabla o tarjetas) elegida en servidor; los e2e buscan filas con `tbody tr, li article`. En escritorio,
  «Tabla | Tarjetas» en «Vista y opciones», con las vistas guardadas y la papelera (`useOpcionesDelListado`; `useVistaDelInventario`: `?vista=` o la preferencia `vehiculos.vista`; cambiar no pide la página). La columna de precio
  sale de `entities/precio-de-la-fila.ts` (`columnaDePrecio`, `precioDeLaFila`): en subasta, la puja con su nombre.
- Pestañas de la ficha: `src/app/(app)/vehiculos/[id]/pestanas.ts`, cada una con su `seccion-<clave>.tsx`.

## Tablas

`vehiculos`, `vehiculos_imagenes`, `vehiculos_imagenes_version`, `vehiculos_interesados`, `vehiculos_vinculos`, `vehiculos_conservados`,
`apibara_consultas` y `limpieza_corridas` (sólo `service_role`), `cola_gc_*` (cola de Storage de todos los buckets), `lotes_papelera` (compartida).
Columnas de la situación: `situacion` (derivada), `subasta_resultado`, `subasta_resuelta_por`, `subasta_resuelta_en`; índice
`vehiculos_situacion_idx (origen_id, situacion, creado_en desc, id desc)` sin las que son su fase. Job `situacion-al-cerrar`
(`vehiculos_situacion_al_cerrar()`, 500 por corrida). Lectura `vehiculos_inventario` (una página por rutas con los filtros del layout en
SQL; la usa `buscarVehiculos()` para «propios», por `fuenteDelInventario()`). Escritura: `vehiculo_crear|guardar|subasta_refrescar|vincular|vitrina|conservar`, `vehiculo_fotos_agregar`,
`vehiculo_foto_mover|portada|eliminar`, `vehiculo_subasta_no_ganada` («No la ganamos» y su «Deshacer»; «La ganamos» es
`vehiculo_subasta_ganada`, que llama `flujos`), `vehiculo_interesado_marcar|quitar`, `vehiculos_papelera_enviar|restaurar|purgar`. `vehiculos`,
`vehiculos_imagenes` y `vehiculos_interesados` son de sólo lectura para la app.

## No se rompe

- **La ficha se escribe sólo por RPC** (`vehiculo_crear`, `vehiculo_guardar`): lista cerrada de claves; `fase_id`, `publicado_web`, `lead_id`,
  `creado_por` se rechazan. `fase_id` lo escribe `cambiar_fase` y, al nacer, `vehiculo_crear` (si el flujo tiene una única inicial sin nota ni
  requisitos; si no, «Sin fase»).
- **La situación real** (`situacion`: `en_subasta | sin_resolver | no_ganada | fase`, `entities/situacion.ts`) la calcula sólo la base
  (`_vehiculo_situacion()` desde `trg_0_situacion`, `trg_fase_situacion` al cambiar `fases.es_subasta` y el job `situacion-al-cerrar` cuando
  vence el cierre): nunca una copia en TypeScript. Se ve con `<BadgeDeSituacion>` (con `fase`, delega en `<BadgeDeFase>`). El inventario
  siempre pide `CONDICION_POR_DEFECTO` (sin las no ganadas). El resultado (`subasta_resultado`, `subasta_resuelta_por|en`) sólo por RPC y
  nunca se infiere de apibara; si la subasta vuelve a estar viva y la unidad sigue en el tramo, el trigger lo limpia. Fuera del tramo
  (`_vehiculo_en_tramo()`) la situación es la fase, también para una no ganada que alguien movió. Cambiar la situación o el resultado sin tocar la
  subasta (`apibara_sync_en`, `estado_subasta`, `subasta_en`, `subasta_fin_en`) no mueve la versión ni se audita.
- **`cotizado_en`** la escribe sólo el trigger `trg_vehiculo_cotizado` de `cotizaciones` (nunca retrocede); si sólo cambia ella, ni
  `trg_actualizado_en` mueve la versión ni `trg_auditar_cambio` escribe en `actividad`. **`cierre_subasta_en`** es generada
  (`coalesce(subasta_fin_en, subasta_en)` si la subasta está viva); entra en `antes`/`despues` de `actividad`. En `vehiculos` no va un trigger
  `before` con un `when` que nombre la fila `new` entera o una columna generada.
- Toda edición manda `actualizado_en`; otra es `PT409` («<quién> cambió este vehículo hace <cuánto>»). Formulario y servidor, **el mismo esquema**.
  En `atributos` nunca un nulo: vaciar quita la clave.
- Los filtros salen del layout (clave de `origenes_campos`, nunca de la URL); texto de la persona por `citar()` o `patronContiene()` antes de un
  `or()`. `buscarVehiculos()` no filtra por permiso (la RLS) y `fuenteDelInventario()` es un camino, no un permiso. Cada filtro tiene dos copias,
  `aplicarCondiciones` y `_vehiculos_inventario_sql` (todo valor por `using`; `situacion_en` pasa la condición entera a `_vehiculos_inventario_condicion`), atadas por `e2e/vehiculos-inventario-postgrest.spec.ts`. Si la base
  rechaza los filtros, esa página se lee por la tabla (`inventario.test.ts` ata `Condicion` con la base).
- **Fotos:** commit diferido (elegir no sube; «Subir N» sube los dos objetos y **una** action registra). Sólo por RPC; las tres de edición mandan la
  versión **de las fotos** (`vehiculos_imagenes_version`). Máx. 24 y una portada (la base). Sin duplicados (hash). Objetos
  `vehiculos/<vehiculo_id>/<sha-256>.<webp|jpg>`; la app no borra objetos: eliminar encola en `cola_gc_storage` y «Deshacer» (10 s) los saca.
- **Vitrina, sólo por** `vehiculo_vitrina` (estado entero, sin defaults, con versión; exige `vehiculos.vitrina` del origen y ver el vehículo).
  Desde la lista: `BotonDeVitrinaDeLaFila` y `PanelDeVitrinaRapida` (`?panel=vitrina-rapida&para=`), con `datosDeLaFila()` (`entities/vitrina-rapida.ts`).
  **Publicado no es «en vitrina»:** la regla vive en `interno.vitrina_vehiculos`; la app no la copia. Vista previa: `vehiculo_vitrina_previa()`.
- **Papelera, sólo por RPC y con resultado parcial** (cada vehículo con su versión, lote hasta 200; restaurar/purgar con la versión del lote).
  Enviar ofrece «Deshacer» 10 s. Lo que no entra lo decide `_vehiculo_bloqueo()` (`{causa, motivo}`; `_vehiculo_motivo_de_bloqueo` es su texto; la
  causa viaja en `hint` y en `rechazados[].causa`, y `entities/avisos-de-vehiculo.ts` la vuelve acciones del aviso; una final activa frena aunque no tenga lead; purgar
  frena con una cotización de otro lote de la papelera que lo nombra). Restaurar vuelve sin publicar. Purgar es irreversible (`<ConfirmarPurga>`). Se lee sólo por `vehiculos_papelera_listar()`. Un lead con
  vehículo vinculado no va a la papelera de leads.
- **Vínculo e interesados, sólo por RPC** (`vehiculo_vincular`; `p_lead` nulo desvincula; bloquea el lead y luego el vehículo; reemplazar exige
  tener también el lead actual). El vínculo otorga permisos (con «propios», quien tiene el lead edita el vehículo). No se lee `leads`: los nombres
  llegan de las RPC. «Relacionados» sólo se dibuja con `leads.ver` (desde un lead, con `vehiculos.ver`).
- «Editar» lo decide la base (`editablesDe()` + `vehiculos_editables`; las RPC, `puede_vehiculo()`). «Ver el lead» de un aviso, también:
  `leadsVisiblesDe()` + `vehiculos_con_lead_visible(p_ids)` (≤ 200 por PK, sólo con candidatos).
- **La limpieza automática es de la base** (`_limpieza_aplica|termino|vence|ancla|fecha`; `limpieza_el` calculada): nunca una copia en TypeScript;
  una ancla nueva = una línea en `_limpieza_ancla()`. Sólo `importado_apibara` en origen de subasta. «Conservar» no mueve la versión.
- **apibara:** la llamada vive en la edge function, que llama el navegador; guarda el bruto en `apibara_consultas` y alta/refresco sólo mandan su id
  (`p_consulta`). Fecha y estado de subasta: `_vehiculo_subasta_desde()`; a mano, «Editar fechas» del bloque de la subasta
  (`entities/fechas-de-subasta.ts`, `vehiculo_guardar` con `subasta_en`/`subasta_fin_en`). `precio` nunca sale de la puja. Refrescar no
  pisa lo editado (`fusionarRefresco()`). Con 429 o clave rechazada no se consulta la línea siguiente.
- Atajo `N`: abre «Nuevo» sólo si se puede. **El alta dice su contexto** (`vehiculo_crear(…, p_contexto)`, `PERMISO_DE_ALTA`): `suelto`
  (`vehiculos.crear`: inventario e importación) o `cotizar` (`vehiculos.crear.desde_cotizar`: el panel de la hoja y `cotizacion_crear` con
  vehículo nuevo); queda en `creado_desde`.

## Ojo

- Bajo RLS los filtros sobre `atributos` no usan el GIN: lo barato es `vehiculos_origen_listado_idx`. Keyset `(creado_en, id)`; el cursor viaja como
  texto (`Date` pierde microsegundos).
- El VIN es único entre todos los vivos (puede chocar con uno que no ves); el lote, por origen y plataforma. El `id` del alta lo genera el navegador.
- En plpgsql nunca `if not (lead_id in (select mis_leads()))` (con nulo no levanta): `puede_vehiculo()`.
- `cotizacion_marcar_final` toma vehículo y luego lead, al revés que vincular: cuidar el orden de locks. Desvincular con cotización final no se frena.
- Una foto < 480 px tiene `ruta = ruta_miniatura` (refcount 2 con una foto).
- e2e: borrar fases antes que el origen (`borrarFasesDe`) y lotes antes que la persona (`borrarLotesDePrueba`).
