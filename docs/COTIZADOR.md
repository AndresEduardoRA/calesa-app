# El cotizador: fórmula como grafo

La fórmula de un origen vive en `formulas.definicion` y `formulas.params` (jsonb) y se versiona entera. El candado que impide publicar
una fórmula rota es doble y aplica las mismas reglas: `validar.ts` (`src/modules/cotizaciones/entities/`) y `validar_formula()` en la
base, con un juego común (`entities/casos-de-formula.json`) y un corpus diferencial (`supabase/tests/corpus-de-formula.json`). La
evalúan el motor TS (`entities/motor.ts`) y `evaluar_formula()`. Referencia: `docs/referencias/excel-de-cotizacion.md`.

## Forma

`definicion` = `{ nodos, buckets, total_en, grupos }`: `nodos` es una lista ORDENADA (el orden es el de evaluación; sólo se referencia
hacia atrás); `buckets` mapea un nombre libre a un id de nodo `tipo_cambio` (`{ exterior: 'tc_paralelo', aduana: 'tc_oficial' }`);
`total_en` es el tipo de cambio que divide el total en Bs (obligatorio con grupos); `grupos` es `[{ id, etiqueta, plazo, tono,
bucket }]`. `params` = `{ <constante>: número, …, tablas?: { <clave de tabla>: [ { <columna>: número | texto | null } ] } }`.

### Los nodos

Común: `id` (`^[a-z][a-z0-9_]{0,40}$`), `tipo`, `etiqueta`; `formato?` (`usd` por defecto, `pct`, `raw`, `moneda`); `descripcion?`;
`salida?` (`total`, `base_imponible`, `aparte`); `bucket?` (sólo sin grupos); `grupo?`; `solo_en?` (claves de la variante; no en
`tipo_cambio` ni `opcion`). Cada objeto es **estricto**: una clave mal escrita es un error.

- `input`: `sugerido_de?` (nodo anterior), `requerido_si?` (bandera), `condicion?`. Lo tipea el asesor.
- `constante`: `condicion?`, `texto?`. Vale `params[id]`, el «valor por defecto global» que cambia el ⚙ (publica la N+1).
- `tipo_cambio`: `clave` (una clave, un solo nodo). Vale el de `tipos_cambio` al cotizar; se congela.
- `campo_vehiculo`: `campo` (`anio` o la clave de un campo del origen), del vehículo vinculado. `bandera`: el interruptor, 0 o 1.
- `opcion`: `opciones: [{clave, etiqueta, titulo}]` (dos o más), `por_defecto?`, `en_par?` («Se cotiza en par»: exactamente dos opciones; sin la clave, la
  de siempre). A lo sumo una. Vale la clave elegida (texto); la nombran `solo_en` y un `match`, nunca un cálculo.
- `tabla`: `tabla`, `match` {columna: nodo anterior o, si no hay uno con ese id, campo del vehículo}, `columna`, `sobrescribible?`,
  `condicion?`. `tramo`: `tabla`, `sobre` (un nodo), `columna`, `sobrescribible?`, `condicion?`: la fila con `desde ≤ sobre ≤ hasta`.
- `calculo`: `op`, `sobrescribible?`, `condicion?`, `texto?`. Operaciones: `suma(de ≥ 1)`, `porcentaje_de(de ≥ 1, pct)` = Σde × pct,
  `multiplicar(de ≥ 2)`, `restar(de[0] − de[1…])`, `dividir(de[0] / de[1])`, `si(condicion, de[0])`,
  `depreciar(de[0], tabla, sobre, columna)`, `redondear(de[0], n de 0 a 6)`.

Un nodo nuevo lleva su tipo en el Zod de `nodos.ts`, su caso en `referenciasDe()` y en `validar_formula()`, y el juego de prueba.

### Grupos, buckets y el total

- **Un grupo** tiene plazo, tono (clave del catálogo `tonos`) y bucket; no es un nodo (un nodo entra con `grupo: id`). Su USD es la
  suma de sus miembros; su Bs, ese subtotal por el tipo de cambio de su bucket.
- **Un bucket** es el papel del dinero (afuera o aduana); `buckets` le da a cada uno un nodo `tipo_cambio`.
- **El total:** con `total_en`, **manda Bs ÷ tc(`total_en`)** (Bs = Σ grupo × tc(su bucket)); el nodo `salida: total`, único, es la suma
  de los dólares y también se ve. Con grupos, `total_en` es obligatorio. Sin `grupos` el bucket va en el nodo y **reparte el total**:
  total con bucket, Bs = total × su tc (`oficina`); si no, un `suma` cuyos términos directos tienen bucket (`subasta_usa`).
- `base_imponible` y `aparte` (la garantía) se muestran y nunca suman; ninguno va en un grupo.

### Sugerido, sobrescribible y el par porcentaje-monto

Un `tabla`, `tramo` o `calculo` con `sobrescribible: true` calcula su valor (el sugerido) y la cotización puede traer otro. **El par
porcentaje-monto** es un `porcentaje_de` sobrescribible y su `pct`: **manda el monto si tiene override**, y si no, el %; si manda el
monto, `valores[pct]` guarda monto ÷ base y `fuentes[pct] = override`. Ningún otro nodo lee ese `pct`, y acepta un valor
(`aceptaValor()` en `nodos.ts`; si no, `par_mal_tipado`).

### La variante y el interruptor

Un nodo fuera de su variante (`solo_en`) o con `condicion` apagada vale 0 sin leer sus referencias, no guarda override y se dibuja
deshabilitado con su motivo («El motor» › «La variante y el estado»). El `opcion` va antes que todo nodo con `solo_en`. El total no
lleva `solo_en`, `condicion` ni `sobrescribible`.

Una **variante en par** (`en_par`) no la elige la persona: la hoja cotiza las dos opciones a la vez y guardar crea dos **cotizaciones hermanas**
(«Cotizaciones hermanas (la variante en par)», abajo).

### Las tablas congeladas (D5)

Editar una tabla de referencia publica la N+1 de cada fórmula que la usa, y la fórmula congela en `params.tablas` las filas que usa:
recalcular con su versión vale también para las tablas. **El motor usa la congelada si existe, aunque esté vacía**; si no, la viva
(`tablas_referencia_filas`); sin ninguna, `tabla_sin_filas`.

**Publicar una tabla.** Una tabla tiene versión (`version`, `nota`, `publicado_por`, `publicado_en`) y se escribe sólo con
`tabla_referencia_publicar(p_tabla, p_filas, p_nota, p_version_esperada)`: `authenticated` no tiene `insert`, `update` ni `delete` en
`tablas_referencia(_filas)`. La pantalla manda la tabla **entera** (filas en orden) con nota y la versión que leyó; la base reemplaza las
filas (también las inactivas), sube la versión y publica la N+1 de cada fórmula publicada que la usa (un nodo con `tabla = clave` **o** la
copia en `params.tablas`) con la copia nueva en `params.tablas[clave]` y todo lo demás igual; el borrador no se toca (uno empezado antes da
PT409 al publicarse). Una compartida (origen nulo) va a los orígenes sin tabla propia activa de esa clave y pide `cotizaciones.configurar`
en **cada** origen que la usa.

- **Orden de rechazos:** 42501 con el mismo texto (tabla inexistente, inactiva o ajena), esperada nula, nota vacía; tras el `for update` de
  la tabla, el permiso de cada origen que la usa, PT409 («Ana publicó la versión 3 de esta tabla hace 2 min.»), las filas contra `columnas`
  (hasta 2.000; `numero` → número, `anio` → entero, `texto` → hasta 200; `hint` `filas.<i>.<clave>`, desde 0) y «La tabla no cambió.» (las
  mismas vivas y cada publicada ya con esa copia: tras revertir, publicar las mismas filas devuelve la tabla).
- **Candados:** la tabla, después `formulas:<origen>` en orden de origen; la publicada se relee dentro de cada uno (si ya no la usa, se
  salta; si empezó a usarla, se pide su permiso). Devuelve `{version, formulas: [{origen_id, version}]}`.
- **La base no congela al publicar una fórmula:** una versión anterior que leía la viva recalcula con las filas nuevas; una que congeló, con
  su copia; lo guardado de una cotización no cambia (manda su snapshot).

## Las reglas

**Primero la forma (`forma`):** el Zod de `nodos.ts` y `formula.ts`. **Después, 31 reglas cruzadas** con código estable (contrato con la
base; lista y textos de cada lado en `entities/motivos-de-formula.ts`); `donde` es el id del nodo, grupo o clave donde se rompe (en la
base, `hint`): `nodo_duplicado`, `referencia_inexistente` (un `match` sin nodo es un campo del vehículo), `ciclo`,
`referencia_hacia_adelante` (también `solo_en` antes del `opcion`), `referencia_de_tipo`, `total_unico`, `total_fijo`,
`total_no_es_monto`, `constante_sin_valor`, `param_sin_constante`, `par_mal_tipado`, `pct_compartido`, `tipo_de_cambio_repetido`,
`tipo_de_cambio_inexistente`, `bucket_inexistente`, `total_sin_tipo_de_cambio`, `grupos_sin_total_en`, `grupo_duplicado`,
`grupo_inexistente`, `grupo_vacio`, `bucket_con_grupos`, `miembro_no_es_monto` (sólo `input`, `constante`, `tabla`, `tramo`, `calculo`,
en usd o moneda), `miembro_con_salida`, `doble_conteo` (un miembro que acumula otro), `opcion_repetida`, `opcion_clave_repetida`,
`opcion_por_defecto_inexistente`, `par_sin_dos_opciones` (`en_par` con otra cantidad de opciones que dos), `solo_en_sin_opcion`, `solo_en_opcion_inexistente`, `campo_con_punto` (un campo de vehículo con punto:
es una columna o la clave de un campo del origen).

El validador **devuelve el primer rechazo**, en orden fijo, y es **lineal** (todo bucle y toda búsqueda pasan por `medidor.ts`).

### En la base

`validar_formula(definicion, params)`, STABLE, hace lo mismo que `validarFormula()`. Rechaza con `22023`, el código en DETAIL y
`donde` en HINT; sólo código y `donde` son contrato. **Divergencia declarada:** la base es más estricta con `__proto__` en `buckets`,
`tablas` o una fila. La base nunca acepta lo que Zod rechaza.

## El motor

`evaluar(formula, entrada, modo?, medidor?)` en `entities/motor.ts`: puro (sin I/O, fecha, azar ni base). `formula` es la salida de
`validarFormula()`. `evaluar_formula()` es su espejo; comparten `entities/casos-del-motor.json`.

**La entrada** (`esquemaEntrada`, `motor-entrada.ts`): `inputs` (lo tipeado por id de `input`), `banderas` (lo que no está, apagada),
`tipos_cambio` (por clave, > 0), `vehiculo` (por campo: número, texto o null), `tablas` (las vivas; la congelada manda), `variante?`
(sin clave, el `por_defecto`), `overrides` (`{id: número}`; el que no se aplica no es error).

**El resultado:** `valores` (todos los nodos, en el orden de la lista; null si falta algo que lo alcanza; el `opcion`, su clave),
`estados` (`activo`, `fuera_de_variante`, `condicion_apagada`), `fuentes` (`default`, `sugerido`, `override`, `input`; sólo nodos
activos que aceptan un valor), `totales` (`grupos` `{usd, bs, se_dibuja}`, `bs`, `usd` = Bs ÷ tc(`total_en`) o, sin `total_en` ni modo,
la suma de los dólares, y `suma_usd` = el nodo `salida: total`), `faltantes` (`{codigo, donde, ref?}`, en el orden en que nacen) y
`overrides_descartados` (`{id, motivo}`).

**Los errores de llamada lanzan** `ErrorDelMotor`: `modo_invalido`, `entrada_invalida` (clave de `inputs`/`banderas` de otro tipo;
`variante` inexistente; sin `variante` ni `por_defecto`), `formula_sin_validar`. Lo que causa una persona no lanza: viaja como
`faltantes` o `overrides_descartados`.

### La variante y el estado

La pasada previa (`motor-estados.ts`) decide cada nodo: con `solo_en` y variante ausente, `fuera_de_variante`; con `condicion` y
bandera ≠ 1 (una bandera fuera de su variante está apagada), `condicion_apagada`; si no, `activo`. Un nodo inactivo vale 0 sin leer
referencias y su override se descarta. La variante gana a la condición. También marca los grupos que se dibujan y los pct «pisados».
Un `match` que nombra la variante compara la clave elegida (texto) con la columna. Un input tipeado fuera de su variante vale 0.

### Overrides y fuentes

**Precedencia: override > sugerido.** Un nodo activo con override vale el override y **no calcula su sugerido**. ↺ lo quita.
`constante`: `default` u `override`. `tipo_cambio`: `default` (el de la empresa) u `override` (≤ 0 es sin valor).
`tabla`/`tramo`/`calculo` sobrescribible: `sugerido` u `override`. `input` sin `sugerido_de`: `input` (su override se descarta como
`no_sobrescribible`; lo tipeado va en `inputs`); con `sugerido_de`: tipeado (`override`) o el del nodo que nombra (`sugerido`). Lo demás
no tiene fuente y su override se descarta `no_sobrescribible`.

Motivo de un descarte, por precedencia: `nodo_inexistente`, fuera de variante, apagado, `no_sobrescribible`. Los de nodos van en el
orden de la lista; los inexistentes, al final **ordenados por id** (bytes, `collate "C"`). Una cotización que pasa a la N+1 trae los
overrides de la N. `total_en` y los buckets leen el valor final del nodo.

### El par porcentaje-monto

Base = Σde de izquierda a derecha. **Con override del monto, el pct está «pisado»**: no se calcula, no aplica su propio override, su
fuente es `override` y vale monto ÷ base. Sin override: monto = base × pct (`sugerido`). Override sólo del pct: monto = base × pct. Los
dos: manda el monto. Base 0 y manda el %: monto 0; base 0 con override del monto: pct null y `division_por_cero` en el pct.

### `sugerido_de` y `requerido_si`

«Tipeado» es que la clave está en `inputs`, aunque valga 0. `sugerido_de` sin tipear vale lo del nodo que nombra (`sugerido`);
tipeado, `override`. `requerido_si` encendida y sin tipear: null con `requerido_sin_valor` (donde = el input, ref = la bandera); un
sugerido no lo cumple; un input inactivo no exige nada.

### Qué pasa cuando falta algo

- Input o bandera sin valor: **0**, sin faltante. Dan null con su faltante: `requerido_sin_valor`; `campo_sin_valor` (campo del
  vehículo ausente, null o no número); `tabla_sin_filas`; `fila_sin_coincidencia`; `celda_sin_valor` (no es número); `division_por_cero`;
  `tipo_de_cambio_sin_valor` (ausente o ≤ 0); `fuera_de_rango` (no finito). Un nodo anota a lo sumo un faltante; uno que lee un null
  es null sin faltante nuevo. Fuera de variante o condición apagada: **0 sin leer referencias**.
- **Totales:** el USD de un grupo es null si lo es un miembro; su Bs, si lo es su USD o su tipo de cambio. **Un grupo que no se dibuja**
  vale `{usd: 0, bs: 0, se_dibuja: false}` y no lee su tipo de cambio. Los códigos (`motor-contexto.ts`) son el contrato con la base.

### La aritmética

Dobles (float8), de izquierda a derecha: `suma` = ((d0 + d1) + d2)…; `restar` = ((d0 − d1) − d2)…, nunca d0 − Σresto; `multiplicar`
igual; `porcentaje_de` = (Σde) × pct. −0 se guarda como 0; lo no finito, null con `fuera_de_rango`. **`redondear(x, n)` =
`round(x::float8::numeric, n)::float8`:** 15 cifras significativas y mitad lejos de cero, como el ROUND del Excel (2,675 da 2,68);
`redondeo.ts` lo hace exacto con BigInt.

### Las tablas, los tramos y `depreciar`

La congelada de `params.tablas` manda si existe, aunque esté vacía; si no, `entrada.tablas`. **`tabla`:** gana la **primera fila** (en
el orden de la tabla) cuyas columnas del `match` son todas iguales a lo que nombran: un nodo anterior con ese id (la variante, su
clave) o, si no, el campo del vehículo; **igualdad estricta sin conversión** (2024 ≠ "2024"). **`tramo`:** la primera fila con
`desde ≤ sobre ≤ hasta` (extremos incluidos); sin `desde` o `hasta` numérico no coincide nunca.
**`depreciar(d0, tabla, sobre, columna)` = d0 × el `tramo` de esa tabla**.

