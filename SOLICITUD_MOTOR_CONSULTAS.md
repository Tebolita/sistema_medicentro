# Solicitud: la consulta como motor del sistema

Este documento reemplaza y amplía a `SOLICITUD_EXPEDIENTE_UNIFICADO.md` (ese
quedó corto: solo hablaba de unificar pantallas, esto es un cambio de
negocio más profundo). Cubre **10 pedidos** del usuario, cada uno con: qué
existe hoy (verificado contra el código, no supuesto), qué cambia, y las
decisiones que hay que tomar antes de programar.

**Es solo documento + script de base de datos. No se tocó ningún .cs ni
.ts todavía** — el script SQL (`scripts/motor_consultas_schema.sql`) es el
"qué" (columnas/tablas nuevas); el código que las usa es el siguiente paso,
una vez se apruebe esto.

> **Lo crítico, en palabras del usuario: "la generación de consultas es el
> motor del sistema."** Todo lo demás (recetario, exámenes, hospitalización,
> constancias) cuelga de una consulta. Por eso la Fase 1 del plan (sección
> 11) es exclusivamente la consulta como entidad central — el resto espera.

---

## 1. Constancia médica (entidad nueva — no existe nada parecido)

**Pedido**: "Incluir constancias médicas. Una acta médica siempre va a ir
al final de una consulta."

**Estado actual**: no existe. Lo único parecido es `libro_actas` (ver
`src/app/models/acta.model.ts`), pero ESO es la bitácora de **ingreso en
Recepción** (quién llegó, a qué hora, motivo de ingreso, atendido por un
recepcionista) — un concepto totalmente distinto al de un **acta/constancia
médica** que el médico emite al cerrar una consulta.

**Decidido: 1:1 con la cita.** Una sola constancia por consulta —
`constancia_medica.id_cita` lleva una restricción `UNIQUE` (ver script).

**Cambio propuesto**: tabla nueva `constancia_medica`, 1:1 con `citas`:

```
idConstancia, idCita, idPaciente, idMedico,
diagnostico, contenido (texto libre: el cuerpo de la constancia),
activo, fechaCreacion, fechaModificacion, idUsuarioCreacion, idUsuarioModificacion
```

Sin firma digital: el usuario confirmó que la constancia se imprime, no se
firma electrónicamente — a diferencia de Receta (que sí tiene
`firmaDigitalHash`/`firmaDigitalUrl`), esta tabla no los necesita.

Al ser 1:1, el backend debe rechazar un segundo `POST` de constancia para
la misma cita (409 Conflicto, mismo patrón que el resto del sistema) en vez
de dejar que la restricción `UNIQUE` reviente como error 500 crudo.

---

## 2. Historial clínico generado por la consulta, no a mano (CRUD manual se quita)

**Pedido**: "A partir de una consulta se debe llevar un historial clínico
del paciente y no generar uno por uno" + "que los expedientes clínicos solo
se puedan ver, ya que tienen que ir en base a las consultas generadas".

**Estado actual** (confirmado): `ExpedientesController` tiene los 5 verbos
completos (GET lista, GET por id, POST, PUT, DELETE) y
`expedientes-lista.html` tiene un botón "Nuevo registro" que lleva a
`/home/expedientes/nuevo` — hoy se puede crear un expediente clínico
completamente suelto, sin pasar por ninguna cita.

**Cambio propuesto**:
- El expediente (`HistorialClinico`) deja de crearse a mano: se genera
  automáticamente cuando el médico guarda "los datos que se toman" dentro
  de la pantalla de Consulta (ver sección 4) — ya queda con `idCita`
  poblado (el campo ya existe, es nullable, ver `SOLICITUD_EXPEDIENTE_UNIFICADO.md`).
- El frontend quita el botón "Nuevo registro"/"Eliminar" de
  `expedientes-lista`. La pantalla pasa a ser de **solo lectura**
  (sección 10).
- El backend: `POST/PUT/DELETE /api/expedientes` deja de llamarse desde una
  pantalla de usuario, pero **no hay que borrar los endpoints** — los sigue
  usando el flujo de "guardar datos de la consulta" (internamente sigue
  siendo un POST/PUT normal, solo que el frontend ya no expone un botón
  para dispararlo fuera de una consulta).

