# Solicitud: endpoints para ver y reactivar registros eliminados

El backend nunca borra físicamente un registro: cada `DELETE` solo pone
`Activo = 0` (baja lógica). Eso está bien para que el sistema deje de
mostrarlos, pero hoy **no hay ninguna forma de consultarlos de vuelta**: una
vez dado de baja, un registro desaparece de la vista del administrador para
siempre, aunque siga en la base de datos. Si alguien elimina algo por error,
o si el administrador necesita auditar qué se ha borrado y por qué, no hay
cómo.

Esta es la misma lógica que ya pedimos para cada tabla en
`TABLAS_PENDIENTES_API.md`, pero ahora del lado de "¿qué se eliminó?" en vez
de "¿qué existe?". Para cada entidad pedimos **dos** endpoints nuevos:

- `GET .../eliminados` — lista los registros con `Activo = 0` (mismo shape
  que el GET normal, para reusar la UI de lista).
- `PUT .../{id}/reactivar` — pone `Activo = 1` de vuelta (deshacer el borrado).

No implica tocar el borrado actual (sigue siendo lógico, como ya está); solo
añade la forma de consultarlo y revertirlo.

Esto quedará protegido para que **solo el administrador** pueda verlo — el
frontend ya está preparado con esa idea en mente (ver nota en
`medicamentos-lista.ts`), pero necesita que el backend exponga primero los
datos.

---

## Ya en uso por el frontend (máxima prioridad)

El frontend de Medicamentos **ya llama a estos endpoints** (pestaña
"Eliminados" en el catálogo de medicamentos) y hoy falla silenciosamente
porque no existen todavía:

| Entidad | Endpoint actual (baja) | Falta: listar eliminados | Falta: reactivar |
|---|---|---|---|
| Medicamentos | `DELETE /api/medicamentos/{id}` | `GET /api/medicamentos/eliminados` | `PUT /api/medicamentos/{id}/reactivar` |

---

## Entidades principales (con pantalla de mantenimiento en el frontend)

Estas son las que un administrador va a querer auditar o restaurar primero,
porque tienen su propia lista en el sistema:

| Entidad | Endpoint actual (baja) | Propuesto: listar eliminados | Propuesto: reactivar |
|---|---|---|---|
| Pacientes | `DELETE /api/pacientes/{id}` | `GET /api/pacientes/eliminados` | `PUT /api/pacientes/{id}/reactivar` |
| Pólizas | `DELETE /api/polizas/{id}` | `GET /api/polizas/eliminadas` | `PUT /api/polizas/{id}/reactivar` |
| Expedientes (historial clínico) | `DELETE /api/expedientes/{id}` | `GET /api/expedientes/eliminados` | `PUT /api/expedientes/{id}/reactivar` |
| Casos de emergencia | `DELETE /api/casos-emergencia/{id}` | `GET /api/casos-emergencia/eliminados` | `PUT /api/casos-emergencia/{id}/reactivar` |
| Compromisos de pago | `DELETE /api/compromisos-pago/{id}` | `GET /api/compromisos-pago/eliminados` | `PUT /api/compromisos-pago/{id}/reactivar` |
| Citas | `DELETE /api/citas/{id}` | `GET /api/citas/eliminadas` | `PUT /api/citas/{id}/reactivar` |
| Recetas | `DELETE /api/recetas/{id}` | `GET /api/recetas/eliminadas` | `PUT /api/recetas/{id}/reactivar` |
| Tratamientos | `DELETE /api/tratamientos/{id}` | `GET /api/tratamientos/eliminados` | `PUT /api/tratamientos/{id}/reactivar` |
| Interacciones de medicamentos | `DELETE /api/interacciones-medicamentos/{id}` | `GET /api/interacciones-medicamentos/eliminadas` | `PUT /api/interacciones-medicamentos/{id}/reactivar` |
| Convenios | `DELETE /api/convenios/{id}` | `GET /api/convenios/eliminados` | `PUT /api/convenios/{id}/reactivar` |
| Proveedores | `DELETE /api/proveedores/{id}` | `GET /api/proveedores/eliminados` | `PUT /api/proveedores/{id}/reactivar` |
| Aseguradoras | `DELETE /api/aseguradoras/{id}` | `GET /api/aseguradoras/eliminadas` | `PUT /api/aseguradoras/{id}/reactivar` |
| Empleados | `DELETE /api/empleados/{id}` | `GET /api/empleados/eliminados` | `PUT /api/empleados/{id}/reactivar` |
| Habitaciones | `DELETE /api/habitaciones/{id}` | `GET /api/habitaciones/eliminadas` | `PUT /api/habitaciones/{id}/reactivar` |
| Salas | `DELETE /api/salas/{id}` | `GET /api/salas/eliminadas` | `PUT /api/salas/{id}/reactivar` |
| Disponibilidad de médico | `DELETE /api/disponibilidad-medico/{id}` | `GET /api/disponibilidad-medico/eliminadas` | `PUT /api/disponibilidad-medico/{id}/reactivar` |
| Items de inventario (farmacia) | `DELETE /api/inventario-farmacia/{id}` | `GET /api/inventario-farmacia/eliminados` | `PUT /api/inventario-farmacia/{id}/reactivar` |
| Notas de crédito | `DELETE /api/notas-credito/{id}` | `GET /api/notas-credito/eliminadas` | `PUT /api/notas-credito/{id}/reactivar` |
| Órdenes de laboratorio | `DELETE /api/ordenes-laboratorio/{id}` | `GET /api/ordenes-laboratorio/eliminadas` | `PUT /api/ordenes-laboratorio/{id}/reactivar` |
| Hospitalizaciones | `DELETE /api/hospitalizaciones/{id}` | `GET /api/hospitalizaciones/eliminadas` | `PUT /api/hospitalizaciones/{id}/reactivar` |
| Usuarios | `DELETE /api/usuarios/{id}` | `GET /api/usuarios/eliminados` | `PUT /api/usuarios/{id}/reactivar` |
| Roles | `DELETE /api/roles/{id}` | `GET /api/roles/eliminados` | `PUT /api/roles/{id}/reactivar` |
| Permisos | `DELETE /api/permisos/{id}` | `GET /api/permisos/eliminados` | `PUT /api/permisos/{id}/reactivar` |
| Especialidades | `DELETE /api/recursos-humanos/especialidades/{id}` | `GET /api/recursos-humanos/especialidades/eliminadas` | `PUT /api/recursos-humanos/especialidades/{id}/reactivar` |
| Puestos | `DELETE /api/recursos-humanos/puestos/{id}` | `GET /api/recursos-humanos/puestos/eliminados` | `PUT /api/recursos-humanos/puestos/{id}/reactivar` |