### En la base

`evaluar_formula(p_def, p_params, p_entrada, p_modo default null)`, STABLE, hace lo mismo que `evaluar()`: recibe las dos columnas de
`formulas` tal cual, el modo completo (NULL de SQL es «sin modo») y **no revalida la fórmula**. `faltantes` y `overrides_descartados`
son **arreglos** (su orden es contrato). Errores de llamada: 22023, código en DETAIL, `donde` en HINT. Se suma con bucle en el orden de
la lista (`supabase/tests/evaluar-formula.sql`).

### En la base

`cotizacion_evaluar(p_entradas, p_cotizacion, p_origen, p_vehiculo, p_modo, p_modo_tc, p_abierta)` y su ayudante `_cotizacion_armar()`
(`security definer`; armar comprueba y lee, la otra llama a `evaluar_formula()`); ver también «En la base (4.10-1)» y «La hoja abierta
(4.13-3a)».

- **Llamada:** exactamente uno de `p_cotizacion` y `p_origen` (si no, `llamada_invalida`). **Con una cotización:** SU fórmula
  (`formula_id`, nunca la vigente), SUS tipos de cambio congelados y SU vehículo. **Con un origen:** la fórmula publicada
  (`origen_sin_formula`), los tipos de cambio activos de la empresa y `p_vehiculo` opcional (`vehiculo_de_otro_origen`).
- **Lo que tipea la persona** es `p_entradas = {inputs, banderas, overrides, variante}` y nada más (`entradas_invalidas`); la base
  pone `tipos_cambio`, `vehiculo` y `tablas`. **Quién puede:** cotización, `puede_cotizacion(id, 'cotizaciones.ver')` (inexistente y no
  vista dan el mismo 42501); origen, `cotizaciones.crear` y `cotizaciones.ver`. El vehículo se lee sólo con
  `puede_vehiculo(id, 'vehiculos.ver')` y sólo salen los campos que la fórmula nombra.
- **Qué lee:** sólo las tablas que un nodo nombra y la fórmula no congeló (la del origen o, si no hay activa, la compartida con
  `origen_id is null`; «la primera fila» es la de menor `orden` y, repetido, menor `id`); un campo del vehículo es una columna (`anio`,
  `marca`, `modelo`, `kilometraje`, `precio`) o la clave de un campo **activo del origen** (`atributos -> clave`).

## Fórmulas como texto

`compilarExpresion(texto, contexto, medidor?)` (`entities/compilador.ts`) convierte `=(remate+fees)*4%` en nodos del mismo grafo. Puro,
**nunca lanza** (devuelve `{ ok: false, error: { codigo, mensaje, tramo } }`; códigos en `entities/motivos-del-compilador.ts`), sin
recursión, lineal, profundidad máxima 64. Se compila **al configurar**; al cotizar no se evalúa texto. **`texto?` de la fila** (sólo
`constante` y `calculo`): el editor guarda `{ ...raíz compilada, texto }`, de 1 a 2.000 caracteres (`MAXIMO_DE_TEXTO` en `nodos.ts`); el
motor lo ignora; otro nodo con `texto` es `forma`.

- **Gramática:** números, `4%` (÷ 100, constante `pct`), `+ - * /` y `( )`; un nombre es sólo el id de un nodo anterior. Funciones
  (argumentos con `;`): `SUMA(grupo)`, `SI(bandera; x)`, `REDONDEAR(x; n)`, `PORCENTAJE_DE(x; pct)`,
  `DEPRECIAR(x; tabla; sobre; columna)`. No hay `MULTIPLICAR`/`RESTAR`/`DIVIDIR`, referencias A1 ni `HOY()`. Un literal es una
  `constante` en `params`.
- **Grafo:** `a+b+c` es UN `suma` (igual `restar` y `multiplicar`); un paréntesis, función o cambio de operación cortan el aplanado;
  `/` nunca se aplana. Cada operación anidada y número es un auxiliar `<destino>__<n>`, `n` desde 1 en **post-orden**; la fila es la raíz
  y no se numera; un id existente es `auxiliar_ocupado`.

### El editor

Lo puro en `entities/formula/`: nunca lanza, no toca lo que recibe y es lineal con el medidor.

- **Fila y auxiliares** (`filasDe()`): las auxiliares de una fila con `texto` son los k nodos de justo antes con ids `<id>__1…k` (recorte
  de `idAuxiliar()` si el id pasa de 37 caracteres, 38 desde `__10`), sin texto propio, cada uno nombrado por exactamente un nodo de la
  cadena o por la fila; si el **texto** de la fila nombra una (`=total__1+remate`), ese nodo es una fila propia. Regla en
  `compilador-auxiliares.ts` (`auxiliaresDe()`); espejo en la base, `_diseno_auxiliares()`.
- **Compilar una fila en su lugar** (`compilarFila()`): el contexto es lo anterior a su primera auxiliar; reemplaza la fila y sus
  auxiliares y quita y suma sus `params`. El tope de 2.000 se mide **en unidades UTF-16** (la base cuenta caracteres):
  `texto_demasiado_largo` desde la unidad 2.001. Conserva `seccion`, `color`, `sobrescribible` (si sigue siendo cálculo) y `condicion`
  sólo como interruptor (en un `SI` la bandera la decide el texto); lo que suelta va en `soltados`. Cambiar o quitar una auxiliar que otra
  fila nombra da `auxiliar_nombrada`.
- **El texto ya no manda** (`textoVigente()`): el ⚙ publica N+1 sin tocar `texto`. Al abrir, si sólo cambió el valor de una constante, se
  **reescribe en su tramo** (`escribirLiteral()`: con `%` se corre el punto, nunca `v * 100`) y la fila queda `reescrito`; si no (no
  compila, otra estructura, un negativo, un `-0`), `no_manda` con su motivo. Recompilar una fila `no_manda` que cambia o quita una
  constante da `pisa_un_valor` hasta `confirmaPisar`: nunca se deshace un ⚙ en silencio.
- **Las filas sembradas** no traen texto: `textoDeNodo()` lo escribe (`a+b+c`, `SI(b; x)`, sin «=») sólo si compilarlo da exactamente ese
  nodo; si no, `null` y la fila se muestra por sus campos.
- **La pantalla:** la **planilla** (`features/formula/components/planilla/`, la vista por defecto) y el **Modo avanzado** (`components/editor/`,
  `?panel=editar-formula`), sobre una sola fórmula de trabajo que tiene la sesión (`components/sesion/`, `useEditorDeLaFormula` una vez): compila al
  aplicar con `compilarFila()` (sin `validarFormula()` si la fila da error), valida la fórmula de trabajo tras cada cambio (el rechazo, en su fila) y
  la guarda con `formula_guardar_borrador()`. La sesión se vuelve a montar con «Recargar» o si la versión cambia por algo que no hizo ella
  (`otraSesion()`: publicar, descartar, revertir); guardar sobre la publicada no la vuelve a montar.
- **La planilla:** `bandasDeLaPlanilla()` (`planilla.ts`) reparte las filas en bandas (tipo de cambio, unidad de ejemplo, variante, un grupo por banda
  y «Sin grupo»; cada fila una vez, numeradas en el orden en que se dibujan); `celdaB()` y `editableEnC()` dicen qué celdas se editan.
  `deDondeSale()` (`de-donde-sale.ts`) dice cada fila en palabras con las etiquetas (nunca ids): una frase por tipo de nodo y por operación, las
  auxiliares en línea (una constante con su valor, un cálculo entre paréntesis), nunca lanza y es lineal. `cambiarValorDeConstante()`
  (`valor-en-la-planilla.ts`) escribe `params[id]` como el ⚙ y reescribe el texto de la fila que la contiene (`textoVigente()`); si el texto no
  puede decirlo queda `no_manda`. La **unidad de ejemplo** (`unidad-de-ejemplo.ts`: `inputs`, `banderas`, `vehiculo` por campo y la variante) se
  calcula con `calcularLaVistaPrevia(formula, terreno, unidad, modo)`: `entradaDeLaUnidad()` suelta lo que la fórmula ya no tiene, `modoDelMotor()`
  pasa el modo del diseño al motor y un modo que no cubre un bucket da `no_calcula`. `totalesDeLaUnidad()` arma «Totales» y `calculoDeLaUnidad()`
  la tarjeta en vivo (sólo los ids que su lectura nombra).
- **Vista previa** (`calcularLaVistaPrevia()`): `evaluar()` con `entradaDePrueba()` (datos en 0, banderas apagadas, variante por defecto,
  sin overrides) y los tipos de cambio y tablas que lee el navegador (`consulta-del-terreno-de-prueba.ts`: la del origen gana a la
  compartida, páginas de 1.000 filas); la congelada manda. «Sumar fila» (`sumarFila()`, `idDeFilaNueva()`) compila con un destino nuevo y
  revisa que salga el tipo elegido.
- **Los grupos** (`aplicarGrupo()`): edita etiqueta, plazo, tono, bucket y miembros de un grupo existente sin tocar texto, auxiliares ni
  orden; sólo suman raíces que `validarFormula()` acepta (`puedeSumarAlGrupo()`); una fila quitada queda sin `grupo`. No crea ni quita
  grupos ni edita `buckets`, `total_en` o modos. Mover una fila a otro bucket cambia el total en Bs en su USD × (tc nuevo − tc viejo).

## Tipos de cambio y modos (D7, H1)

- Los tipos de cambio son **una lista de la empresa**: `tipos_cambio` (oficial, paralelo, unificado, aduana y los que se sumen), con
  `tipos_cambio_historial` y el permiso `empresa.tipos_cambio.gestionar`. **La cotización congela** en `tipos_cambio` lo que usó; el
  asesor puede sobrescribir uno si su celda es editable para su nivel. El ⚙ es `tipo_cambio_guardar` (afecta a todos los orígenes).
  **Publicar no comprueba** que `tipos_cambio` tenga la clave de cada nodo `tipo_cambio`: `cotizacion_evaluar()` lo da como faltante.
- **Un modo** lo declara el diseño; el elegido se guarda en `cotizaciones.modo_tc`. **El motor lo recibe completo**, con la forma de la
  fórmula: `{ buckets: {bucket: id de nodo tipo_cambio}, total_en }` (`ModoDeCambio` en `entities/formula.ts`). Un modo es otro mapa, no
  otra cuenta. **Límite:** `cabecera.moneda_bs` es la de la versión, no la del modo elegido; un modo cuyo `total_en` tenga otra `moneda_a`
  escribiría el total en Bs con la de la versión (hoy todos los tipos de cambio son USD → BOB).

## El diseño de la hoja (D7)

`formulas.diseno` (jsonb), versionado y publicado con la fórmula (un cambio de diseño publica la N+1). Lo validan `validarDiseno()`
(`entities/validar-diseno.ts`, sobre el Zod de `entities/diseno.ts`) y `validar_diseno()` en la base, con juego
(`entities/casos-de-diseno.json`) y corpus. **Declarativo:** nada de CSS, clases, HTML ni hex.
Forma: `{ cabecera: {modos[], ver_total_bs, …aspecto, modo_por_defecto?, ver_total_bs_por_defecto?, modos_visibles?}, secciones[],
tarjeta_total: {nodo, secundarios[]} }`.

- **`cabecera.modos[]`** `{clave, nombre, buckets: [{bucket, nodo}], total_en}`: nombra **nodos `tipo_cambio`** (no claves) y llena
  **exactamente** los buckets de la fórmula; no hay modos en una fórmula sin `total_en`.
- **Lo que la cabecera trae por defecto** (opcional; sin eso, todo como siempre): `modo_por_defecto` (la clave del modo con que abre una
  cotización nueva; sin él, el primero), `ver_total_bs_por_defecto` (booleano: «Ver total» encendido al abrir una nueva; sin él, apagado) y
  `modos_visibles` (las claves de los modos que se dibujan en el encabezado, en cualquier orden; sin la lista, todos). Una guardada abre con
  lo suyo, y **el modo que tiene elegido se dibuja aunque no esté entre los visibles**: la visibilidad es del encabezado, no una regla de
  guardado (`_cotizacion_modo` acepta cualquier modo del diseño).
- **`secciones[]`, en orden** (el del DOM, de lectura y del `Tab`): `id`, `titulo?`, `presentacion` (`principal`/`avanzado`),
  `nivel_ver?`/`nivel_editar?` (los heredan sus ítems), `items[]`. Las `avanzado` van juntas en **un** modal «Avanzado».
- **`items`:** `celda` (`nodo`, `ancho`, `secundario?`, `ayuda?` = una `tabla` o un `texto` con hasta 5 `enlaces` `{titulo, url}`
  —título de 1 a 60 caracteres, URL `https://` de hasta 2000—, `nivel_ver?`, `nivel_editar?`; **el
  candado se deriva** —cálculo, dato del vehículo, condición apagada, otra variante o nivel que falta— y siempre dice su motivo; **el
  par porcentaje-monto es una sola celda**, con `secundario`); `atajos` (un nodo `tabla` sobrescribible, su `columna` y hasta 12
  `filas` como chips); `variante` (el nodo `opcion` como chips; obligatoria si hay variante); `interruptor` (una `bandera` con `efecto`
  `habilita`, que deshabilita lo que condiciona, o `muestra`, que apagada no lo dibuja; toda bandera que condiciona algo o pide un dato
  tiene su interruptor); `subtotal` (un `calculo` como franja).
- **El aspecto** (`docs/GLOSARIO.md` › «Aspecto»): claves planas y opcionales, de escalas cerradas; sin la clave, lo de siempre. Ítem:
  `ancho` (la celda, obligatorio: `completo`|`mitad`|`tercio` o un entero de 1 a 12, y los con nombre valen 12, 6 y 4; los demás ítems, un
  entero de 1 a 12, sin él la fila entera), `alto` (1 a 4 filas), `letra` (`chica`|`normal`|`grande`) y `enfasis` (`normal`|`fuerte`).
  Sección: `ancho` (1 a 12; sin él, «Automática»), `alto`, `relleno` (`chico`|`medio`|`grande`), `separacion` (`chica`|`media`|`grande`),
  `densidad` (`compacta`|`comoda`), `letra`, `enfasis` y `tono` (una clave del catálogo). Cabecera: `tono`, `relleno`, `letra` y `enfasis`
  (no lleva ancho ni alto: va sola en su fila). Los enteros se leen como JS (`0.99999999999999999` es 1). La tarjeta no lleva aspecto.
  Lo dibuja la **rejilla de la hoja** (`entities/rejilla-de-la-hoja.ts`, clases en `features/hoja/components/clases-de-la-rejilla.ts`): una
  pieza de N columnas toma su ancho cuando le tocan 16 rem; el PDF y la tarjeta no lo siguen.
- **`tarjeta_total`:** el nodo total y sus `secundarios` (`aparte`). Un nodo aparece a lo sumo una vez. Nivel efectivo de un ítem: el
  suyo (sólo la celda), si no el de su sección, si no `todos`. El diseño no lleva `solo_en`. **El tono de una celda es el del grupo de la
  fórmula** (`definicion.grupos[].tono`); el de una sección pinta su borde y sus celdas sin grupo, sus franjas y sus chips (no su fondo ni sus
  textos sueltos); el de la cabecera, sus chips de los modos.

### Las reglas

