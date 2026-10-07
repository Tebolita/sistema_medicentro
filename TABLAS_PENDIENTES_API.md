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
| `cat_tipo_catalogo` / `cat_valor_catalogo` | Solo listar valores | `POST` tipos, `POST`/`PUT`/`DELETE` valores — **esto es lo que necesita el futuro módulo de Catálogos.** |
| `pagos` | Sin anular | `PUT /facturas/{id}/pagos/{idPago}/anular`. |

---

## Lo único que sigue sin backend

Después de esta revisión, no queda ninguna tabla usada por el frontend sin su endpoint correspondiente. Las únicas ausencias son deliberadas por el tipo de dato (bitácora, reportes generados y cuentas por cobrar son de solo lectura/generación, no de mantenimiento manual).

**Pendiente real, pero fuera del backend:** `libro de actas` (Recepción) no tiene tabla en el esquema — no es un caso de "falta el endpoint", es un concepto que no existe en el diseño de base de datos. Ver conversación aparte sobre si conviene reusar `historial_clinico` con un tipo de registro nuevo, o pedir una tabla propia.

---

## Qué sigue del lado del frontend

Con esto, el trabajo pendiente deja de ser "pedir endpoints" y pasa a ser **conectar cada módulo a su API real**, igual que se hizo con Farmacia y Facturación:

- Pacientes, Pólizas, Hospitalización, Laboratorio, Emergencias, Expedientes — ya tenían backend antes y ahora tienen aún más (notas de enfermería, resultados de examen, etc.).
- Citas / Consultas Externas — ahora sí se puede conectar por primera vez.
- Convenios — se puede reemplazar el campo numérico del formulario de factura por el selector real.
- Proveedores — se puede agregar el selector real al formulario de item de inventario.
- Catálogos — se puede construir la pantalla de mantenimiento que se tenía pendiente.
- Usuarios, Roles, Permisos, Empleados — se puede construir una pantalla de administración/seguridad si se prioriza.

## Cómo se armó esta actualización

Se repitió la comparación anterior (tablas del esquema real vs. `entity.ToTable(...)` en `Data/MedicentroDbContext.cs`) y se revisaron los atributos `[Http*]` de **todos** los controladores en `Controllers/` y `Servicios/*Controller.cs` a la fecha de este documento.