## Sub-entidades anidadas (menor prioridad)

Estas viven dentro de otra (camas de una habitación, afiliados de un
convenio, etc.). Son útiles para auditoría, pero no tienen una pantalla de
lista propia en el frontend hoy, así que se pueden dejar para después:

| Entidad | Endpoint actual (baja) | Propuesto: listar eliminados |
|---|---|---|
| Camas (de una habitación) | `DELETE /api/habitaciones/{id}/camas/{idCama}` | `GET /api/habitaciones/{id}/camas/eliminadas` |
| Afiliados (de un convenio) | `DELETE /api/convenios/{id}/afiliados/{idPacienteConvenio}` | `GET /api/convenios/{id}/afiliados/eliminados` |
| Coberturas (de un convenio) | `DELETE /api/convenios/{id}/coberturas/{idConvenioCobertura}` | `GET /api/convenios/{id}/coberturas/eliminadas` |
| Recordatorios (de una cita) | `DELETE /api/citas/{id}/recordatorios/{idRecordatorio}` | `GET /api/citas/{id}/recordatorios/eliminados` |
| Resultados (de una orden de laboratorio) | `DELETE /api/ordenes-laboratorio/{id}/detalles/{idDetalle}/resultados/{idResultado}` | `GET /api/ordenes-laboratorio/{id}/resultados/eliminados` |
| Seguimientos (de un tratamiento) | `DELETE /api/tratamientos/{id}/seguimientos/{idSeguimiento}` | `GET /api/tratamientos/{id}/seguimientos/eliminados` |
| Órdenes médicas (de una hospitalización) | `DELETE /api/hospitalizaciones/{id}/ordenes/{idOrdenMedica}` | `GET /api/hospitalizaciones/{id}/ordenes/eliminadas` |
| Valores de catálogo | `DELETE /api/catalogos/{tipo}/valores/{id}` | `GET /api/catalogos/{tipo}/valores/eliminados` |

## No aplica

- **Asignaciones simples** (quitar un rol a un usuario, quitar un permiso a
  un rol: `DELETE /api/usuarios/{id}/roles/{idRol}`,
  `DELETE /api/roles/{id}/permisos/{idPermiso}`) no son "registros
  eliminados" que valga la pena revisar — son relaciones que se
  quitan/ponen libremente, no bajas que alguien necesite auditar o revertir.

---

# Otras solicitudes pendientes al backend