**Primero la forma (`forma`)**, el Zod de `diseno.ts`; **después, el tamaño (`demasiados_items`)**: a lo sumo 40 ítems sumando todas las
secciones (principal o avanzado; la cabecera y la tarjeta no cuentan), con `donde` = la sección en la que la suma pasa del tope
(`MAXIMO_DE_ITEMS_DEL_DISENO`; en la base, `_diseno_maximo_de_items()`). El borrador lo admite; publicar lo rechaza. **Después, 34 reglas
cruzadas** con código estable (lista en `entities/motivos-de-diseno.ts`; `donde` = id del nodo, sección, modo o grupo; en la base,
`hint`), en pasadas: §1 los modos; §1b lo que la cabecera trae por defecto, todas con `donde` = `cabecera` y en este orden:
`modo_por_defecto_inexistente`, cada modo visible en orden (`modo_visible_inexistente` y después `modo_visible_repetido`),
`modo_por_defecto_oculto` (el modo por defecto efectivo —el escrito o el primero— no está entre los visibles; también la lista vacía) y
`ver_total_bs_por_defecto_no_ofrecido` (encendido sin `ver_total_bs`; apagado siempre vale); §2–5 las secciones, la tarjeta, los atajos y la
cobertura; §6 `tono_inexistente`, que revisa el tono de cada grupo, después el de la cabecera (`donde` = `cabecera`) y después el de cada
sección (`donde` = su id); §7 `ayuda_enlace_no_https` (`donde` = el nodo de la celda): la URL de un enlace de la ayuda cumple
`^https://[!-~]+$` (ASCII imprimible sin espacios, la misma clase en JS y en Postgres: `URL_DE_ENLACE`). La forma de un enlace (de 1 a 5,
`{titulo, url}`, los largos) es `forma`. Las de nivel: `nivel_no_admitido` (el total, lo `aparte` o la variante con nivel efectivo de ver que no es «todos»: la base
siempre manda el total y lo `aparte`) y `editar_sin_ver` (ver restringido con editar ausente o «todos»; **ver abierto con editar
restringido vale**). El primero que falla manda. **La definición llega ya validada.** `validar_diseno(def, diseno, niveles, retirados,
tonos)`: STABLE, invoker, `search_path` vacío, 22023 con la regla en DETAIL y `donde` en HINT.

Una `constante` auxiliar de un número escrito en el texto de su fila no pide celda (`nodo_sin_seccion` no la nombra): se edita por ese
texto, y lo que la visibilidad no nombra sólo llega a `cotizaciones.configurar`. Si tiene celda, vale como siempre; una fila constante sí
la pide.

### En la base

- **`formulas.diseno` y `formulas.visibilidad`** (jsonb): nulas sólo en un borrador. **Publicar exige el diseño** (22023
  `diseno_faltante`; `check` `formulas_publicada_con_diseno`, también en las archivadas).
- **Guardar:** `formula_guardar_borrador(origen, definición, params, diseño, nota?, …)` valida la fórmula y sólo la **forma** del diseño.
  **Publicar** (`formula_publicar()` → `_publicar_formula()`; el ⚙ y revertir → `_publicar_version()`): toma el borrador `for update` y
  los tonos de sus grupos y de su diseño (`_tonos_de_grupos()` y `_tonos_del_diseno()`) `for key share`, valida fórmula y diseño completo
  (`_preparar_publicacion()`) y compila `visibilidad`. Dos a la vez: PT409 («Versiones (4.20-1)»). `validar_diseno()` lee las secciones
  del diseño una vez a una variable: un diseño fuera de línea (TOAST) se relee entero en cada `->`.
- **`visibilidad`** = `{nodo: {ver, editar}}` con **claves de nivel**, no permisos (`_compilar_visibilidad()`): cada ítem da su nodo con
  su nivel efectivo (y el `pct` de una celda con `secundario`); el total y lo `aparte` tienen `ver: todos`; lo que no se dibuja entra
  como `{ver: todos, editar: null}`. Lo que no figura no viaja, salvo a quien configura.
- **Colores** (nombre técnico heredado: la tabla `tonos` y las RPC `tono_*`; clave, nombre, `hex` y fondo/borde/tinta en claro y oscuro):
  sólo por `tono_crear(p_id, p_nombre, p_hex)`, `tono_guardar(…, {nombre?, hex?})` y `tono_eliminar` (`cotizaciones.configurar`; las tres
  devuelven la lista entera); hasta **48**. **La hoja se deriva del hex en la base** (`_color_derivar`, espejo de `derivarColores()` en
  `entities/colores.ts`, probado con `supabase/tests/casos-de-colores.json`) con AA garantizado (tinta sobre fondo ≥ 4,5:1) y se guarda en
  `claro_*` y `oscuro_*`; guardar el mismo hex no vuelve a derivar. El texto sobre un color en la hoja va en su **tinta**; en la tarjeta, el
  de `_color_tinta_de_la_tarjeta()`. Un color o un nivel que alguna versión nombra no se elimina (23503): `_tono_en_uso()` busca la clave en
  los grupos (`formulas_tonos_idx`) y en la cabecera y las secciones del diseño (`formulas_tonos_del_diseno_idx`, GIN sobre
  `_tonos_del_diseno(diseno)`).
- **La fórmula sólo la lee quien la configura** (`cotizaciones.configurar` del origen), y `formula_auditar()` no copia `definicion`,
  `params`, `diseno` ni `visibilidad` a `actividad`. Semilla: `subasta_usa`, `planilla_usa`, `oficina` (`supabase/semillas/`).

### Versiones

- **Una serie por origen:** a lo sumo un borrador y una publicada; publicar archiva la publicada. Guardar, descartar y publicar el
  borrador, el ⚙ y revertir toman el candado del origen (`pg_advisory_xact_lock(hashtextextended('formulas:' || origen, 0))`) después del
  permiso (42501 antes de cualquier PT409) y, en guardar, de la validación; recién después leen la publicada y comparan con su esperada.
- **Versión de origen** (`formulas.version_origen_id`): la publicada sobre la que se empezó el borrador (la escribe
  `formula_guardar_borrador()` al crearlo; pisarlo no la cambia). Publicarlo cuando ya no es la publicada: PT409 «Después de que empezaste
  este borrador, Ana publicó la versión 3 hace 2 min.». Nula (no había publicada o fila escrita fuera de las RPC): no se compara.
- **El ⚙** (`formula_cambiar_constante(origen, nodo, valor, publicada_esperada?)`, `cotizaciones.configurar`): publica la N+1 desde la
  publicada (definición y diseño, `params` con el valor nuevo; un nivel retirado no lo frena), **sin crear ni tocar el borrador**.
  Esperada nula = la publicada que lee al entrar; el mismo valor da 22023 (hint `valor`).
- **El ⚙ de la cabecera** (`formula_cambiar_cabecera(origen, modo_por_defecto, ver_total_bs_por_defecto, modos_visibles, publicada_esperada?)`,
  `cotizaciones.configurar`): publica la N+1 desde la publicada con las tres claves por defecto de la cabecera escritas siempre juntas (definición
  y `params` iguales), **sin crear ni tocar el borrador**. Mismo contrato que el ⚙ de una constante: el permiso primero, la esperada (PT409 con
  quién y cuándo), `_publicar_version()` (candado, validación entera del diseño, `formula.publicada` con `despues.cabecera`). 22023 con hint
  `cabecera` si la publicada no tiene modos o ya tiene esos valores (los efectivos: lo que falta vale el primer modo, falso y todos). La hoja
  lo dibuja sólo con `cabecera.ajustes`; «Aplicar también a esta cotización» cambia la hoja abierta como si la persona eligiera.
- **Revertir** (`formula_revertir(origen, versión, nota, publicada_esperada)`, sin defaults, `cotizaciones.configurar`): publica la N+1
  como copia de una **archivada** (definición, params y **diseño**), sin tocar el borrador. Rechaza la publicada, un borrador, otro origen o
  inexistente (mismo texto) y la esperada nula (22023); un nivel retirado en ese diseño da 22023 `nivel_retirado`. `actividad` registra
  `formula.publicada` con `copia_de` y `version_copiada`.
- **El conflicto dice quién, cuál y cuándo** (`_version_publicada_por()`), sin «Recarga»: «Publicaste…», «Ana publicó…» u «Otra persona
  publicó…» (sin quién o sin nombre); sin `publicado_en` se quita el «hace…». Esperada en un origen sin publicada: «La versión que tenías
  ya no es la publicada, y el origen no tiene otra.». Se muestran tal cual.
- **La versión esperada del borrador:** `formula_guardar_borrador(…, nota, publicada_esperada?, actualizado_en_esperado?)` **sin hora
  crea**: con borrador, PT409 «Ya hay un borrador: lo empezó Ana y se guardó hace 2 min.» («lo empezaste tú», «lo empezó otra persona»);
  con la publicada cambiada, «Mientras editabas, Ana publicó la versión 4 hace 2 min.». **Con hora pisa** sólo si es la del borrador y
  devuelve `{id, actualizado_en}` para volver a guardar sin releer. `formula_descartar_borrador(origen, actualizado_en_esperado?)` y
  `formula_publicar(…, publicada_esperada?, actualizado_en_esperado?)` con hora: «El borrador cambió después de que lo abriste: se guardó de
  nuevo hace 2 min.» o «El borrador que abriste ya no está: se publicó o se descartó.» (publicar mira antes la publicada). Sin hora toman el
  que haya («No hay borrador»). La app manda siempre las esperadas; la base acepta la nula (excepción aprobada a
  `.claude/rules/migraciones.md`).
- **Dónde se ven:** pestaña «Fórmula» de Configuración › Cotización: publicada, borrador (atrasado si su versión de origen ya no es la
  publicada) y versiones por cursor, sin lo oculto (`docs/UX.md` › «Cotización: fórmula (estados propios)»); ahí se publica con nota, se
  descarta (`<Confirmar>`) y se revierte.
- **Carreras** (`scripts/carreras/tonos.mjs`, `formula-mixtas.mjs`): dos publicar, dos ⚙, el ⚙ contra publicar el borrador, revertir contra
  el ⚙ y el ⚙ de la cabecera contra el de una constante y contra publicar, en los dos órdenes: la segunda da PT409 y nada se pisa.

### La cotización aprobada

Cada vehículo tiene a lo sumo una **cotización aprobada**: la fila de `cotizaciones_aprobadas` (clave primaria `vehiculo_id`, `cotizacion_id`
único) con su **primer resultado** congelado: `monto` = `totales.usd` y `moneda` = `USD` (`_cotizacion_primer_resultado()`, espejo de
`entities/primer-resultado.ts`: lo que la hoja dibuja primero en la tarjeta del total; nulo si no es un número) y las copias `origen_id`, `creado_por` y
`lead_id`. Es una tabla aparte, no una columna: aprobar no mueve la versión de ninguna cotización ni toca `vehiculos`, y `authenticated` lee `vehiculos`
entera (el monto llegaría a quien ve el vehículo y no la cotización). Su policy espeja «cotizaciones: leer» sobre las copias: la fila y el monto los ve
exactamente quien ve esa cotización; sin escritura para `authenticated`.

**La regla única** (`_aprobada_reponer(vehículo)`): _activa_ = con ese vehículo, fuera de la papelera y no `invalida` (una `reportada` cuenta). Si la
fila apunta a una activa del vehículo, se queda (se refrescan monto y copias si cambiaron); si no, pasa a **la más antigua activa** por `(creado_en, id)`;
sin activas, o con el vehículo en la papelera o inexistente, no hay fila. De ahí: la primera nace aprobada, las siguientes (y las de «encima») no;
invalidar o mandar a la papelera la aprobada la reasigna; **restaurar o reactivar no le quita la marca a quien la tiene**; una aprobación a mano no
vuelve al restaurar un vehículo. Cambiar de vehículo (también desde el detalle de una preventa guardada, por `cotizacion_guardar`) sale del viejo (si era
la aprobada, la releva la más antigua de ese) y llega al nuevo sin marca, salvo que no tuviera. Sin vehículo nunca es aprobada. Guardar la aprobada refresca su monto; guardar otra no lo toca. Marcar o crear una final no
aprueba: si la aprobada se va con las preventas, la releva la más antigua activa que queda.

**Quién la mantiene:** toda escritura de `cotizaciones` que pueda cambiarla (alta, vehículo, estado, papelera, `totales`, `lead_id`, `creado_por`,
`origen_id`, borrado) sin reescribir ninguna RPC. `trg_cotizacion_aprobada_anotar` (por fila, sin candados ni escrituras) anota en un GUC local los
vehículos tocados y `trg_cotizaciones_aprobadas_al_confirmar` (constraint trigger **diferido**) toma, **al confirmar**, el candado de cada vehículo en
orden de id y los repone con una lectura nueva. Por eso una RPC de escritura no devuelve si quedó aprobada: la pantalla lo lee después. La siembra de
volumen inserta sin triggers y llama `_cotizaciones_aprobadas_rellenar()`.

**`cotizacion_aprobar(id, versión esperada)`** pasa a la cotización a aprobada y la anterior deja de serlo. En este orden: ver (42501 «No tienes
acceso a esta cotización.», igual para inexistente o en la papelera) y `cotizaciones.aprobar` **del origen de la cotización** (42501), todo antes de
tomar nada; sin vehículo, 22023 con `hint 'vehiculo'`; inválida, 23514. Candados: el vehículo `for key share`, la cotización `for share` y, al final, el
candado de la aprobada del vehículo (aviso). Con todo tomado vuelve a mirar ver y exige la versión **de esa cotización** (PT409 con quién y cuándo) sin
moverla. Aprobar la que ya lo es no cambia nada. Deja `cotizacion.aprobada` en la actividad y devuelve `{cotizacion, anterior}`; `anterior` sólo viaja
si quien aprueba la ve, puede aprobarla (su origen) y sigue activa (es lo que necesita «Deshacer»).

**Dónde se aprueba otra:** «Aprobar» de la cabecera de la guardada, «Aprobar» del «⋯» del listado, «Aprobar esta» del bloque **De este vehículo**
(la guardada y el resumen del listado) y «Aprobar esta» al pie de cada columna de **Comparar cotizaciones** (`/cotizaciones/comparar`: lo guardado de
2 o 3 del mismo vehículo, cada una con `cotizacion_hoja_guardada()` y sin `cotizacion_evaluar`, alineado por nodo en TS con el diseño y los valores ya
recortados; nada se lee de `formulas`). El bloque lee `cotizaciones_de_este_vehiculo(vehículo, tamaño, cursor)` (invocadora: una página por
`cotizaciones_vehiculo_creado_idx` y, sin cursor, la aprobada por `cotizaciones_aprobadas_pkey` marcada `fijada`), que trae la versión de cada fila para
aprobarla y el nombre de su modo de tipo de cambio por `_nombre_del_modo()` (`security definer`: el nombre que ya dan la hoja y la tarjeta a quien
tiene `cotizaciones.ver` del origen, una vez por versión y modo).

Candados de la clase (todos en el orden común lead → vehículo → cotización → aprobada): la transacción que confirma ya tiene sus candados de fila y
sólo lee `cotizaciones` y escribe `cotizaciones_aprobadas` tras el candado de aviso, así que no cierra ciclos. `cotizaciones_aprobadas.vehiculo_id`
**no tiene FK a `vehiculos`**: el `insert` tomaría `key share` del vehículo al confirmar y cerraría un ciclo con su papelera. Pruebas:
`supabase/tests/areas/aprobada/`, `scripts/carreras/cotizaciones-aprobada.mjs`, `supabase/tests/medir-cotizaciones-aprobadas.sql`.

## Niveles de acceso (D7, H3 y H4)

- **Un nivel** es una fila de `cotizaciones_niveles` (sembrada con «todos» y «costos»). Cada uno, salvo «todos», genera dos permisos por
  origen, `cotizaciones.nivel.<clave>.ver` y `….editar`, en la matriz de Roles. «Todos» usa `cotizaciones.ver` y
  `cotizaciones.crear`/`cotizaciones.editar`. Al publicar, el diseño se compila a `formulas.visibilidad`, lo único que lee la base.
- **Lo que no se ve no viaja** («En la base (4.10-1)»): la tarjeta y el PDF leen lo que dibujan con `cotizacion_tarjeta` (sólo lo del nivel
  «todos», «La lectura de la tarjeta (4.18-1)») y los montos con `cotizacion_leer`, y `validar_plantilla` rechaza un nodo que no sea del
  nivel «todos». El primer resultado de la aprobada (`totales.usd`) viaja a todo el que ve la cotización: es lo que la tarjeta del total dibuja a «todos». Un inventario (`cotizaciones-visibilidad.sql`) registra toda función que pueda devolver esas columnas o `formulas.*`.
