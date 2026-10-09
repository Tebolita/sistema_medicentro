# Tablas pendientes de endpoint en la API

**Actualizado 2026-09-30:** el backend ya implementó prácticamente todo lo que se pedía en la versión anterior de este documento. Se deja el detalle de qué llegó y qué quedan como las únicas excepciones reales, para que el frontend sepa contra qué conectarse.

---

## Ya resuelto (antes no tenía ningún endpoint, ahora sí)

| Tabla(s) | Controlador | Notas |
|---|---|---|
| `citas`, `citas_historial`, `recordatorios` | `CitasController` (+ `RecordatoriosController` para pendientes) | Historial es de solo lectura (correcto: es un log de cambios, no se edita a mano). |
| `salas` | `SalasController` | CRUD completo. |
| `disponibilidad_medico` | `DisponibilidadMedicoController` | CRUD completo. |
| `convenios`, `paciente_convenio`, `convenio_cobertura` | `ConveniosController` | CRUD completo + afiliados y coberturas anidados. **Esto es lo que necesita el campo "Convenio" del formulario de factura — ya se puede conectar.** |
| `tratamientos`, `tratamiento_seguimiento` | `TratamientosController` | CRUD completo + seguimientos anidados. |
| `interaccion_medicamentos` | `InteraccionesMedicamentosController` | CRUD completo. |
| `tipos_examen`, `tipos_consentimiento` | `CatalogosPropiosController` | CRUD completo. |
| `resultados_examen` | `OrdenesLaboratorioController` (anidado bajo `/detalles/{id}/resultados`) | CRUD completo. |
| `cuentas_por_cobrar` | `CuentasPorCobrarController` | Solo lectura (`GET`, con filtro `?idPaciente=`) — es correcto, es un saldo consolidado/calculado, no una tabla que se edite a mano. |
| `notas_credito` | `NotasCreditoController` | CRUD completo. |
| `especialidades`, `puestos` | `RecursosHumanosController` | CRUD completo. |
| `permisos` | `PermisosController` | CRUD completo. |
| `rol_permiso` | `RolesController` (anidado bajo `/{idRol}/permisos`) | Asignar y quitar permisos de un rol. |
| `proveedores` | `ProveedoresController` | CRUD completo. **Esto es lo que necesita el campo "Proveedor" del formulario de item de inventario.** |
| `alertas_stock` | `InventarioFarmaciaController` (`GET /alertas`, `PUT /alertas/{id}`) | Listar y marcar atendida. |
| `notas_enfermeria` | `HospitalizacionesController` (anidado bajo `/{id}/notas-enfermeria`) | Listar y crear. |
| `reportes_generados` | `ReportesGeneradosController` | `GET` y `POST` únicamente — correcto, un reporte generado no se edita, se vuelve a generar. |
| `bitacora_auditoria` | `BitacoraAuditoriaController` | Solo lectura (`GET`) — correcto por diseño: un log de auditoría no debería poder editarse ni borrarse. |

## Ya resuelto (antes tenía endpoint incompleto, ahora completo)

| Tabla | Antes | Ahora |
|---|---|---|
| `usuarios` | Solo crear | CRUD completo (`GET` listar/uno, `POST`, `PUT`, `DELETE`). |
| `usuario_rol` | Solo asignar | `GET /usuarios/{id}/roles`, `POST`, `DELETE` — ya se puede ver y quitar roles. |
| `roles` | Nada | CRUD completo + permisos anidados. |
| `empleados` | Solo listado de médicos | CRUD completo (el filtro de médicos se mantiene aparte en `/medicos`). |
| `habitaciones` | Nada | CRUD completo + camas anidadas. |
| `camas` | Solo listar (suelto) | Ya se administran completas vía `/habitaciones/{id}/camas` (crear, editar, dar de baja). El `GET` suelto de `CamasController` se queda como un listado rápido aparte. |
| `aseguradoras` | Solo listar | CRUD completo. |
| `items_inventario` | Sin editar ni dar de baja | Ahora tiene `PUT` y `DELETE`. |
| `ordenes_medicas_hospitalizacion` | Solo agregar | Ahora tiene `GET` individual, `PUT`, `DELETE`. |
| `cat_tipo_catalogo` / `cat_valor_catalogo` | Solo listar valores | `POST` tipos, `POST`/`PUT`/`DELETE` valores. **Sigue faltando `GET /api/catalogos/tipos`** (listar TODOS los tipos que existen) — ver sección de abajo. |
| `pagos` | Sin anular | `PUT /facturas/{id}/pagos/{idPago}/anular`. |