## 1. CRUD de camas (como entidad propia, no solo anidada)

Hoy `camas` solo se maneja anidada bajo `habitaciones`
(`POST/PUT/DELETE /api/habitaciones/{id}/camas/...`). Falta un CRUD propio
de cama (`GET /api/camas`, `GET /api/camas/{id}`, `PUT /api/camas/{id}`)
para poder, por ejemplo, actualizar solo el estado de una cama sin pasar por
el endpoint completo de la habitación — lo necesita la corrección del punto
3 de abajo.

## 2. Hospitalización — Validar cama ocupada

**Problema**: `POST /api/Hospitalizaciones` no valida que la cama esté
libre antes de crear una hospitalización. Hoy se pueden crear 2
hospitalizaciones activas en la misma cama.

**Verificación realizada**:

```sql
SELECT h.id_hospitalizacion, c.id_cama, h.activo
FROM hospitalizaciones h
INNER JOIN camas c ON h.id_cama = c.id_cama
WHERE h.activo = 1;
-- Devuelve 2 hospitalizaciones activas usando la misma cama.
```

**Impacto**:
- A corto plazo: se pueden crear hospitalizaciones duplicadas en la misma
  cama, un error operativo grave en un hospital.
- A largo plazo: si los datos se acumulan con hospitalizaciones duplicadas,
  los reportes de ocupación de camas van a estar mal.

**Solución propuesta**: antes de insertar, validar que no exista otra
hospitalización activa con el mismo `id_cama`:

```csharp
var camaOcupada = await _context.Hospitalizaciones
    .AnyAsync(h => h.IdCama == dto.IdCama
                && h.Activo == true
                && h.IdEstadoHospitalizacion == 65); // 65 = "Activa"

if (camaOcupada)
{
    return BadRequest("La cama ya está ocupada por otro paciente.");
}
```

## 3. Hospitalización — Actualizar estado de cama

**Problema**: ninguno de estos endpoints actualiza `camas.id_estado_cama`:

- `POST /api/Hospitalizaciones` (al crear)
- `PUT /api/Hospitalizaciones/{id}` (al dar de alta)
- `DELETE /api/Hospitalizaciones/{id}` (al eliminar)

**Verificación realizada**:

```sql
SELECT id_cama, numero_cama, id_estado_cama FROM camas;
-- Todas las camas siguen con id_estado_cama = 62 (Libre),
-- aunque hay 2 hospitalizaciones activas usándolas.
```

**Impacto**:
- A corto plazo: el estado de la cama no refleja la realidad (dice "Libre"
  cuando está ocupada).
- A largo plazo: el estado de las camas queda desincronizado de la
  realidad. Los reportes de ocupación, disponibilidad, y facturación de
  días-cama serán incorrectos.

**Comportamiento esperado**:
- Al crear hospitalización → marcar la cama con `id_estado_cama = 63`
  (Ocupada).
- Al dar de alta (fecha de egreso) → marcar la cama con
  `id_estado_cama = 62` (Libre).
- Al eliminar (borrado lógico) → marcar la cama con `id_estado_cama = 62`
  (Libre).

**Solución propuesta**: en cada uno de los endpoints, actualizar la cama
correspondiente:

```csharp
// Al crear:
var cama = await _context.Camas.FindAsync(dto.IdCama);
cama.IdEstadoCama = 63; // Ocupada

// Al dar de alta:
var cama = await _context.Camas.FindAsync(hospitalizacion.IdCama);
cama.IdEstadoCama = 62; // Libre
```

## 4. Libro de actas (Recepción) — módulo nuevo, no existe tabla

No hay tabla para esto en el esquema real (ver `TABLAS_PENDIENTES_API.md`).
Se necesita desde cero:

1. **Tabla `libro_actas`**: `id_acta` (PK), `id_paciente` (FK `pacientes`),
   `motivo_ingreso` (obligatorio), `id_atendido_por` (FK `empleados`),
   `fecha_hora`, `observaciones` (opcional), y las columnas de auditoría
   (`activo`, `fecha_creacion`, `fecha_modificacion`,
   `id_usuario_creacion`, `id_usuario_modificacion`).
2. **Entidad, DTOs** (`ActaDto` / `ActaInputDto`), **servicio** y
   **controlador** con `[Authorize]`, igual que los demás módulos
   (`ApiResponse` y borrado lógico).
3. **Endpoints**: `GET /api/actas` (activas, más reciente primero),
   `GET /api/actas/{id}`, `POST`, `PUT` y `DELETE /api/actas/{id}`. Que
   valide que existan el paciente y el empleado (404 si no).