- **Límite:** un nodo restringido, único oculto de una suma visible, se deduce restando; el editor del diseño lo avisa.
- **Pantalla:** `/configuracion/cotizacion/general/niveles` (`docs/UX.md`). `niveles_con_uso()` devuelve `{tope, niveles}` con
  banderas `se_renombra`, `se_retira`, `se_elimina` y `motivo_de_uso`: la UI no razona por nombre ni clave. En TS los permisos de un
  nivel se reconocen por su forma (`esClaveDeNivel()`), no están en `CLAVES_PERMISO`.

### En la base

- **La tabla** `cotizaciones_niveles (id, clave, nombre, retirado_en, …)`. La clave sale del nombre y no cambia; **no se desambigua**
  (clave existente, viva o retirada: 23505). **Tope: 10 niveles** con «todos» y los retirados. Se escribe sólo por RPC.
- **Los permisos** `cotizaciones.nivel.<clave>.ver|editar` (`permisos.nivel_clave`, `por_origen`, `aplicado_en` = `_nodos_visibles`)
  nacen con el nivel, concedidos al rol `dueno`; los ata un check (`permisos_nivel_check`), una FK `on delete restrict` y un trigger
  diferido (`trg_nivel_con_permisos`).
- **RPC** (`equipo.roles.gestionar`; `search_path` vacío): `nivel_crear(p_id, p_nombre)` (idempotente por id), `nivel_renombrar`,
  `nivel_retirar` (deja de ofrecerse; permisos y usos siguen), `nivel_restaurar`, `nivel_eliminar` (`for update` **antes** de mirar el
  uso; con uso, 23503 `nivel_en_uso`); los de cambio llevan `p_actualizado_en_esperado`. Publicar toma `for key share` los niveles del
  diseño. **Invariante:** ninguna versión publicada o archivada nombra un nivel que no existe.
- **`_nodos_visibles(formula_id)`** → `(nodo, editar)` (de nadie): **un nivel sólo estrecha.** Se ve un nodo de `ver: todos` con
  `cotizaciones.ver` del origen, y uno de `ver: X` con `cotizaciones.ver` **y** `cotizaciones.nivel.X.ver`; se edita lo que se ve con
  `cotizaciones.crear`/`cotizaciones.editar` y, si `editar` no es «todos», `cotizaciones.nivel.Y.editar` (`editar` nulo no se edita).
  Lo que la visibilidad no nombra sólo llega a `cotizaciones.configurar`, sin editar. Usa los permisos **reales** (`mis_permisos()`):
  «Ver como» no cambia lo que decide la base.

### En la base

La lectura de una cotización: lo que quien llama no ve no viaja (`supabase/tests/cotizaciones-visibilidad.sql`).

- **Ninguna lectura directa del snapshot:** `authenticated` y `anon` no leen `cotizaciones.valores|fuentes|totales|tipos_cambio` ni
  `cotizaciones_revisiones.diff` (grant de columnas; una columna nueva nace sin grant); `total_base`, `modo_tc`, `ver_total_bs`,
  `titulo`… sí. `cotizacion_auditar()` quita esas columnas de `actividad`.
- **El recorte** (`_cotizacion_contexto`, `_cotizacion_recorte`): `valores`, `estados`, `fuentes`: los nodos de `_nodos_visibles` y
  siempre el total y lo `aparte`. `totales`: `bs`, `usd`, `suma_usd` siempre; un grupo sólo si se ven **todos** sus nodos, y su `bs` sólo
  si ningún tipo de cambio de la fórmula está restringido por un nivel que quien lee no tiene. `tipos_cambio`: todos salvo los de un
  nodo restringido. `faltantes`: los de nodos visibles, `total` o un grupo que viaja; los demás sólo marcan `hay_faltantes_ocultos`.
- **`cotizacion_leer(id)`**: `puede_cotizacion(id, 'cotizaciones.ver')` (inexistente, en la papelera o no vista dan el mismo 42501),
  `_nodos_visibles` de SU versión y el recorte.
- **`cotizacion_evaluar`** devuelve lo recortado y **no es un oráculo:** un `input` o `bandera` oculta da el mismo error que uno
  inexistente; un override de un nodo oculto vuelve como `nodo_inexistente`. Quien no configura el origen sólo elige uno de los
  `cabecera.modos` de esa versión.
- **`cotizacion_revisiones(cotización, antes?, tamaño?, hasta?)`:** página por cursor; `hasta` (instante exclusivo) la empieza en la más
  nueva con `creado_en < hasta` (`cotizaciones_revisiones_cotizacion_creado_idx`; sin ninguna, vacía; la guarda va primero). Cada `diff`
  va recortado, cada fila con su `autor` (`{id, nombre}`) y la página con las `etiquetas` de los nodos y grupos que nombran sus diffs ya
  recortados.
- **`formula_para_cotizar(origen)`** y la lectura de `formulas`: sólo con `cotizaciones.configurar`.
- **`cotizacion_tabla(clave, cotización | origen, abierta?)`:** sólo las columnas que leen los nodos que quien llama ve, de SU versión: la
  de la cotización, la de la hoja abierta o la publicada.

### Quién escribe una cotización y cómo

**Nadie escribe `cotizaciones` ni `cotizaciones_revisiones` con `insert`, `update` o `delete`:** `authenticated`, `anon` y PUBLIC no
tienen privilegio de escritura y no hay policies de crear ni editar. Escriben, con `security definer`: `cotizacion_crear()`,
`cotizacion_guardar()`, `cotizacion_encima()`, `cotizacion_marcar_final()`, `cotizacion_moderar()`, la papelera y los triggers
`cotizacion_revision()` (la única escritura de `cotizaciones_revisiones`), `cotizacion_contadores()` y `cotizacion_auditar()`. `cotizacion_aprobar()` no escribe `cotizaciones`: escribe `cotizaciones_aprobadas`
(«La cotización aprobada»).

**`cotizacion_crear(id, origen, lead, entradas, abierta, vehículo?, vehículo_nuevo?, modo_tc?, clase = 'preventa', con_la_abierta =
false, ver_total_bs = false, titulo = null, titulo_manual = false)`** calcula en la base sobre la fórmula publicada del origen y devuelve `{cotizacion, valores, fuentes,
totales, tipos_cambio, repetido}`, recortado por `_cotizacion_respuesta()` (el recorte de `cotizacion_leer()`). En este orden:

1. `cotizaciones.crear` y `cotizaciones.ver` **del origen de la cotización** antes de mirar nada; con una final, además
   `cotizaciones.final.gestionar`.
2. **El intento** (`p_id`, lo manda el cliente): un candado consultivo por id ordena dos llamadas a la vez; si el id existe y es **mío,
   de este origen y de una cotización viva**, se devuelve con `repetido: true`; un id ajeno no se mira (42501 en el `insert`, para no
   servir de sonda). Después se lee la hoja abierta («La hoja abierta (4.13-3a)»).
3. **El lead es obligatorio** (22023 `lead`, el primero que se mira) salvo con `cotizaciones.crear.sin_lead` de ese origen, y nunca en una final; con uno, tiene que verlo quien llama (`leads.ver`); se bloquea con `for key share`. Una final pide además el lead en
   la cartera con `leads.editar` y lo toma `for no key update`.
4. **El vehículo:** obligatorio (22023 `vehiculo`) salvo con `cotizaciones.crear.sin_vehiculo` de ese origen, y siempre en una final.
   `p_vehiculo_nuevo` llama a `vehiculo_crear()` en la misma transacción (la pantalla no lo usa: «Cargar a mano» crea el vehículo antes).
   Uno que quien llama no ve: 42501.
   4b. **El título** (después del lead y del vehículo): manual si `p_titulo` trae texto (`btrim`) y `p_titulo_manual` lo pide —sin vehículo no hay
   automático, así que el texto que llega es manual—; más de 120 puntos de código, 22023 `detail titulo_largo` `hint titulo`. Si no, el
   **automático**: el título del vehículo, `nullif(btrim(left(btrim(titulo), 120)), '')`. Sin vehículo y sin título, 22023 `hint titulo`
   («Escribe el título de la cotización.»).
5. **La fórmula** publicada, `for share` (publicar espera a las altas en curso; si publicaron, se relee: tres vueltas y PT409).
6. **El modo** (`p_modo_tc`): nulo o la `clave` de un modo de esa versión (`modo_invalido`). Y **«Ver total Bs»** (`p_ver_total_bs`):
   `_cotizacion_ver_total_bs()` rechaza (22023) un nulo (`ver_total_bs_falta`) y un verdadero que `diseno.cabecera.ver_total_bs` de la
   versión que se usa no ofrece (`ver_total_bs_no_ofrecido`); con «Guardar con la N» vale la versión abierta.
7. **Lo tipeado**, con `_cotizacion_tipeado()` (de nadie; el mismo chequeo que el motor, compartido por evaluar, crear y guardar): un
   valor para un nodo que se ve y no se edita → 42501 `nodo_no_editable`; un override de un nodo oculto o inexistente →
   `nodo_inexistente`; sin variante y sin `por_defecto`, `variante_sin_eleccion`.
8. **El cálculo.** Un override que el motor descarta en un nodo visible se rechaza (22023). Se guardan `valores` y `fuentes`
   **enteros** (los nodos que quien llama no ve, y los que no mandó, con el valor de la fórmula), `totales`, `modo_tc` y `tipos_cambio`
   (las tarifas de la empresa que usó). **`total_base` es el total en la moneda base de la empresa** (`USD` o `BOB`, otra → 22023; sin
   valor, `total_sin_valor`; si no cabe en `numeric(18,2)`, `fuera_de_rango`).
9. **El `insert`:** el índice único `cotizaciones_final_por_vehiculo` da 23505. Una final: «Crear una final».

Candados: intento, lead, vehículo, fórmula; una final, además el lead `for no key update` y, después del cálculo, las vivas del vehículo.
«Desactualizada» vive en `cotizacion_crear()`: «Cómo se guarda (4.10-3)».

### Cómo se guarda

**`cotizacion_guardar(id, intento, actualizado_en_esperado, entradas, modo_tc, titulo, notas, vehículo, ver_total_bs, titulo_manual = null)`** es la única
edición: calcula en la base con SU versión de la fórmula (nunca la publicada de hoy) y SUS tipos de cambio congelados, conserva lo que
quien guarda no ve ni edita, y devuelve lo mismo que crear. Recibe el **estado entero de lo que la persona edita** (`modo_tc`, `titulo`,
`notas`, `vehículo` y `ver_total_bs` sin valor por omisión: nulo es un valor, salvo en `ver_total_bs`, donde nulo es
`ver_total_bs_falta`; el vehículo es el de la hoja: el guardado o el elegido en una preventa); lo que no manda en `entradas` queda sin tipear (↺). Se edita `modo_tc` (clave de un modo de SU versión, o nulo),
`ver_total_bs` (verdadero sólo si el diseño de SU versión lo ofrece; también en una final), `titulo` y `titulo_manual` (manual si `titulo` trae
texto y `titulo_manual` no es falso —nulo, el de las llamadas viejas, es «manual si trae texto»; sin vehículo el texto es manual—, hasta 120:
`titulo_largo`; si no, el del vehículo que queda, rehecho en cada guardado; sin vehículo y sin título, 22023 `hint titulo`; `titulo_manual` entra
en la huella del intento y en «nada cambió»), `notas` (hasta 2.000) y
`vehiculo_id` (poner o **cambiar**, no se quita; **una final no lo cambia**). No se editan `tipos_cambio` (se congelan al crear), `clase`,
`lead_id`, `plantilla_id` ni `moneda_mostrar`.

**En este orden** (cada error igual para lo que no existe y para lo que no se ve): (1) **permiso** (`_cotizacion_puede_guardar()`, antes
y después del candado): una preventa pide `cotizaciones.ver` **y** `cotizaciones.editar` (`puede_cotizacion`, por su alcance); una
**final**, `cotizaciones.ver` y `cotizaciones.final.gestionar` del origen; inexistente, en la papelera o no vista: 42501, antes del
vehículo, del candado, del intento y de la versión; (2) candados, **intento**, **versión** y validación de título, notas, vehículo y modo;
(3) **armar con SU versión** (`_cotizacion_armar`), `_cotizacion_tipeado()` y `_cotizacion_conservar()`; (4) `evaluar_formula()` y
`_cotizacion_guardable()`: un override **mandado** que el motor descarta, o un total sin valor o que no cabe, se rechaza (22023); (5) si
nada cambió, no escribe.

**Lo que se conserva y lo que se recalcula (D7).** Lo que quien llama no edita (nodo que no ve, o ve y no edita) se **reconstruye de
`valores` y `fuentes`** guardados (`_cotizacion_entradas_de()`) antes del motor: lo oculto se conserva byte a byte; un valor mandado
para un nodo que se ve y no se edita, distinto de lo guardado, es 42501 `nodo_no_editable`. Lo derivado (fuente `sugerido`/`default`,
el `pct` pisado, nodos apagados) se recalcula: **límite aceptado**, lo oculto que se deriva de lo visible cambia con lo visible.

**El intento.** `p_intento` es un uuid que genera el cliente por cada guardado; vive en la revisión (`cotizaciones_revisiones.intento`
con la `huella`). Repetirlo, de la misma persona y con los mismos datos, devuelve lo guardado con `repetido: true` y **no cae en
PT409**; el mismo intento con otros datos u otra persona es 22023 `intento_reusado`. **Ni `intento` ni `huella` se leen.**

**La versión.** `cotizaciones.actualizado_en` la sella `cotizacion_version()` y **no se mueve con los contadores de favoritos y
reportes**. Vieja: `_conflicto_de_edicion()` (PT409 diciendo quién y cuándo). La revisión (`cotizacion_revision()`) guarda **sólo los
nodos que cambiaron** (`{de, a}`) en `valores` y `fuentes`, y en `totales` **sólo las claves que cambiaron**, con cada grupo de `grupos`
entero si cambió. Al leerla, `_cotizacion_diff_recortado()` recorta los dos lados y saca el grupo que quedó igual y un `grupos` vacío: un
grupo visible cuyo único cambio es su Bs oculto, o un grupo oculto que se movió, no se delata.

**«Desactualizada», en el alta.** Aplica a guardar una cotización **nueva** (editar una vieja no avisa): vive en `cotizacion_crear()`,
que recibe la hoja abierta (`p_abierta`). Si la versión publicada de hoy es otra (se compara **por id**) o una tarifa que la fórmula
nombra cambió (`tipos_cambio_historial`): **PT409, `detail desactualizada`, `hint formula` o `tipo_cambio`**, sin guardar. **«Guardar con
la N»** es `p_con_la_abierta := true`: se crea con la versión de la apertura y las tarifas de entonces, sólo si la hoja se abrió hace menos
de 24 h y, si esa versión ya no es la publicada, dejó de serlo hace menos de 24 h. El intento repetido vuelve antes.

**Candados.** Guardar toma **el vehículo actual y el nuevo (sólo si cambia), `for key share`, en orden de id, y después la cotización
`for no key update`**; ni el lead ni la fórmula (`formulas` es append-only).

### La lectura que abre la hoja

**`cotizacion_hoja(origen)`** es UNA lectura al abrir la pantalla de cotizar: el diseño publicado **recortado al nivel de quien mira** y
lo que la hoja necesita para dibujarse. No lee `cotizaciones` ni el snapshot. **Orden:** el permiso **antes de mirar nada** (`cotizaciones.crear`
y `cotizaciones.ver` del origen); sin versión publicada, `{estado: 'sin_publicar', origen, puede_configurar}`; con ella, `{estado: 'lista',
formula: {id, version}, abierta_en, abierta, cabecera, secciones, tarjeta_total, tonos}`. La `cabecera` es `{modos,
ver_total_bs, moneda_bs, ajustes}` más su aspecto y, sólo si el diseño las trae, `modo_por_defecto`, `ver_total_bs_por_defecto` y
`modos_visibles` (las copia tal cual: la hoja calcula lo efectivo).

- **`cabecera.ajustes` (el ⚙ de la cabecera):** `cotizaciones.configurar` del origen **y** al menos un modo. La base decide quién lo ve,
  como el `ajustes` de cada celda; la hoja no mira permisos. Una cotización nueva abre con el modo por defecto (`modoInicial()`: el modo por
  defecto o el primero) y con «Ver total» por defecto si la hoja lo ofrece (`verTotalBsAlAbrir()`); una guardada, con lo suyo. El
  encabezado dibuja los modos visibles más el elegido (`modosDelEncabezado()`).