**Decidido: se bloquea también en el backend.** `HistorialClinicoInputDto.IdCita`
pasa de `long?` a `long` con `[Required]` — el backend rechaza con 400
cualquier `POST /api/expedientes` que no venga con una cita válida. La
columna de base de datos sigue siendo `NULL`-able (no se tocan los
registros históricos que ya existen sin cita), el `Required` es solo a
nivel de DTO de entrada, hacia adelante.

---

## 3. Pantalla de Consulta: registro de datos + 3 módulos acoplados

**Pedido**: en la pantalla de consulta se deben mantener "los datos que se
toman" y añadir, todos **colapsados hasta que el usuario les da clic**:
- Recetario (n recetas, anulables)
- Exámenes (laboratorio)
- Hospitalización

**Estado actual**: cada uno vive en su propio módulo separado
(`src/app/farmacia/recetas-lista/`, `src/app/laboratorio/`,
`src/app/hospitalizacion/`), cada uno obligando a volver a buscar al mismo
paciente.

**Cambio propuesto** (frontend, sin cambios de esquema más allá de lo que
ya cubre `SOLICITUD_EXPEDIENTE_UNIFICADO.md` — `idCita` en Receta):
- Pantalla "Atención de la consulta" con un `mat-accordion`: un panel para
  los datos clínicos (lo que hoy es el formulario de `HistorialClinico`),
  y un panel colapsado por cada uno de los 3 módulos. Cada panel, al
  abrirse, muestra "agregar receta"/"agregar examen"/"iniciar
  hospitalización", ya con `idPaciente`/`idCita`/`idMedico` resueltos — no
  hay que volver a buscarlos.
- Recetario dentro de la consulta: permite **n** recetas por consulta
  (ya lo soporta el modelo: una consulta puede generar varias filas en
  `receta` con el mismo `idCita`). Cada receta ya puede anularse cambiando
  `idEstadoReceta` a `CANCELADA` (ese valor **ya existe** en el catálogo
  `ESTADO_RECETA`, sembrado en `scripts/sembrar_catalogos.sql:166`) — solo
  falta el botón en la UI, no hace falta tocar catálogos.

---

## 4. Emergencias genera una consulta automáticamente (si el paciente está registrado)

**Pedido**: al crear un caso de emergencia, si el paciente existe en
nuestros registros, generar también una consulta para él.

**Estado actual** (confirmado): `CasoEmergencia.IdPaciente` ya es
`long?` (nullable) y existe `NombrePaciente` de texto libre — el sistema ya
distingue "paciente registrado" (tiene `idPaciente`) de "paciente anónimo"
(solo `NombrePaciente`). `CasosEmergenciaService.CrearAsync` hoy solo
guarda el caso; no crea ninguna Cita.

**Decidido: la sala también se asigna.** `CasoEmergencia` necesita su
propio `IdSala` (dónde se está atendiendo al paciente), que se copia a la
cita generada — no basta con el médico.

**Cambio propuesto**:
```sql
ALTER TABLE casos_emergencia ADD id_cita BIGINT NULL;
ALTER TABLE casos_emergencia ADD id_sala BIGINT NULL;
```
- `CasoEmergenciaInputDto` gana `IdSala` (opcional, igual que `IdMedico` —
  el caso puede llegar sin sala asignada todavía y completarse después).