---

## Lo único que sigue sin backend

Después de esta revisión, no queda ninguna tabla usada por el frontend sin su endpoint correspondiente. Las únicas ausencias son deliberadas por el tipo de dato (bitácora, reportes generados y cuentas por cobrar son de solo lectura/generación, no de mantenimiento manual).

**Pendiente real, pero fuera del backend:** `libro de actas` (Recepción) no tiene tabla en el esquema — no es un caso de "falta el endpoint", es un concepto que no existe en el diseño de base de datos. Ver conversación aparte sobre si conviene reusar `historial_clinico` con un tipo de registro nuevo, o pedir una tabla propia.

### ~~`GET /api/catalogos/tipos` (listar todos los tipos de catálogo)~~ — ✅ Resuelto

El backend ya lo tiene, aunque con una forma un poco distinta a la propuesta
original: es `GET /api/catalogos` (sin el `/tipos`, ya que la ruta base del
controlador ya es `api/catalogos`), y de regalo devuelve cada tipo **con sus
valores activos ya anidados** (`CatalogoTipoDto.Valores`), así que el
frontend ni siquiera necesita pedirlos aparte uno por uno. `catalogos-lista.ts`
y `catalogos.service.ts` ya se actualizaron para usarlo: la lista curada a
mano (`TIPOS_CATALOGO_CONOCIDOS`) y el truco de recordar catálogos nuevos en
`localStorage` ya no son la fuente de verdad, solo le dan un ícono más
específico a los códigos que el frontend ya conocía de antes.

### ~~`PUT /api/usuarios/{id}/contrasena`~~ — ✅ Resuelto, pero distinto a lo pedido

El backend ya lo implementó, pero como un **reset sin verificación** en vez
de "cambiar mi propia contraseña confirmando la actual": el DTO real es
`CambiarContrasenaDto { NuevaContrasena, RequiereCambioPassword? }` — no
tiene `ContrasenaActual` en absoluto, y el servicio nunca valida nada contra
el hash guardado. Cualquiera con sesión puede cambiarle la contraseña a
cualquier usuario (por id) sin saber la suya.

`usuarios.service.ts`/`mi-cuenta.ts` ya se actualizaron para hablar con el
DTO real, y se quitó el campo "Contraseña actual" del formulario de **Mi
cuenta** (decisión del equipo: no tenía sentido pedirlo si el backend no lo
revisa — daba una falsa sensación de seguridad).

**Si en algún momento se quiere la verificación real** (recomendado, sobre
todo si este mismo endpoint se llega a exponer para que el usuario cambie su
propia contraseña, no solo para que un admin resetee la de otro), haría
falta agregar `ContrasenaActual` al DTO y validarla con `IPasswordHasher`
antes de cambiar el hash, igual que en el login — pero eso es una decisión
de producto, no se ha pedido todavía.

---

## Qué sigue del lado del frontend

- Pacientes, Pólizas, Hospitalización, Laboratorio, Emergencias, Expedientes — otro equipo las está conectando a su API real.
- Citas / Consultas Externas — ahora sí se puede conectar por primera vez.
- ✅ Convenios, Proveedores, Catálogos, Usuarios, Roles, Permisos, Empleados, Aseguradoras, Salas, Habitaciones, Puestos, Especialidades, Tipos de consentimiento, Tipos de examen — ya tienen su pantalla en Mantenimiento.
- **Libro de actas** — sorpresa de esta revisión: `ActasController` ya tiene CRUD completo (no se había pedido explícitamente, pero ya está). Nadie ha construido el frontend todavía; la pantalla de Recepción sigue mostrando datos de ejemplo (`libro-actas.ts`).

## Cómo se armó esta actualización

Se repitió la comparación anterior (tablas del esquema real vs. `entity.ToTable(...)` en `Data/MedicentroDbContext.cs`) y se revisaron los atributos `[Http*]` de **todos** los controladores en `Controllers/` y `Servicios/*Controller.cs` a la fecha de este documento.