- **`cabecera.moneda_bs`:** la `moneda_a` del tipo de cambio **activo** que nombra el `total_en` de esa versión (una fila por
  `tipos_cambio_clave_key`); JSON `null`, con la clave presente, si la versión no tiene `total_en` o ese tipo de cambio no existe o está
  inactivo. Viaja a todos, sin recorte por nivel (el total en Bs ya viaja siempre y `authenticated` lee `tipos_cambio`), nunca con el id ni
  la clave del nodo o del tipo de cambio. **Nula no quiere decir sin Bs:** el motor calcula el Bs con el tipo de cambio de cada bucket y
  usa `total_en` sólo para sacar los dólares (`oficina` no tiene `total_en` y su `totales.bs` tiene valor); con ella nula la hoja no dibuja
  «Ver total Bs» y guarda `ver_total_bs` en falso.
- Un ítem viaja si su nodo es visible (su `pct`, en un par); una sección, si le queda algún ítem. **Nunca viaja:** `de`, `texto`,
  `match` (salvo `dato_del_vehiculo`), `sobre`, `sugerido_de`, `descripcion`, los grupos, ni los `buckets` y `total_en` de un modo.
- **`dato_del_vehiculo`:** la celda de un nodo `tabla` que se ve lleva `{tabla, columnas: [{columna, campo}]}` —qué columna de su tabla
  casa con qué dato del vehículo— si alguna entrada de su `match` lo nombra; si no, no trae la clave. Cuenta una entrada cuyo valor **no es
  el id de ningún nodo** (aunque coincida con la clave de un campo: el motor lee el nodo) y es `anio`, `marca`, `modelo`, `kilometraje`,
  `precio` o un campo **activo** del origen de la hoja; un `campo_vehiculo` no cuenta. La tabla, congelada en la versión o viva y activa (la
  regla de la ayuda). `columnas` va por `columna` con `collate "C"`. Lo arma `_hoja_datos_del_vehiculo()` (invoker, de nadie) una vez por
  lectura. **El contrato son las filas:** `cotizacion_tabla()` con la hoja abierta las da con su `columna`; `columnas` puede venir vacío
  (congelada sin viva activa) y `filas` también (tabla vacía: el motor da `tabla_sin_filas` y la pantalla lo dice).
- **Una celda** lleva `nodo`, `etiqueta`, `tipo_nodo`, `formato`, `ancho`, `tono`, `editable`, `motivo`, `ajustes`, `ayuda`,
  `dato_del_vehiculo`, `solo_en` y `condicion`/`requerido_si` **sólo si su bandera se ve**. **`editable`:** `editar` de `_nodos_visibles()`
  **y** que el nodo acepte un valor. **`ayuda`:** la tabla (si existe y se lee) o `{texto, enlaces?}`; los enlaces viajan con su celda y la
  hoja vuelve a exigir `URL_DE_ENLACE` antes de dibujar un `href`. **`motivo`** (lo que no se edita): `se_calcula`, `del_vehiculo`, `nivel`
  (con el **nombre** del nivel que falta) o `no_se_edita`. **`ajustes` (⚙):** una constante con `cotizaciones.configurar` del origen, o un tipo de cambio con
  `empresa.tipos_cambio.gestionar`.
- **El modo por clave:** la hoja recibe los modos sin sus `buckets`; `cotizacion_evaluar(…, p_modo_tc)` acepta la clave de un modo de esa
  versión (`_cotizacion_modo()`; ajena: `modo_invalido`). `p_modo` (objeto) sigue para el editor.

### La hoja abierta

`cotizacion_hoja()` devuelve `abierta`: `<fórmula>.<µs desde 1970>.<huella>.<HMAC-SHA256 en hex>`, que cubre la persona, el origen, la
versión, la hora de apertura y la **huella de las tarifas** (clave en Vault, `cotizacion:abierta`). Para la pantalla es un texto opaco que
devuelve en cada recálculo y guardado. Inválida (nula, mal formada, de otra persona u origen, firma mala): 22023 `abierta_invalida`, siempre
el mismo texto.

- **La huella de las tarifas** (`_cotizacion_huella_tarifas()`): `md5` de los tipos de cambio que nombra la versión (activos o no) con su
  valor a la hora de apertura según `tipos_cambio_historial`; uno sin valor a esa hora no entra. `cambiado_en` es la hora del comienzo de la
  transacción que cambió la tarifa: la huella es lo que la hoja vio, no lo que el historial dice después.
- **`cotizacion_crear`:** la lee después del intento. Si su versión no es la publicada: PT409 `desactualizada`, o con `p_con_la_abierta`
  la valida y la toma `for share`; con `p_con_la_abierta` el tope de 24 h corre **siempre**. Después de armar, si la huella de las tarifas
  de la apertura no es la firmada (un cambio confirmó después de abrir la hoja con un `cambiado_en` anterior): PT409 `desactualizada`
  (`tipo_cambio`), o con `p_con_la_abierta` 22023 `abierta_tarifas` (`hint abierta`: recargar).
- **`cotizacion_evaluar` (por origen):** calcula con **la versión y las tarifas de la abierta**. Si ya no se puede usar,
  `abierta_vencida` y la hoja pide «Recargar» (de otro origen, borrador o inexistente: `abierta_no_disponible`).
- **`cotizacion_tabla` (por origen):** la tabla de una ayuda sale de **la versión de la abierta** (su definición, su copia congelada y lo
  que deja ver); los mismos errores que el recálculo y `llamada_invalida` con una cotización. La resuelve `_cotizacion_tabla_version()`
  (de nadie).
- **Cotizar pide `cotizaciones.crear` y `cotizaciones.ver` del origen** en `cotizacion_hoja`, `cotizacion_evaluar` y `cotizacion_tabla`
  por origen y en `cotizacion_crear`; `cotizacion_guardar` pide `cotizaciones.ver` y `cotizaciones.editar`.

### La hoja de una guardada y cotizar encima

`cotizacion_hoja_guardada(p_id)` abre una cotización guardada para quien **la ve** (lo que no existe, está en la papelera o no se ve: el
42501 de `cotizacion_leer`; antes, `assert_activo()`). Devuelve:

- la fila y el snapshot recortados (`_cotizacion_respuesta`, como `cotizacion_leer`) y el diseño de **SU versión** (`_cotizacion_hoja`,
  como la hoja nueva);
- `puede_guardar` = `_cotizacion_puede_guardar()`: sin él, **ninguna** celda es editable y el motivo no es un nivel (`no_se_edita`); con
  él, se edita lo que `_nodos_visibles()` deja, como en `cotizacion_guardar`. Quien sólo ve abre el diseño en sólo lectura;
- `publicada: {id, version}` (la de hoy del origen, o nula), `vence_el` y `vencida`: el día de `creado_en` en la zona de la empresa +
  `ajustes_empresa.vigencia_dias`, vencida si ese día ya pasó (por día, no por hora);
- `anterior: {id, numero, version}` si se ve; `encima`, la versión nueva viva: `{id, numero, version}` si se ve, `{"oculta": true}` si no;
- `puede_cotizar_encima`: `cotizaciones.crear` del origen, ve su lead (o no lleva y tiene `cotizaciones.crear.sin_lead`), ve su vehículo (o no lleva y tiene `cotizaciones.crear.sin_vehiculo`), sin versión nueva
  viva y con publicada.

`cotizacion_encima(p_id, p_anterior)` crea **en el acto** la versión nueva: otra cotización, preventa (también encima de una final), con
`cotizacion_padre_id` = la anterior, `version` + 1, su propio número, el lead y el vehículo de la anterior, quien llama como `creado_por`,
la publicada y las tarifas de hoy. La anterior no cambia. **Una viva por anterior** (`cotizaciones_encima_unica`, parcial: una en la
papelera no cuenta). Sin `p_abierta` (no sale de una hoja vista).

- **El orden y los errores:** `assert_activo`; ver la anterior (lo que no existe, está en la papelera o no se ve: el 42501 de
  `cotizacion_leer`, antes que todo lo demás); `cotizaciones.crear` y `ver` del origen; su lead (nulo sin `cotizaciones.crear.sin_lead` del origen: 22023 `lead`; no visible: 42501);
  el intento (el candado de `cotizacion_crear`: repetido devuelve la misma; mío con otra anterior: 22023 `intento_reusado`); el lead y el
  vehículo de la anterior `for key share` y después la anterior `for share` (lead → vehículo → cotización; si su lead o su vehículo cambió
  mientras esperaba, se vuelven a tomar), otra vez visible; ya tiene una nueva viva: PT409 `ya_tiene_encima` (el id en el hint sólo a quien
  la ve); el lead y el vehículo otra vez visibles (o 22023 `vehiculo` si no lleva y falta `cotizaciones.crear.sin_vehiculo`); la publicada `for share`; el total (22023
  `total_sin_valor`: no se crea).
- **Lo que se lleva** (`_cotizacion_lo_que_se_lleva`): lo tipeado de cada nodo que sigue en la versión de hoy con un tipo que lo acepta,
  **también lo que quien llama no ve** (se guarda y no se le devuelve); la variante sólo si es opción de hoy; el modo si sigue (si no, el
  primero de hoy); «Ver total Bs» si hoy se ofrece; título y notas.
- **`descartados`** (`_cotizacion_descartados`): cuántas entradas tipeadas de la anterior que quien llama **ve** no llegan (no siguen, no
  se aceptan, la variante, un override que el motor descarta). Lo oculto que se pierde no se cuenta.

**La pantalla, `/cotizaciones/[id]`.** La hoja calcula por su origen (la nueva) o por su cotización (`DeDondeCalcula`): la guardada manda
`p_entradas`, `p_cotizacion` y `p_modo_tc` (y `p_vehiculo` sólo con otro vehículo elegido, abajo), nunca `p_origen` ni `p_abierta`. Abre con lo guardado como sus entradas
(`entradasDeLoGuardado`, espejo de `_cotizacion_entradas_de`: lo tipeado y los overrides, sin el porcentaje de un par pisado) y con
**una** llamada a `cotizacion_hoja_guardada` y otra a `cotizacion_evaluar(p_cotizacion)`. El recálculo usa las tablas **vivas** y los datos
de hoy del vehículo: si no da lo guardado (valores o total, `difiereAlAbrir`), la pantalla lo avisa, muestra «Total guardado» con
`<Monto>` y «Guardar» la deja con lo de hoy. «Guardar» llama a `cotizacion_guardar` con la versión que vio quien edita (`actualizadoEn`
como el texto de la base, nunca por `Date`, que pierde los microsegundos), las entradas del recálculo al día, el título, las notas sin tocar y el
vehículo de la hoja; lo que la hoja no manda lo conserva la base. El PT409 dice quién y cuándo; «Recargar» vuelve a montar la hoja con
la lectura nueva y lo tipeado no vuelve sobre la versión de la otra persona.

**Cambiar el vehículo de una preventa guardada.** Quien la puede guardar (`puede_guardar`) elige otro vehículo en el panel de cotizar y lo elegido vive
en `?vehiculo=`. El servidor hace el primer cálculo con él: `cotizacion_evaluar(p_cotizacion, p_vehiculo)` usa los datos del vehículo nuevo
(`campo_vehiculo`, las tablas que casan por un dato del vehículo) con SU versión y SUS tipos de cambio, sin escribir; una final con otro vehículo es
`llamada_invalida` (`hint p_vehiculo`) y uno que no se ve, en la papelera o de otro origen se rechaza: la página calcula con el suyo y dice «No se
puede usar ese vehículo.». Elegir otro vuelve a montar la hoja (lo tipeado vuelve con el borrador); con otro vehículo no se dice «Lo de hoy no es lo
guardado» (no es cierto: cambió el vehículo), sólo «Total guardado» si el total es otro. Cambiar el vehículo es un cambio que guardar: `cotizacion_guardar(…,
p_vehiculo)` rehace el título automático con el nuevo (un manual se respeta), mueve `vehiculos.cotizado_en` y deja `diff.vehiculo_id = {de, a}`; la
revisión se dice «Cambió el vehículo: A → B» con los títulos **resueltos al leer** (por clave primaria de `vehiculos`, con la RLS de quien mira; lo que no
ve, o está en la papelera, es «un vehículo que no puedes ver»): nunca se copia un título a la revisión. Guardado, `?vehiculo=` sale de la URL sin ir al
servidor; «Recargar» lo suelta siempre (lo elegido no vuelve sobre otra versión).

### Marcar final

**`cotizacion_marcar_final(id)`** elige la final del vehículo (a lo sumo una activa, `cotizaciones_final_por_vehiculo`). En este orden:

1. **Sin candado:** la cotización viva y visible (si no, 42501 «No tienes acceso a esta cotización.», igual para inexistente o en la
   papelera), `cotizaciones.final.gestionar` del origen, el vehículo, el lead (vivo; en la papelera, 23514), el lead en la cartera con
   `leads.editar` (como vincular), y que quien marca pueda mandar a la papelera todas las demás vivas del vehículo (si no, 42501 «Este
   vehículo tiene preventas que no puedes mandar…»).
2. **Candados:** el lead `for no key update`, el vehículo `for key share` y, en una sola pasada por id, la cotización y todas las vivas del
   vehículo. El vehículo se escribe recién con todo tomado. Es el orden de vincular (lead → vehículo) y de la papelera de vehículos
   (vehículo → cotizaciones), y convive con el trigger `trg_vehiculo_cotizado` de crear, encima y guardar.
3. **Si algo cambió mientras esperaba** (la fila ya no está viva, otro vehículo u otro lead), otra vuelta desde el paso 1; a la tercera,
   PT409. Con todo tomado vuelve a mirar el lead, ver, las demás y el vínculo, releído después de la pasada: un vehículo de otro lead da 23514.
4. **Los efectos** (`_final_aplicar`): la final anterior tomada baja a preventa, la cotización pasa a final, las preventas tomadas van a un
   lote de la papelera de quien marca, el vehículo sin lead queda con el de la cotización, el lead pasa al primer tipo activo de la clase
   cliente (por orden y nombre) si no era de esa clase, y la actividad `cotizacion.final`. Marcar otra vez no falla ni cambia nada.

Una final activa ancla el vehículo en la limpieza automática (`'cotizacion_final'`), su vínculo no cambia (`vehiculo_vincular`: 23514) y,
aun sin lead, el vehículo no va a la papelera (`_vehiculo_motivo_de_bloqueo`: 23514).

### Crear una final

`cotizacion_crear(…, p_clase := 'final')` deja el estado de marcarla. Sin candado mira la final sin vehículo (22023), el lead en la
cartera con `leads.editar`, que vea el vehículo y, en `_final_crear_mirar` (de nadie, sin candados), otra final activa (23505: se
rechaza, no se reemplaza como al marcar), las preventas que no puede mandar a la papelera (42501) y el vínculo de otro lead (23514). Toma
el lead `for no key update`, el vehículo `for key share`, la fórmula y, después del cálculo, las vivas del vehículo en una pasada por id;
con todo tomado vuelve a mirar la cartera y la ayudante (el vínculo, en una sentencia nueva). Inserta y aplica `_final_aplicar`. No hay
otra vuelta: lo que crear toma son sus parámetros. La preventa no cambia.

## Cotizaciones hermanas (la variante en par)

Con una variante `en_par` (glosario: «Variante en par» y «Cotizaciones hermanas») la hoja cotiza las dos opciones a la vez y guardar crea dos cotizaciones, una por
opción, que se apuntan por `hermana_id`.

- **Qué nodos van en par** (`nodosEnPar()` de `entities/en-par.ts`, espejo de `_nodos_en_par()`, con el juego `casos-de-en-par.json`): regla estática, sin
  evaluar, en una pasada por el orden de la lista: un nodo va en par si tiene `solo_en` o si algo que nombra (`referenciasDe()`) es la variante o un nodo que ya va;
  la variante y los tipos de cambio nunca. La forma de la hoja no cambia al tipear.