4. Para "Atendido por": `GET /api/puestos`, o un filtro
   `GET /api/empleados?idPuesto=X`, porque `EmpleadoDto` solo trae
   `idPuesto`.

## 5. Registrar quién hizo cada baja (y cada alta/edición)

**Problema**: todas las tablas tienen `id_usuario_creacion` e
`id_usuario_modificacion`, y los DTOs ya los exponen (`IdUsuarioCreacion`,
`IdUsuarioModificacion`), pero **ningún servicio los llena nunca**. Se
revisaron como ejemplo `MedicamentosService.EliminarAsync` y
`FacturasService` (anular factura):

```csharp
// MedicamentosService.cs — EliminarAsync
medicamento.Activo = false;
medicamento.FechaModificacion = DateTime.UtcNow;
// Nunca se toca IdUsuarioModificacion.
await _context.SaveChangesAsync();
```

Mismo patrón en el resto de los `Eliminar...Async` (y en los `Crear...Async`,
que tampoco llenan `IdUsuarioCreacion`). Por eso en el frontend, la pantalla
de "Eliminados" de Medicamentos/Inventario/Facturas siempre muestra "—" en
quién hizo la baja: el dato nunca se guardó.

**Impacto**: sin esto no hay forma de auditar quién eliminó, creó o editó
un registro — justo el caso de uso que pidió el administrador (revisar qué
se borró y quién lo hizo).

**De dónde sacar el usuario actual**: el JWT ya lleva el id del usuario en
`ClaimTypes.NameIdentifier` (`Seguridad/JwtService.cs`):

```csharp
new(ClaimTypes.NameIdentifier, usuario.IdUsuario.ToString()),
```

**Solución propuesta**: inyectar `IHttpContextAccessor` (ya está registrado
en `Program.cs`: `builder.Services.AddHttpContextAccessor();`) en cada
servicio y usarlo en los métodos de crear/editar/eliminar:

```csharp
private long? IdUsuarioActual()
{
    var valor = _httpContextAccessor.HttpContext?.User
        .FindFirst(ClaimTypes.NameIdentifier)?.Value;
    return long.TryParse(valor, out var id) ? id : null;
}

// Al crear:
medicamento.IdUsuarioCreacion = IdUsuarioActual();

// Al editar o eliminar:
medicamento.IdUsuarioModificacion = IdUsuarioActual();
medicamento.FechaModificacion = DateTime.UtcNow;
```

Como es el mismo cambio repetido en cada servicio, podría valer la pena un
helper compartido (p. ej. en una clase base o un método de extensión sobre
`ControllerBase`/`HttpContext`) en vez de repetirlo 20 veces.

**Prioridad**: al menos en Medicamentos, Inventario de farmacia, Facturas y
ahora también **Salas** (las 4 pantallas que ya muestran "Creado por" /
"Modificado por" en el frontend); idealmente en todos los
`Eliminar...Async` y `Crear...Async` del sistema.

## 6. Habitaciones y Camas: a estas DOS les falta hasta la columna

**Problema distinto al del punto 5**: en `habitaciones` y `camas`, el hueco
no es que el campo exista y nadie lo llene — **las columnas
`id_usuario_creacion` / `id_usuario_modificacion` no existen en la tabla**
(se puede confirmar en `scripts/MEDICENTRO_schema_version_Arturo_final.sql`,
líneas de `CREATE TABLE [dbo].[habitaciones]` y `[dbo].[camas]`: tienen
`fecha_creacion`/`fecha_modificacion` pero no las columnas de usuario que sí
tiene casi cualquier otra tabla del sistema). Por eso ahora mismo no hay
forma de mostrar "Creado por" ahí, ni agregando código nuevo del lado del
backend — hace falta la columna primero.

**Solución propuesta**:

```sql
ALTER TABLE dbo.habitaciones ADD id_usuario_creacion BIGINT NULL, id_usuario_modificacion BIGINT NULL;
ALTER TABLE dbo.camas        ADD id_usuario_creacion BIGINT NULL, id_usuario_modificacion BIGINT NULL;
```

Y del lado del código: agregar `IdUsuarioCreacion`/`IdUsuarioModificacion` a
`Entidades/Habitacion.cs`, `Entidades/Cama.cs`, `Dto/Habitaciones/HabitacionDto.cs`
y `Dto/Habitaciones/CamaDto.cs`, y llenarlos en `HabitacionesService`
(`CrearAsync`, `EditarAsync`, `EliminarAsync`, `AgregarCamaAsync`,
`EditarCamaAsync`) igual que se propone en el punto 5.