- En `CasosEmergenciaService.CrearAsync`: si `dto.IdPaciente is not null`,
  crear una `Cita` con `IdMedico = dto.IdMedico`, `IdSala = dto.IdSala`,
  `MotivoConsulta = dto.Motivo`, y guardar su id en `CasoEmergencia.IdCita`.
  Si `IdPaciente` es null (paciente anónimo/walk-in), no se genera consulta
  — coincide exactamente con lo pedido ("siempre y cuando esté dentro de
  nuestros registros").
- Si el caso se **edita** después para asignarle médico/sala que no tenía
  al crearse, la cita ya generada se actualiza también (mismo `EditarAsync`).

---

## 5. Marcar una consulta "para operación"

**Pedido**: que una consulta se pueda marcar para una operación.

**Estado actual** (confirmado): no existe nada parecido a
"operación"/"cirugía"/"quirófano" en ningún catálogo ni campo de `Cita`.

**Decidido: dispara una alerta (modal), no una automatización silenciosa.**
Al marcar el checkbox, se abre un diálogo (mismo patrón que
`ConfirmacionDialog`, ver `src/app/shared/confirmacion/`) que obliga a
capturar **qué tipo de operación** se va a realizar — no solo notas libres.
Eso significa un catálogo nuevo, no solo texto:

```sql
ALTER TABLE citas ADD requiere_operacion BIT NOT NULL DEFAULT 0;
ALTER TABLE citas ADD id_tipo_operacion BIGINT NULL; -- cat TIPO_OPERACION (nuevo)
ALTER TABLE citas ADD notas_operacion NVARCHAR(500) NULL; -- detalle libre, opcional
```

`TIPO_OPERACION` se siembra como tipo de catálogo nuevo (sin valores aún —
el equipo clínico los agrega desde Mantenimiento → Catálogos, igual que
cualquier otro catálogo; no es mi lugar inventar la lista de cirugías).

Sigue sin crear automáticamente una hospitalización — eso se mantiene como
paso manual desde el panel de Hospitalización de la misma consulta (sección
3); demasiado riesgo automatizarlo en esta primera entrega.

---

## 6. Subir resultados de examen — **esto YA EXISTE, solo falta la UI**

**Pedido**: poder subir los resultados de los exámenes realizados en la
consulta.

**Estado actual** (confirmado — buena noticia): `ResultadoExamen` ya tiene
`archivoAdjuntoUrl: string | null` (`src/app/models/laboratorio.model.ts:38-51`),
el mismo patrón que ya se usa en Facturación (`Factura.comprobanteUrl`).
**No se necesita ningún cambio de esquema.**

**Cambio propuesto**: solo frontend — agregar el selector de archivo +
llamada al mismo endpoint/patrón de subida que ya usa el comprobante de
factura, dentro del panel de "Exámenes" de la pantalla de consulta (sección
3), guardando la URL resultante en `archivoAdjuntoUrl`.

---

## 7. Descartar (descontar) medicamentos de inventario cuando la factura se paga

**Pedido**: cuando la factura esté pagada, descontar del inventario los
medicamentos recetados que sí estén en nuestro sistema.

**Estado actual** (confirmado): no existe ninguna automatización.
`FacturaDetalle` no tiene ningún campo que lo conecte con una receta/línea
de receta — solo `idMedicamento` suelto. `FacturasService`, al marcar una
factura como `PAGADA`, solo cambia el estado; nunca llama a
`InventarioFarmaciaService`.

**Cambio propuesto**:
```
ALTER TABLE factura_detalle ADD id_receta_detalle BIGINT NULL;
```
Al facturar los medicamentos de una receta, la línea de factura queda
apuntando a la línea de receta que la originó. En `FacturasService`, justo
donde hoy cambia el estado a `PAGADA`, agregar: por cada `FacturaDetalle` de
esa factura con `idRecetaDetalle` no nulo **y** cuyo `RecetaDetalle` tenga
`idMedicamento` no nulo (ver sección 8 — los externos no cuentan), generar
un `MovimientoInventario` tipo `SALIDA` por esa cantidad.

---

## 8. Medicamentos que no están en nuestro inventario (para comprar en otro lugar)

**Pedido**: poder agregar a una receta medicamentos que no están en nuestro
sistema, para que el paciente los consiga en otro establecimiento.

**Estado actual** (confirmado): `RecetaDetalle.IdMedicamento` es
`long` **no-nullable**, `[Required]` en el DTO — hoy es obligatorio elegir
un medicamento de nuestro catálogo, no hay alternativa de texto libre.

**Cambio propuesto**:
```sql
ALTER TABLE receta_detalle ALTER COLUMN id_medicamento BIGINT NULL;
ALTER TABLE receta_detalle ADD nombre_medicamento_externo NVARCHAR(200) NULL;
ALTER TABLE receta_detalle ADD CONSTRAINT ck_receta_detalle_medicamento
    CHECK (
        (id_medicamento IS NOT NULL AND nombre_medicamento_externo IS NULL) OR
        (id_medicamento IS NULL AND nombre_medicamento_externo IS NOT NULL)
    );
```
En el formulario de receta: un toggle por cada línea — "de nuestro
inventario" (selector normal) vs "externo" (solo nombre a mano).

**Importante — las dos cosas funcionan juntas, no son dos flujos separados**:
el `CHECK` de arriba es por LÍNEA de receta, no por receta completa. Una
misma receta (la misma consulta) puede tener varias líneas donde algunas
sean medicamentos de nuestro inventario y otras sean externas, mezcladas
libremente en la misma lista — el médico no tiene que elegir "esta receta es
toda interna o toda externa", decide línea por línea. Esto conecta directo
con la sección 7: solo las líneas internas (con `idMedicamento`) generan
movimiento de inventario al pagarse la factura; las externas nunca lo hacen
(no es nuestro stock).

---

## 9. Vista de expedientes: tarjeta por paciente → clic → sus consultas

**Pedido**: la vista de expedientes debe mostrar una tarjeta por paciente;
al hacer clic, mostrar las consultas de ese paciente y sus datos relevantes.

**Estado actual** (confirmado): `expedientes-lista.html` es una grilla
plana — una tarjeta por cada `HistorialClinico` individual, sin agrupar por
paciente.

**Cambio propuesto**: mismo patrón de 2 niveles que ya usamos en
Mantenimiento → Catálogos (tipo → valores): tarjeta por paciente (nombre,
cantidad de consultas) → al hacer clic, lista de sus consultas (fecha,
motivo, diagnóstico, médico) y desde cada una, acceso a su receta/examen/
hospitalización/constancia asociados. Reemplaza el botón "Nuevo registro"
que se quita en la sección 2.

---

## 10. Resumen de cambios de esquema (ver `scripts/motor_consultas_schema.sql`)

| Tabla | Cambio |
|---|---|
| `casos_emergencia` | + `id_cita` (nullable), + `id_sala` (nullable) |
| `citas` | + `requiere_operacion` (bit), + `id_tipo_operacion` (nullable, cat `TIPO_OPERACION` nuevo), `notas_operacion` (nullable) — **ya aplicado en Fase 1 sin `id_tipo_operacion`, falta agregar esa columna** |
| `receta_detalle` | `id_medicamento` pasa a nullable, + `nombre_medicamento_externo`, + CHECK |
| `factura_detalle` | + `id_receta_detalle` (nullable) |
| `recetas` | + `id_cita` (nullable) — **ya aplicado en Fase 1** |
| `constancia_medica` | tabla nueva (sección 1), con `UNIQUE` en `id_cita` |
| `cat_tipo_catalogo` / `cat_valor_catalogo` | + tipo `TIPO_OPERACION` sembrado (sin valores) |

> Nota: `requiere_operacion`/`notas_operacion` en `citas` y `id_cita` en
> `recetas` ya se implementaron en Fase 1 (backend + frontend). Lo que
> falta de esta tabla es: `id_tipo_operacion` en `citas`, todo lo de
> `casos_emergencia`, el `UNIQUE` de `constancia_medica`, y el resto de
> filas que aún no se tocó código (`receta_detalle`, `factura_detalle`).

---

## 11. Plan de fases (lo crítico primero)

1. **Fase 1 — el motor**: esquema de Citas + flag de operación (sección 5)
   + `idCita` en Receta (ya documentado antes) + endpoint agregador
   `GET /api/citas/{id}/atencion`. Sin esto, nada más tiene de dónde colgar.
2. **Fase 2 — pantalla de consulta**: panel de datos clínicos (genera
   HistorialClinico automático, sección 2) + acordeón con Recetario/
   Exámenes/Hospitalización acoplados (sección 3) + subida de resultado de
   examen (sección 6, sin cambios de esquema).
3. **Fase 3 — automatizaciones**: Emergencias → Cita (sección 4),
   descuento de inventario al pagar factura (sección 7) + medicamentos
   externos (sección 8).
4. **Fase 4 — constancia médica y vista de expedientes**: tabla nueva de
   constancias (sección 1) + expedientes de solo lectura agrupados por
   paciente (secciones 2 y 9).

## 12. Decisiones — confirmadas

1. **Constancia médica**: 1:1 por consulta (sección 1).
2. **Expedientes manuales**: se bloquean también en el backend, `idCita`
   obligatorio en el DTO de entrada (sección 2).
3. **Marcar para operación**: dispara una alerta/modal que exige capturar
   el tipo de operación (catálogo nuevo `TIPO_OPERACION`), no una
   automatización silenciosa (sección 5).
4. **Emergencias → Cita**: se copian tanto médico como **sala** del caso de
   emergencia a la cita generada — `CasoEmergencia` gana su propio `IdSala`
   (sección 4).