- **La lectura** (`_cotizacion_hoja`): `par` (`{nodo, etiqueta, opciones: [{clave, etiqueta}, …]}`, a todo el que abre aunque su nivel esconda la variante: es
  configuración) y `en_par: true` en cada celda y subtotal que va en par; el ítem de la variante no viaja. La guardada suma `par.opcion` (la de esa cotización) y
  `hermana` (`{id, disponible, actualizado_en, puede_guardar}`; disponible si se ve, está viva y no es `invalida`; si no, sólo `{id, disponible: false}`).
- **Calcular**: `cotizacion_evaluar(…, p_opcion)` pone la opción de cada columna de la hoja nueva (la base, no la persona: un nivel que esconde la variante cotiza
  igual); una guardada calcula con la suya. Mandar `variante` en una versión en par es `variante_en_par`; `p_opcion` sin par, `sin_par`; una que no es del par,
  `opcion_invalida`; con `p_cotizacion`, `llamada_invalida`.
- **Crear** (`cotizacion_crear_en_par(p_ids, …, p_entradas[2], …)`): los dos ids del cliente como intento (candados en orden de id; dos mías, vivas y hermanas
  vuelven con `repetido`; una sola, `intento_reusado`); `cotizacion_crear` una vez por opción con el ajuste de la transacción `importadora.en_par` (la opción por
  su posición, la hermana y, la segunda, la hora de la primera + 1 µs: así la de la primera opción nace **aprobada** si el vehículo no tenía y quedan juntas en
  toda lista). «Desactualizada» y «Guardar con la N» fallan en la primera, para las dos. `cotizacion_crear` sobre una versión en par sin ese ajuste es
  `cotizar_en_par`.
- **Guardar** (`cotizacion_guardar_en_par(p_ids, p_intentos, p_actualizados_en_esperados, p_entradas[2], …, p_notas[2], …)`): permiso de las dos y que sean
  hermanas (`no_son_hermanas`) antes de los candados; los vehículos y después las dos cotizaciones en orden de id; `cotizacion_guardar` para cada una: si una
  cambió, PT409 con su id en el `hint` y no se guarda ninguna; la que no cambió no se reescribe (como siempre). Cambiar el vehículo cambia el de las dos. Guardar
  **suelta** una hermana (la otra no está disponible) no cambia el vehículo (`vehiculo_de_la_hermana`).
- **El título**: el cliente manda el título sin la opción y la base guarda «<título> · <etiqueta>» en toda versión en par (el manual tiene el tope
  `120 − largo(« · <etiqueta>»)`; el automático es el del vehículo cortado para que quepa).
- **El invariante** (`trg_cotizaciones_hermanas`, diferido): la hermana existe, apunta de vuelta y comparte lead, vehículo, origen y versión (23514). La versión
  y las revisiones no miran `hermana_id`.
- **Cotizar encima** (`cotizacion_encima_en_par`): el par nuevo en el acto, cada una encima de su hermana de antes y con la opción de su misma posición en el par de
  hoy (`puede_cotizar_encima_en_par`). Sin par hoy o sin la hermana, el `cotizacion_encima` de siempre.
- **La papelera**: enviar una manda su hermana viva al mismo lote (sin versión; si quien envía no puede, queda viva y va en `rechazados`); restaurar o purgar sólo
  algunas del lote suma su hermana del mismo lote. **Marcar final** una manda la otra a la papelera con las demás preventas del vehículo.
- **La pantalla**: la guardada de una hermana abre las dos juntas (`modoDeLaHermana()`: la hermana disponible y el mismo permiso de guardar) y guardar cualquiera
  guarda las dos; si no, sola con «La de <etiqueta> no está disponible.». La vista previa y el PDF llevan las dos tarjetas (una página A4 por tarjeta), y
  «Compartir», los conceptos y el total de cada opción y las dos portadas apiladas en una imagen.

## Lo que se guarda en una cotización

`formula_id` (recalcular o editar usa **esa** versión, nunca la vigente); `valores` (`{nodo_id: número | null}` de TODOS los nodos; el
`opcion` guarda su clave; un nodo fuera de variante o apagado guarda 0); `fuentes` (`{nodo_id: default|sugerido|override|input}`);
`tipos_cambio` (`{clave: valor}` congelados); `totales` (por moneda y por grupo); `titulo` (el **título de la cotización**, hasta 120) y
`titulo_manual` (si lo escribió una persona; si no, es el del vehículo y la base lo rehace en cada guardado; las que ya tenían título antes de la
columna quedaron manuales); `tarjeta_retoques` (los **retoques de la tarjeta**: textos y filas ocultas sólo de esta cotización; nula, la tarjeta tal
cual la plantilla; «Retoques de la tarjeta», abajo); `hermana_id` (la **cotización hermana** de una variante en par; nula si no tiene; purgar una la pone en
nulo en la otra sin mover su versión). **Nada se lee directo** (sale por `cotizacion_leer()`,
recortado por el nivel; `total_base`, `modo_tc`, `ver_total_bs`, `titulo`, `titulo_manual`, `tarjeta_retoques` y `hermana_id` sí son legibles) **ni se escribe directo**: se
crea con `cotizacion_crear()`, se edita con `cotizacion_guardar()` y se retoca con `cotizacion_retocar_tarjeta()`.

## Binding con la XCell

Cada `input`, `constante`, `tipo_cambio` y nodo `sobrescribible` es una `XCell` (el par es una sola): `value` de `valores[id]`,
`suggested` de `fuentes[id] === 'sugerido'`, `overridden` de `'override'`, `disabledReason` si su `condicion` está apagada o es de otra
variante, y ⚙ (`hasSettings`/`onSettings(id)`) si es `constante` con `cotizaciones.configurar` del origen (→ `formula_cambiar_constante`)
o `tipo_cambio` con `empresa.tipos_cambio.gestionar` (→ `tipo_cambio_guardar`). El ⚙ cambia el default global (N+1); «Aplicar también a
esta cotización» es el único puente hacia la abierta.

La celda (`src/shared/ui/xcell/CLAUDE.md`) no valida rango, obligatorio ni entero (lo dice la base en `faltantes`), no decide permisos ni
abre nada: **la hoja traduce** (editar el % quita el override del monto; ↺ quita los dos) y pasa los mismos callbacks a todas las celdas.

En `/cotizaciones/[id]` se dibujan además «Revisiones» (`cotizacion_revisiones`, de a 20 por cursor), la cadena (`anterior`, `encima`) y
«Cotizar encima» (`cotizacion_encima`, con un intento que sólo se conserva tras una pérdida); el botón sale con `puede_cotizar_encima`, no
con `puede()`, y con cambios sin guardar espera, porque la nueva lleva lo guardado.

### La hoja dibujada y el recálculo

`/cotizaciones/nuevo?origen=&lead=&vehiculo=`. **Una lectura y un cálculo al abrir, en el servidor, en serie** (`cotizacion_hoja` y
después `cotizacion_evaluar` con entradas vacías y su hoja abierta); el navegador no pide nada al abrir. Después, **un pedido por pausa,
desde el navegador** (`infra/recalculo.client.ts`). Tope de nodos del DOM de la hoja más grande: **460** (`docs/RENDIMIENTO.md`).

- **La cola (`useRecalculo()`):** cada confirmación (la `XCell` no emite por tecla) reinicia una espera de 150 ms; al vencer sale UN
  pedido; con uno en vuelo queda uno pendiente con lo más nuevo. La respuesta sólo se aplica si nadie confirmó nada después. Una regla
  rota (22023, `abierta_vencida`), la sesión vencida o un permiso que se fue piden «Recargar», no «Reintentar». **El mensaje de la base
  nunca llega a la pantalla.**
- **Props (`entities/binding.ts`):** `value` es lo tipeado y pendiente, si no `valores[id]` de la última respuesta; `disabledReason`
  sale primero de los `estados` del recálculo y después del `motivo` de la lectura. **Entradas (`entities/entradas.ts`):** un `input`
  va a `inputs`; constante, tipo de cambio o sobrescribible, a `overrides`; **el porcentaje de un par quita el override del monto**.
- **Lo que se dibuja de una celda apagada sale de `estados` del recálculo, nunca de la lectura** (que quita `condicion` y
  `requerido_si` si su bandera no se ve): quien no ve la bandera no puede mandarla, así que la celda vuelve `condicion_apagada` con 0 y
  la hoja dice «Está apagada en esta hoja.» sin nombrar nada ni esconderla.

### Guardar desde la hoja

`Ctrl/Cmd+S` o «Guardar» → Server Action `crear-cotizacion.ts` → `cotizacion_crear`; siempre preventa, con **la misma hoja abierta que
el recálculo**. **El intento:** un uuid por guardado, pendiente en la pestaña; se suelta con toda respuesta con SQLSTATE y se conserva sin
red o con respuesta ilegible. Con el total nulo, «Guardar» se apaga con su motivo. **Rechazos:** se leen de código, `details` y `hint`
(`entities/guardado.ts`) con textos propios, nunca el mensaje de la base; «desactualizada» va en línea («Guardar con la versión N»
reenvía con `p_con_la_abierta`).

## Comprobantes

Un comprobante se emite sobre una final activa con `comprobante_emitir(cotización, versión)` y se anula con
`comprobante_anular(id, motivo)`; la serie vigente la cambia `comprobantes_serie_cambiar(serie, versión)` en Empresa. La serie y `datos`
los pone la base: `datos` congela el recorte del nivel «todos» (el de quien sólo tiene `cotizaciones.ver`, con `_cotizacion_contexto` y
`_cotizacion_recorte`), las etiquetas de esos nodos y, del cliente y del vehículo, sólo los ids. Los candados van vehículo → cotización →
serie vigente → contador, y la numeración no tiene huecos (un contador por serie, nunca una sequence). Un vigente por cotización; una
cotización con comprobante no va a la papelera ni la baja marcar otra final. Errores y pruebas:
`src/modules/cotizaciones/areas/comprobantes/CLAUDE.md`.

## Plantilla de tarjeta (PDF)

La tarjeta de la cotización (la vista previa tipo Excel, el PDF y la imagen) se describe como una **cuadrícula libre**, como en V1, y **un solo
modelo** la dibuja (`geometriaDeLaTarjeta()`). Sólo nodos del nivel «todos». PDF en servidor con `@react-pdf/renderer`; imagen con `next/og`.

**Dos formas de `plantillas_tarjeta.definicion`.** Con la clave `forma` en la raíz es la **forma 2** (la cuadrícula); sin ella, la **forma 1** (la de
grupos), que se convierte a la cuadrícula al leerla y no se migra. El editor escribe sólo la forma 2; una forma 1 guardada (borrador o publicada) se
convierte al abrirla y se guarda convertida cuando quien edita guarda.

**La forma 2**, estricta (`entities/cuadricula-de-la-tarjeta.ts`): `{forma: 2, columnas: [{id, ancho}], filas: [{id, alto, ocultar_si, nodo?}],
celdas: [{id, fila, columna, abarca_columnas?, abarca_filas?, contenido, estilo?}]}`. Columnas de 24 a 640 px (hasta 16, **ancho total ≤ 1.600**);
filas de 16 a 240 px (hasta 120) con `ocultar_si` `nunca` | `no_aplica` | `no_aplica_o_cero`, referido al `nodo` de la fila (obligatorio salvo con
`nunca`, y ausente con `nunca`); hasta 1.000 celdas, con combinaciones de 1 a 16 columnas y 1 a 120 filas; ids con la forma de un id y únicos; una
posición sin celda es una celda vacía sin estilo. **Contenido:** `{tipo: 'texto', texto}` (0 a 300 caracteres, sin `{{`: un texto no mezcla texto y
variables), `{tipo: 'dato', variable}` (`fecha_larga`, `numero`, `titulo` —el título de la cotización sin el de respaldo «Cotización n.º N»,
`tituloAparteDelNumero()`; en la hoja nueva, el que se está escribiendo—, `titulo_opcion`, `asesor_nombre`, `asesor_iniciales`, `cliente_nombre`,
`vehiculo_titulo`, `vehiculo_lote`, `vehiculo_vin`, `vence_el`, `modo_tc`), `{tipo: 'dato', nodo, mostrar}` (`monto`, `etiqueta`, `descripcion`,
`porcentaje` —de un nodo de un par: el `porcentaje_de` o su `pct`—, `tc_nombre`, `tc_valor` y `plazo` —del grupo del nodo—), `{tipo: 'logo'}` o
`{tipo: 'vacio'}`. **Estilo** (todo opcional): `fondo` y `texto` (una clave del catálogo de colores o `auto`, por omisión), `negrita`, `cursiva`,
`tamano` (10, 11, 12, 14, 16, 18, 22 o 28 px; 12 por omisión), `alinear` (izquierda por omisión), `alinear_vertical` (centro por omisión) y `bordes`
(`{todos?, arriba?, derecha?, abajo?, izquierda?}`, cada lado `ninguno` | `fino` | `grueso`; un lado gana sobre `todos`). Nunca un hex: `fondo: auto`
es blanco y `texto: auto`, #1b2130 o blanco, el de más contraste sobre el fondo; un color borrado del catálogo se dibuja `auto`. **Tope: 24 KiB
(24.576 bytes) del texto del `jsonb`**, contados como el de la forma 1.

**La forma 1:** `{grupos: [{grupo, tono?}], etiquetas?, leyendas?, total: {etiqueta, leyenda?}, nota?, logo, columnas: {leyenda, tipo_cambio,
plazo}}`, estricta y de hasta 32 KB: hasta 20 grupos (cada `grupo` y `tono` con la forma de un id), etiquetas (1 a 60 caracteres) y leyendas (0 a 160;
vacía = sin leyenda) por id de nodo, hasta 200 de cada una; la etiqueta del total de 1 a 40, su leyenda hasta 160 y la nota hasta 300. Los textos se
cuentan en caracteres. Sin hex ni CSS.

**`validar_plantilla(plantilla, def, diseno, visibilidad, tonos)`:** STABLE, invocadora, `search_path` vacío, sin leer tablas; 22023 con la regla en
DETAIL y el `donde` en HINT; el primer rechazo manda. Con `def` nulo, sólo la forma (y en la forma 2, las reglas de la grilla).

- **Forma 2**, en este orden: `forma` (el objeto y sus 24 KiB, `definicion`; la clave de más en orden C; `forma` = 2; cada columna, fila y celda con
  su ruta: `columnas[1].ancho`, `celdas[3].estilo.tamano`), `demasiadas_columnas` (`columnas`), `demasiadas_filas` (`filas`), `demasiadas_celdas`
  (`celdas`), `columna_repetida`, `fila_repetida`, `celda_repetida` (la segunda aparición: `columnas.<id>`…), `ancho_total` (`columnas`),
  `celda_fuera_de_la_grilla`, `celdas_se_pisan` (la primera que ocupa una casilla ya ocupada), `variable_inexistente` (`celdas.<id>`); con la versión,
  `tono_inexistente` (sólo con `tonos`), `nodo_de_fila_inexistente` (`filas.<id>`), `nodo_inexistente`, `mostrar_no_admitido`, `nodo_restringido`
  (los nodos de las filas en orden y después los de las celdas; de un `porcentaje`, también su `pct`; **no figurar cuenta como restringido**) y
  `tipo_de_cambio_restringido` (por cada celda `tc_*`, el nodo del bucket de su grupo por omisión y en cada modo). El `donde` nombra la fila o la
  celda y el mensaje también, **nunca el nodo**. `grupo_*` y `nodo_sin_lugar` no aplican.
- **Forma 1**, en este orden: `forma` (la clave o el índice), `grupo_inexistente`, `grupo_repetido`, `grupo_faltante` (la tarjeta lleva **todos** los
  grupos de la fórmula: lo que se ve suma el total), `tono_inexistente` (sólo con `tonos`), `nodo_inexistente` y `nodo_sin_lugar` (una clave de
  `etiquetas`/`leyendas` es un miembro de un grupo, el total o lo aparte de `tarjeta_total`), `nodo_restringido` (un miembro, el total o lo aparte sin
  `ver: todos`) y, con `columnas.tipo_cambio`, `tipo_de_cambio_restringido`.
- Juego común: `entities/plantilla/casos-de-plantilla.json` (lo corren `plantilla-validar.sql` y `validarPlantilla()`; los casos «borde: …» cazan las
  trampas del espejo y `octetos` fija el texto de `jsonb` que cuenta los topes). `demasiadas_celdas` no tiene caso: 1.001 celdas pasan de 24 KiB y sólo
  se alcanza sin el tope (T2b). Un número no canónico (`24.0`, sólo por un RPC a mano) es entero para los dos, pero sus bytes difieren: manda la base.
  `plantilla_guardar_borrador` valida la forma; `plantilla_publicar`, contra la fórmula **publicada** del origen y los colores del catálogo, antes de
  archivar nada (sin fórmula publicada, `formula_sin_publicar@origen`). La tabla la lee sólo quien tiene `cotizaciones.configurar` del origen.

**La conversión de la forma 1** (`convertirPlantilla()`, espejo `_plantilla_convertir()` con el juego `casos-de-conversion.json`, que genera TS y
corre `plantilla-convertir.sql`): pura y determinista, con la misma apariencia de hoy. Columnas (sólo las que van): `grupo` (100 px, si algún grupo
tiene miembros), `concepto` (190), `monto` (130), `leyenda` (170) y `tipo_cambio` y `plazo` (90, con la columna del grupo). Filas: el logo arriba con 2
columnas; `titulo` (el título de la opción, si la variante es del nivel «todos»), `fecha` (la fecha y, a su lado, el título de la cotización: se corta
a un renglón, entero en «Copiar texto»), `numero` («Cotización n.º» y el número) y `asesor`
(«Asesor:» y el nombre), con el logo al costado (`c_logo`) desde 3 columnas; `vehiculo`; `cabecera` («Tipo de cambio» y «Plazo», una vez); una fila
`n_<nodo>` por miembro de cada grupo (en el orden de la plantilla y de la fórmula, con `ocultar_si: no_aplica` y el color del grupo: el de la plantilla
si sigue en el catálogo, si no el del grupo), con el título del grupo, el tipo de cambio y el plazo abarcando las filas del grupo; `total` (en dos
renglones: la moneda local va debajo) con su leyenda en su columna o en `total_leyenda`; `a_<nodo>` por lo aparte (`no_aplica`); `nota`. **Ids
deterministas**: el texto si cabe en 41 caracteres; si no, sus primeros 32, `_` y el FNV-1a de 32 bits del texto (`ids-de-la-conversion.ts`); celdas
`c_<fila>_<columna>`. **Altos** con aritmética entera (`altos-de-la-conversion.ts`). Una forma 1 cuya conversión rompe una regla de la cuadrícula (más
de 120 filas o 1.000 celdas, un `{{` en una etiqueta o nota) se trata como `sin_plantilla`; lo convertido no se mide contra los 24 KiB.

**El modelo de dibujo** (`entities/tarjeta/geometria-de-la-tarjeta.ts`): de la cuadrícula, la lectura, el cálculo (valores, estados y totales por id) y
el contexto de la cotización (las variables, ya formateadas: `contextoDeLaPagina()`), el ancho y el alto en px y, por celda visible y en orden de
lectura, su rectángulo, su contenido resuelto y su estilo; más las filas ocultas con su motivo: `fuera_de_la_version` (el nodo de la fila no está en
los estados del cálculo, salvo el total), `no_aplica` (con `variante`: el título de la opción elegida, si la lectura trae la variante) o `cero`. Esos
motivos son sólo datos de las ocultas: el dibujo no cambia y `_portada_version_del_dibujo()` no sube. Una fila se oculta si su nodo no aplica (o vale 0) y
las celdas que la cruzan se acortan; un dato de un nodo que no aplica, en una fila que se dibuja, va vacío; un monto nulo, «—». El monto del total sale
de los totales y, con «Ver total Bs», lleva la segunda línea en moneda local. Sin plantilla o sin estados, la tarjeta por omisión (`por-omision.ts`).
Lo pintan tres dibujos con posiciones absolutas (satori no tiene `grid`): el HTML (escalado como una imagen, `min(1, ancho del contenedor / ancho)`),
el PDF y la imagen (`pngDeLaTarjeta()`, al ancho de la tarjeta). «Copiar texto» sale de la misma geometría (`textoDeLaTarjeta()`).

### Versiones de la plantilla

Guardar el borrador, publicarlo y descartarlo piden la versión que se vio (`plantillas_tarjeta.actualizado_en`, como texto: un `Date`
pierde los microsegundos) y pasan en serie por un candado por origen (`pg_advisory_xact_lock(hashtextextended('plantillas:' || origen,
0))`), tomado tras el permiso (`cotizaciones.configurar` del origen) y lo que se rechaza sin mirar el estado, y antes de leer el borrador
`for update`. Sin el candado, dos publicar a la vez publicarían las dos.

- `plantilla_guardar_borrador(p_origen, p_actualizado_en_esperado, p_def, p_nota default null) returns timestamptz` (la versión nueva).
  **Esperada nula = crear**: sin borrador lo inserta; con borrador, PT409 «Ya hay un borrador de esta plantilla, guardado hace 2 min.» y
  nada cambia. Con la esperada, un borrador de otra versión da PT409 «El borrador de esta plantilla cambió hace 2 min, mientras lo
  editabas.» (sin nombre: la tabla no guarda quién). La forma se valida antes del candado.
- `plantilla_publicar(p_origen, p_actualizado_en_esperado, p_nota) returns uuid` (en `uuid` a propósito: una función que devuelve `jsonb`
  y lee `public.formulas` cae en el inventario de lo oculto de `cotizaciones-visibilidad.sql`). Esperada nula: la excepción de
  `_exigir_version()`, sin PT409. Nota en blanco: 22023 «Publicar pide una nota.» (hint `nota`). Después valida contra la fórmula publicada
  y los tonos; un rechazo no archiva nada.
- `plantilla_descartar_borrador(p_origen, p_actualizado_en_esperado) returns void`: borra el borrador de esa versión; otra versión, PT409.
- **Sin borrador y con esperada** (`_plantilla_borrador_ausente()`), PT409: «El borrador ya no está: la versión 3 se publicó hace un
  momento.» si la publicada tiene `publicado_en >= esperada`; si no, «El borrador ya no está: se descartó.».
- Dentro de una transacción `now()` no se mueve (el trigger genérico): una esperada «vieja» es la de la fila menos 1 µs en `db:probar`;
  que guardar mueve la versión entre transacciones lo prueban las carreras (`scripts/carreras/plantillas.mjs`).

### Lo que lee y escribe la plantilla desde TypeScript

- **La versión esperada** es el `actualizado_en` de la base como texto con microsegundos (`z.iso.datetime({ offset: true })`, nunca
  `Date`); `guardar` la manda siempre (`null` explícito para crear), manda la forma 2 y no manda `p_nota`. Un 22023 de `validar_plantilla()` va a
  `porCampo[donde]` con el mensaje de la base; «Publicar pide una nota.», a `porCampo.nota`; el PT409 es un conflicto sin nombre. Guardar
  sólo valida la forma; lo que cruza con la fórmula y los tonos lo rechaza publicar.
- **Texto que la base no lee** (`\u0000`, surrogate suelto: 22P02, 22P05): la action lo ataja antes (`revisarTextoParaLaBase()`, tope de 8
  niveles) y lo dice junto al campo.
- **La lectura** (`leerPlantillaDelOrigen()`, con la sesión de quien mira): borrador y publicada, cada una con su `contenido`
  (`versionDePlantilla()`: `{forma: 1, plantilla}`, `{forma: 2, cuadricula}` —una cuadrícula guardada no se vuelve a medir contra los 24 KiB— o
  `{motivo}` si perdió la forma), la fórmula publicada con lo que mira el validador (con el par `op`/`pct`) y los colores (tope 48); sin fórmula publicada
  no hay contexto.

### El editor de la plantilla

- **La pestaña «Tarjeta»** (`/configuracion/cotizacion/<origen>/tarjeta`, `cotizaciones.configurar`, a todo el ancho) edita el **borrador** como un
  Excel y escribe **sólo la forma 2**. El servidor arma `propsDelEditor()`: la cuadrícula de la que nace (`cuadriculaParaEditar()`: el borrador; si no se
  lee, la copia de la publicada; si no, la de por omisión), su procedencia, sus avisos y el contexto reducido. Una forma 2 se usa tal cual; una forma 1
  pasa por `alinearConLaFormula()` y `convertirPlantilla()` con «Se convirtió a cuadrícula: revisa y guarda.» (no se guarda sola); sin plantilla, la
  omisión convertida (los grupos de la fórmula y el total). Si lo convertido no entra en la grilla (más de 120 filas o 1.000 celdas), se convierte con los
  primeros 4 miembros de cada grupo (`FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA`) y, si tampoco, sólo con el total, y lo dice.
- **El contexto reducido** (`contextoParaElNavegador(contexto, cuadricula)`): los nodos del nivel «todos» (lo que «Dato» ofrece), los restringidos que la
  cuadrícula ya nombra (marcados: con ellos no se podría publicar), los del tipo de cambio de cada bucket y la variante; de cada uno etiqueta, grupo,
  salida, descripción y el par `tipo`/`op`/`pct`, y el `{ver}` de la visibilidad. Nunca el cuerpo de un nodo ni la `definicion` entera.
- **El lienzo es un hueco:** el área `plantilla` no importa la geometría (es del área `tarjeta`). La página pasa `LienzoDeLaPlantillaDiferido`
  (`pantallas/tarjeta-plantilla.ts`, tipos en `entities/vista-previa-de-la-plantilla.ts`): recibe la lectura de la cuadrícula de trabajo
  (`lecturaEnCuadricula()`, recalculada en cada cambio), la referencia, «Ajustar | 100 %» y el margen de la capa («Ajustar» mide el contenedor del marco,
  `data-medida-del-lienzo` con `contain: inline-size`, y deja el margen de la capa a los dos lados); dibuja la tarjeta con
  `geometriaDeLaTarjeta()` y llama a `capa(g, escala)` (la grilla del editor, encima, sin escalar: multiplica por la escala) y a `debajo(g)` («Ocultas con
  esta referencia»). `GeometriaParaEditar` lleva el tamaño, las filas que se dibujan con su banda y las ocultas; la `x` de cada columna la saca la capa
  de los anchos de la plantilla, así no repite la regla de qué fila se oculta.
- **La referencia** (`ReferenciaDeLaTarjeta`, núcleo): la compone `src/app` (`[origen]/tarjeta/referencia.ts`, `server-only`, nunca lanza) como el PDF:
  `leerListadoDeCotizaciones()` con `UNA` (la más reciente que quien configura ve, sin papelera, por `cotizaciones_origen_creado_idx`), la hoja guardada
  con su primer recálculo, el cliente, el vehículo y el asesor por PK y los ajustes, y `referenciaPlana(calculoDeLoGuardado(…))`. Sin estados (el
  recálculo falló) es `no_se_leyo`: la tarjeta caería a la de por omisión. La página la pide sin esperarla y `SeccionDeLaPlantilla` la espera en paralelo
  con la plantilla, y la recorta a los ids del contexto reducido (`recortarLaReferencia()`). Sin cotización o ilegible, las cifras de ejemplo: la fila
  n-ésima con nodo vale `(n mod 8 + 1) × 250` USD, cada `pct` 5 %, cada tipo de cambio 6,96 y el total es la suma de los miembros. `?referencia=ejemplo`
  las pide aunque haya cotización, sin ir al servidor.
- **Las operaciones** son puras (`entities/plantilla/edicion/`): el mapa de la grilla, la selección (un rango que corta una combinación se agranda),
  contenido, estilo, combinar y separar, insertar y eliminar (una combinación que cruza crece o se achica; insertar en su borde no la cambia), anchos y
  altos, «Ocultar si…», mover una fila (no si es parte de una combinación vertical), copiar y pegar un bloque. Cada una se mide después
  (`medido()`): se rechaza con su motivo si pasa un tope **y crece** (16 columnas, 120 filas, 1.000 celdas, 1.600 px, 24 KiB: el que manda) o rompe una
  regla de la grilla. Ids nuevos: el menor libre en base 36 (`c1`, `f1`, `k1`). El reductor (`reductor.ts`) une selección, operaciones, el bloque
  copiado, la celda en la que se escribe y el historial (`historial.ts`: instantáneas, tope 100, lo escrito en un campo se junta por clave hasta que
  cambia la selección); la barra y el menú prueban cada operación en seco (`disponibilidad.ts`) para apagarla con el motivo del reductor.
- **Validar:** `validarPlantilla(plantilla, null, {conTope: false})` para la forma, los 24 KiB aparte (apagan «Guardar borrador»), y con el contexto
  reducido para «Con esto no se podría publicar». Lo tipeado sin guardar va en `sessionStorage` (`tarjeta-cuadricula:<origen>:<esperada>`) y se repone
  sólo si sigue siendo una cuadrícula.
- **Guardar, publicar y descartar** (`?panel=publicar-tarjeta` con nota obligatoria, `?panel=descartar-plantilla` con `<Confirmar>`) mandan la `esperada`
  como texto; el PT409 se dice tal cual. «Publicar…» sólo sin cambios sin guardar. Un rechazo de publicar con un `donde` de la cuadrícula
  (`celdas.<id>`, `filas.<id>`, `columnas.<id>`) ofrece «Ir a la celda», que lo elige en el lienzo (`seleccionDelDonde()`). Los modales van **fuera de la
  `key`** del editor (`PestanaDeLaTarjeta`): «Recargar» no pierde la nota. Esa `key` cambia con una versión que no es la que el editor acaba de
  guardar (`useClaveDelEditor()`): guardar no remonta el editor y el historial sigue; «hay cambios» compara sin el orden de las claves (`mismoJson()`). En una pantalla de menos de 1.024 px la pestaña dibuja el aviso y el lienzo sin
  capa, y el código del editor no se pide.

### La lectura de la tarjeta

**`cotizacion_tarjeta(p_formula)`**, `security definer`, da lo que dibuja la tarjeta de **una versión** de la fórmula. Pide
`cotizaciones.ver` (cualquier alcance) del origen de la versión; una versión que no existe y un borrador dan el mismo 42501 que no tener el
permiso, también a la dueña. La plantilla es la **publicada hoy** del origen, validada otra vez contra **esa** versión (sin el catálogo); la de la forma
1 se convierte (con el catálogo de hoy: un color borrado cae al del grupo) y lo convertido se valida sin el tope. Si no le sirve, `{estado:
'sin_plantilla'}` sin regla ni `donde` (la tarjeta «por omisión»). Con ella, `{estado: 'lista', plantilla: {version}, definicion: <forma 2>, nodos:
[{id, etiqueta, descripcion, grupo, pct}], grupos: [{id, etiqueta, plazo, bucket}], tipos_de_cambio: {buckets: {b: {nombre, nodo}}, modos: {clave:
{b: {nombre, nodo}}}}, modos: [{clave, nombre}], variante: {nodo, opciones: [{clave, titulo}]} | null, colores: [{clave, hex}], total: {nodo},
moneda_bs}`, **sólo lo que la cuadrícula nombra**: los nodos de las filas y de las celdas (y el `pct` de un `porcentaje`, sólo entonces), los grupos de
un `tc_*` o un `plazo`, el tipo de cambio de esos buckets por su `nombre` de `tipos_cambio` (nulo si no hay uno activo) y su nodo (del nivel «todos»:
lo exige la plantilla; su valor sale del snapshot), los modos si se muestra `modo_tc`, la variante si se muestra `titulo_opcion` y es del nivel
«todos», y los colores del catálogo que nombran los estilos. **Ningún id, etiqueta ni texto de un nodo sin `ver: todos` sale, para nadie** (K4 de
`cotizacion-tarjeta.sql`, por cada nivel, en la forma 1 convertida y en cada forma de nombrar un nodo en la cuadrícula; el inventario de
`cotizaciones-visibilidad.sql` la registra).

### Retoques de la tarjeta

Los **retoques de la tarjeta** cambian textos y ocultan filas de la tarjeta de **una** cotización guardada, sin tocar la plantilla del origen. Se
guardan en `cotizaciones.tarjeta_retoques`: `{celdas?: {<id de celda>: texto}, filas_ocultas?: [<id de fila>]}` (nula: la tarjeta tal cual la
plantilla). Sólo el texto de las celdas `texto` de la cuadrícula y filas enteras: nunca las celdas de `dato` (montos, etiquetas, tipos de cambio,
variables), el logo, los colores, los tamaños, las columnas ni las combinaciones.

- **`validar_retoques(retoques, plantilla)`**: STABLE, invocadora, `search_path` vacío, sin leer tablas; 22023 con la regla en DETAIL y el `donde` en
  HINT; el primer rechazo manda. Con la plantilla nula, toda celda y toda fila es inexistente. En este orden: `forma` (el objeto, `retoques`),
  `demasiado_grande` (más de 24 KiB del texto del `jsonb`, el tope de la cuadrícula; `retoques`), `forma` (la clave de más en orden C; `celdas` que
  no es un objeto); por cada celda en orden C (`celdas.<id>`): `forma` (no es un texto), `celda_inexistente`, `celda_no_es_texto` y `texto_largo` (más
  de 300 caracteres); `forma` (`filas_ocultas` que no es un arreglo); por cada fila en su orden: `forma` (`filas_ocultas[i]`), `fila_inexistente` y
  `fila_repetida` (`filas_ocultas.<id>`). Un `{{` se dibuja tal cual: en la cuadrícula nada interpola. Espejo `validarRetoques()`
  (`entities/tarjeta/retoques/`) con el juego `casos-de-retoques.json`, que corren Vitest y R1 de `supabase/tests/areas/tarjeta/retoques.sql`.
- **`cotizacion_retocar_tarjeta(id, actualizado_en_esperado, retoques)`**, `security definer`: pide lo que pide guardarla
  (`_cotizacion_puede_guardar()`) antes y después de tomar la fila `for no key update`; la papelera, lo que no existe y lo que no se ve dan el mismo
  42501; la versión va antes que la validación (el PT409 de `_conflicto_de_edicion()`: quién y cuándo). Valida contra **lo que se dibuja hoy**: la
  cuadrícula de `cotizacion_tarjeta(formula_id)` si está `lista` (la publicada del origen, convertida si es de la forma 1 y validada contra la versión
  de la cotización); si no, ninguna. Nulo, `{}` o lo vacío dejan la columna nula (`_retoques_normalizados()`); los mismos retoques que hay no escriben
  nada (ni versión, ni revisión, ni actividad). Devuelve `{actualizado_en, retoques, repetido}`. Retocar mueve `actualizado_en`: es guardar la
  cotización (cambian la fecha del último guardado de la tarjeta y su portada).
- **Al dibujar**, `aplicarRetoques()` cambia el texto de las celdas de texto que están y quita las filas ocultas antes de la geometría, reparando las
  combinaciones: una celda que empieza en una fila oculta pasa a la primera fila que le queda, la que la cruza se acorta y la que se queda sin filas no
  se dibuja. Un retoque de una celda que ya no está o dejó de ser de texto, o de una fila que ya no está, **no aplica**: se ignora y se cuenta. Todo lo que
  dibuja esa tarjeta pasa por ahí: la vista previa, «Copiar texto», el PDF, compartir y la portada (`lecturaRetocada()` en `geometriaDeUnaGuardada()` y
  en `useModeloDeLaTarjeta()`). El modo «Retocar» dice cuántos no aplican y «Listo» guarda sólo los que aplican.
- **La revisión** guarda cuántos hay (`{celdas: n, filas_ocultas: m}` por lado, `_retoques_resumen()`), nunca los textos, y «Revisiones» dice «Retocó
  la tarjeta» (también al volver a la plantilla). La actividad la deja `cotizacion_auditar()`, con quien retocó.
- **Cotizar encima** se los lleva, como el título y las notas; los que no apliquen a la plantilla de hoy se ignoran al dibujar.

### El PDF

`GET /cotizaciones/<id>/pdf` da la tarjeta de una cotización **guardada** en una página A4: la misma `geometriaDeLaTarjeta()` que «Vista previa»,
escalada entera al menor factor que la hace entrar (`min(1, ancho útil / ancho, alto útil / alto)`, con 1 px = 0,75 pt y 36 pt de margen: una fila
nunca se corta), con
`calculoDeLoGuardado()` (valores y totales del snapshot, los estados del primer recálculo), así el PDF dice lo mismo que la tarjeta de esa
guardada y nunca lo de hoy. Lee `cotizacion_hoja_guardada`, `cotizacion_evaluar(p_cotizacion)` y `cotizacion_tarjeta(p_formula)` con la
sesión de quien pide: lo descarga quien ve la cotización, sin clave propia, y lo que un nivel esconde no está (sólo lo del nivel «todos»).
Lo que no existe, está en la papelera o no se ve es el mismo 404 en texto que la página. El total impreso es el del snapshot: con dos tipos
de cambio **no es la suma de las filas** sino Bs ÷ tc(`total_en`), con Bs = Σ grupo × tc(su bucket); `e2e/cotizar-pdf.spec.ts` lo cuenta
con las filas impresas y la tolerancia del redondeo. Los montos van con `formatearMonto()` y siempre con cifras (el Modo Live es de la
pantalla); el logo, en `Buffer` y sólo si react-pdf lo dibuja fiel (`docs/PENDIENTES.md`, 4-98). Lo dibuja
`src/modules/cotizaciones/infra/tarjeta/pdf/` con `@react-pdf/renderer` y Geist en TTF (recta e itálica). La misma tarjeta como PNG:
`imagenDeUnaGuardada()` (`infra/tarjeta/imagen/`, `ImageResponse`), la base de la portada de la cotización.

### La portada de la cotización

La **portada de la cotización** es la imagen de la tarjeta de una cotización guardada: la de lo guardado (como el PDF), en WebP de hasta 1.600 px
de ancho (calidad 80, con `sharp` en el servidor), guardada por hash en el bucket privado `cotizaciones` (`<cotización>/portada/<sha-256>.webp`: subir pide
poder guardarla, como un adjunto; leer, además de ver la cotización, ver lo que dibuja: `cotizacion_portada_visible()` en la policy «cotizaciones: leer»). Se anota en `cotizaciones_portadas` (una fila por
cotización: `ruta`, `clave`, `generada_en`), no en `cotizaciones`: un `update` dejaría una revisión y movería la versión esperada de quien edita.

- **La clave** dice de qué está hecha: `_cotizacion_portada_clave()` = `p<versión del dibujo>-md5` de todo lo que el dibujo lee: la cotización
  (`actualizado_en`, la versión, el origen), la plantilla publicada del origen (o ninguna), esa versión de la fórmula, los colores (clave y hex), los
  tipos de cambio (nombre, activo y moneda; nunca el valor del día), el cliente y el vehículo vivos (nombre; título, lote y VIN: no su `actualizado_en`,
  que una fase o una foto mueven), quien la creó (nombre y correo) y los ajustes de la empresa. Todo por clave primaria o índice único, y dos catálogos
  de decenas de filas. Un cambio en cómo se dibuja sube `_portada_version_del_dibujo()` en una migración. Clave guardada distinta de la vigente: la
  portada quedó vieja.
- **La compartida y la propia.** La portada guardada es una sola para todos y lleva el cliente y el vehículo. La recibe quien **ve todo lo que dibuja**
  (`ve_todo`: el cliente vivo con `leads.ver`, el vehículo vivo con `vehiculos.ver`) sin «Ver como»; los demás reciben una armada en el momento con lo
  suyo (como el PDF), sin guardarla.
- **`cotizacion_portada(id)`** (pide ver; 42501 igual para lo que no existe, está en la papelera o no se ve) da `{ruta, clave, clave_vigente,
ve_todo, puede_guardarla, contexto}`: `puede_guardarla` es `ve_todo` y `_cotizacion_puede_guardar()`, y `contexto` (el cliente, el vehículo y quien la
  creó: lo que mira la clave), sólo con `ve_todo`.
- **`cotizacion_portada_poner(id, ruta, clave)`** anota la subida: pide poder guardarla y `ve_todo` (antes de mirar la ruta y otra vez tras tomar la
  cotización `for no key update`), la ruta en la carpeta `portada/` de la cotización y el objeto en storage, WebP de hasta 5 MB (22023 con `hint`), y la
  clave, la vigente tras el candado (si no, PT409 «La tarjeta cambió mientras se armaba la imagen.»: quien llama entrega su imagen sin guardarla).
  Reemplaza la fila y manda la ruta vieja a la cola de limpieza si nadie más la usa.
- **Cuándo se arma.** Al guardar (crear, guardar y cotizar encima), después de la respuesta del guardado: el núcleo avisa por el hueco de la vista previa
  (`alGuardarLaCotizacion`) y el área `tarjeta` pide la ruta (`pedirLaPortada()`, un `fetch` que nadie espera); el guardado no la espera ni ve sus fallos.
  Al retocar la tarjeta, lo mismo desde el modo «Retocar» tras «Listo».
  Y al pedirla vieja o sin portada. En los dos casos la ruta la arma y, si quien pide puede guardarla, la guarda **antes de responder** (nunca en `after()`:
  la sesión podría renovarse con la respuesta ya enviada). Sin el primer recálculo (la tarjeta saldría sólo con el total) se entrega pero no se guarda. Una
  plantilla nueva se ve sola, sin relleno masivo.
- **La ruta** `GET /cotizaciones/<id>/portada` (`requerirSesion()`): lo que no existe, está en la papelera o no se ve, el mismo 404 en texto que el PDF.
  La compartida va con `ETag` = la clave y `Cache-Control: private, no-cache` (con `If-None-Match` igual, 304 sin bajar ni armar nada); al día, la baja
  del bucket con la sesión de quien pide. La propia va con `no-store` y sin `ETag`. Si armarla falla, 500: nunca una vieja.
- **Se va** con la cotización: la cascada borra la fila al purgar (las dos purgas encolan su ruta) y el barrido de huérfanos del bucket `cotizaciones`
  (`storage_gc_reclamar()`, rama propia por `not exists` sobre adjuntos y portadas) se lleva lo que quedó sin fila.
- **En pantalla**, `<PortadaDeLaCotizacion>` (`pantallas/tarjeta-portada.ts`; en el resumen del listado, por el hueco `Portada`): la imagen con
  `object-contain` y `loading="lazy"` en un marco de la proporción que le dan (15:8 por omisión); mientras carga o si falla, un recuadro del mismo
  tamaño con el total y «Reintentar»; el clic la abre en el visor de fotos; en Modo Live, borrosa con «Oculto en Modo Live» y sin visor.

## Plantillas de V1

Una **plantilla de V1** (glosario) es un paquete fijo que replica un cotizador de V1: la fórmula con su diseño de la hoja y la tarjeta en forma 2. Hay
cuatro, en `src/modules/cotizaciones/entities/plantillas-de-v1/` (un JSON por paquete; `index.ts` los lee y sólo lo importa el servidor:
`solo-del-servidor.test.ts`): **USA (subasta)** (`usa`), **China** (`china`), **Oficina** (`oficina`) y **Compra dealer USA** (`dealer`). Cada uno pasa
`validarFormula()`, `validarDiseno()` y `validarPlantilla()` contra su propia fórmula (`entities/plantilla/de-v1/*.test.ts`, con la cuenta de V1 hecha a
mano desde sus bandas) y la base los publica (P9 de `supabase/tests/areas/formula/plantillas-de-v1.sql`, que los carga como juego). No cambian la semilla.

- **De dónde sale cada uno** (`docs/referencias/cotizador-actual/v1/`): los conceptos, el orden, «de dónde sale» y los porcentajes, de las bandas de
  `quote-formula-rows.ts` (`USA_FORMULA_BANDS`, `CHINA_FORMULA_BANDS`, `DEALER_FORMULA_BANDS`); los valores por defecto, de la versión publicada de cada
  origen en el extracto de V1 (`usa` v2, `china` v2, `dealer` v1; `office` no versiona nada); la tarjeta, de `seed/{usa,china,office,dealer}.ts` (la de
  Dealer, su v2), con las palabras de V1 y sin sus defectos. USA sigue la estructura del caso «excel» y reproduce sus cifras con lo tipeado en su hoja.
- **Lo que trae:** las variantes de V1 (USA: Moto, Auto gasolina, USA → Chile, Híbrido / eléctrico; Dealer: el contenedor de 20 y de 40 pies **en par**),
  los grupos con su plazo y su color («1er pago», «2do pago» y la póliza al oficial; Oficina, un grupo «Contado»), los modos de V1 («Aduana»: la suma de los
  dólares, todo al oficial; «Paralelo»: lo de afuera al paralelo y la aduana al oficial; «Unificado»: un solo dólar, el paralelo), con su modo por defecto
  (Unificado en USA y China, Paralelo en Oficina y Dealer), «Mostrar el total en bolivianos» ofrecido y apagado, las ayudas de cada celda y el nivel «Todos»
  en ver y editar. La cuenta especial de USA entra en la base de la transferencia y nunca en el CIF; la nacionalización (la póliza en China) va a dólar entero
  (`redondear`, sobrescribible: la póliza manual), como su línea de V1; los fees y la transferencia, el par porcentaje-monto de su celda, no (V1 también los
  redondea: con montos enteros la diferencia es de centavos). En Dealer, el export híbrido entra con el interruptor «Híbrido / eléctrico».
- **Las tablas congeladas** (`params.tablas`, «Las tablas congeladas (D5)»): USA lleva `depreciacion` (la `usa` de V1) y `depreciacion_moto` (la `usa_moto` de
  V1, que guarda porcentajes enteros: 5 es un factor de 0,05); China, `depreciacion` (la `china` de V1). **China no congela las comisiones por categoría**: su
  fórmula de V1 no las lee (la comisión de logística es la constante de 1.000). Oficina y Dealer no usan tablas (el factor DP de Dealer es una constante: no
  hay vehículo del que leer el año). Las tablas nuevas no se crean desde aquí.
- **Los colores** que nombran los grupos, el diseño y la tarjeta van en el paquete con su clave `v1_<nombre>` (la que da `_tono_clave()` del nombre «V1
  <nombre>»: `v1_teal`, `v1_amarillo_fuerte`…); el mismo hex lleva el mismo nombre en los cuatro, así el segundo paquete reusa los del primero. Al aplicar, la
  elección es pura y en el servidor de Next (`coloresDeLaPlantilla()`): la clave que no existe se crea; la que existe con el mismo hex se reusa; con otro hex,
  va `v1_<paquete>_<nombre>`, que a su vez se reusa si tiene el mismo hex, y si también choca no se crea nada (PT409). Si no caben en el tope de 48: «No hay
  lugar para N colores más en el catálogo (máximo 48): elimina alguno que no se use.». Después `plantillaConClaves()` reescribe los tonos de los grupos, del
  diseño y de las celdas.
- **Aplicar es todo o nada, en la base:** `cotizacion_paquete_aplicar(p_origen, p_paquete, p_formula_esperada, p_plantilla_esperada)`, **invocadora**, en este
  orden: `assert_permiso('cotizaciones.configurar', p_origen)`; la forma de `p_paquete` (22023, `hint` `paquete.<pieza>`); `formula_guardar_borrador()` con la
  esperada de la fórmula (nula = crear) y sin la publicada esperada; `plantilla_guardar_borrador()` con la de la tarjeta; `_paquete_colores_preparar()`
  (definer: toma `tonos` en `share row exclusive` y comprueba que cada color que se reusa sigue con su hex —si no, PT409 «Mientras elegías, cambiaron los
  colores del catálogo. Vuelve a elegir la plantilla.»— y que hay lugar); y `tono_crear()` por cada color nuevo, comparando la clave que da la base con la
  esperada (otra: PT409). Un color cuyo nombre o clave tomó otro mientras tanto también es ese PT409. Los candados van en el orden de publicar (`formulas:` → `plantillas:` →
  `tonos`). Cualquier rechazo deshace todo y vuelve con su mensaje (los PT409 de los borradores, tal cual); reintentar no duplica: si el primero entró, el
  segundo trae versiones que ya no son y da el PT409 de los borradores. Devuelve
  `{formula: {id, actualizado_en}, plantilla, colores}`. La nota de los dos borradores: «Empezado desde la plantilla de V1 «USA (subasta)».».
- **No publica:** crea los borradores de la fórmula (con su diseño) y de la tarjeta; publicar es aparte, como siempre. El navegador manda la clave del
  paquete, nunca una fórmula.
