# Pendientes y mejoras — MediCentro

Estado del sistema al 2026-09-07. Este archivo es un mapa de qué está construido, qué falta y qué se podría mejorar, para no perder el hilo entre sesiones de trabajo.

**Las 8 categorías del menú ya tienen su módulo real construido** (Recepción, Seguros Médicos, Expedientes Clínicos, Laboratorio y Diagnóstico, Emergencias, Hospitalización, Farmacia, Facturación y Cobros). Lo que queda pendiente ahora es más profundo: funcionalidad transversal (backend real, login, catálogos dinámicos), sub-flujos que se dejaron fuera de alcance a propósito (ver "Fuera del menú actual"), y el módulo de Reportes que ni siquiera tiene categoría todavía.

## Módulos completos (funcionales, con datos mock en memoria)

| Categoría | Pantallas | Se apoya en (esquema real) |
|---|---|---|
| **Recepción** | Registro de pacientes, listado/búsqueda de pacientes, libro de actas, consulta externa | `pacientes`, `paciente_contacto_emergencia`, `paciente_alergia`, `paciente_antecedente`, `citas` |
| **Seguros Médicos** | Listado y registro de pólizas (Validación Mediprocesos, Copago, Gestión Mi Cope) | `polizas_seguro`, `aseguradoras` |
| **Expedientes Clínicos** | Listado y registro de fichas (pediátrica/externa/ingresado/evolución), con diferencias por tipo | `historial_clinico` |
| **Laboratorio y Diagnóstico** | Listado y registro de órdenes de examen (laboratorio, ECG, rayos X, ultrasonido) | `ordenes_laboratorio`, `orden_detalle`, `tipos_examen` |
| **Emergencias** | Sala de casos por triaje (Atención prioritaria) + Hoja de compromiso de pago | Compromiso de pago: `consentimientos_informados` / `tipos_consentimiento`. Atención prioritaria: sin tabla real, ver nota abajo |
| **Hospitalización** | Listado de ingresos, ingreso/alta, órdenes médicas (general/enfermería/medicación/anestesia) por hospitalización | `hospitalizaciones`, `ordenes_medicas_hospitalizacion`. `habitaciones`/`camas` como catálogo mock (`CAMAS`), `notas_enfermeria` fuera de alcance por ahora |
| **Farmacia** | Inventario de medicamentos + movimientos (venta/entrada/ajuste/merma), recetario (internas y Mediprocesos) | `items_inventario` (filtrado a medicamentos), `movimientos_inventario`, `recetas`, `receta_detalle`. `medicamentos` como catálogo mock (`MEDICAMENTOS`) |
| **Facturación y Cobros** | Facturas (SAT/Digefact) con detalle y cálculo de IVA, pagos/recibos de cobro | `facturas`, `factura_detalle`, `pagos`. `cuentas_por_cobrar` y `notas_credito` fuera de alcance por ahora |

Todas usan servicios en memoria (signals de Angular) que imitan la forma de una futura respuesta HTTP — reemplazar por llamadas reales cuando exista la API es principalmente cambiar el cuerpo de esos servicios, no las pantallas.

### Notas sobre Facturación y Cobros (2026-09-07)

- "Facturación SAT" vs "Facturación Digefact (copago seguro)" no tienen una columna de "certificador FEL" en el esquema para distinguirse — la diferencia real que se modeló es si la factura tiene o no una póliza asociada (`idPoliza`): con póliza = copago de seguro (Digefact), sin póliza = factura directa al paciente (SAT). El número de autorización FEL generado (mock) incluye el sufijo SAT/DIGEFACT solo para que se note la diferencia visualmente.
- "Formas de pago" y "Recibos de cobro" son dos vistas sobre la misma tabla `pagos`: "Formas de pago" abre directo el formulario para registrar un pago nuevo (elige la factura primero), "Recibos de cobro" es el historial/listado de pagos ya aplicados.
- Al registrar un pago que cubre el total de la factura, esta pasa automáticamente a estado "Pagada" — es una regla simple en el servicio, no contempla pagos parciales múltiples con seguimiento de saldo más allá del cálculo directo `total - pagado`.
- `cuentas_por_cobrar` y `notas_credito` quedaron fuera de este alcance (igual que resultados de laboratorio o notas de enfermería) — no hay pantalla de cartera vencida ni de anulación/devolución con nota de crédito.
- **Bug encontrado y corregido**: el subtotal/IVA/total de la factura usaban `computed()` de Angular leyendo directamente los controles del `FormArray` de detalle — pero `computed()` no seguimiento cambios de formularios reactivos (no son signals), así que el total se quedaba congelado en Q0.00 aunque se llenaran las líneas. Se corrigió recalculando a mano en una signal real cada vez que `detalles.valueChanges` emite. **Cualquier total/cálculo derivado de un FormGroup o FormArray en este proyecto debe alimentar una signal explícita vía `valueChanges`, nunca leer los controles directamente dentro de un `computed()`.**

### Notas sobre Farmacia (2026-09-07)

- "Venta de medicamentos" no usa una tabla de ventas propia (no existe en el esquema) — se modeló como un `MovimientoInventario` de tipo "salida" con motivo "Venta directa". Cuando exista Facturación y Cobros, lo ideal es generar también un cargo/factura al registrar la venta.
- "Recetas internas" y "Recetas Mediprocesos (sistema)" comparten la misma tabla `recetas`/`receta_detalle` — no hay columna para distinguir el origen de la receta en el esquema, así que "Mediprocesos" solo enfoca el buscador del mismo recetario (mismo patrón que "Validación Mediprocesos" en Seguros Médicos) en vez de fingir un campo de origen que no existe.
- **Bug encontrado y corregido**: en el formulario de receta (que tiene dos `FormGroup` separados — cabecera y cada detalle — en vez de uno solo), el `<form (ngSubmit)="guardar()">` no tenía `[formGroup]` en el propio `<form>`, así que Angular nunca activaba `FormGroupDirective` ahí. El botón "Guardar" disparaba un **submit nativo del navegador** (recarga de página) en vez de llamar a `guardar()`, perdiendo todo lo llenado silenciosamente. Se corrigió reemplazando el `<form>`/`ngSubmit` por un `<div>` con el botón usando `(click)="guardar()"` — el mismo patrón que ya usa `paciente-formulario` para sus formularios con múltiples grupos. **Revisar cualquier formulario futuro que combine más de un `FormGroup`/`FormArray` sin una `[formGroup]` raíz**: si el botón de guardar es `type="submit"` dentro de un `<form>` sin `[formGroup]`, tiene este mismo bug.

### Notas sobre Hospitalización (2026-09-07)

- Los 3 ítems "Órdenes médicas" / "Control de medicamentos" / "Hoja de anestesia" comparten una sola tabla real (`ordenes_medicas_hospitalizacion`, grupo `TIPO_ORDEN_HOSPITALIZACION`): se diferencian extendiendo los VALORES de ese catálogo (agregando "Medicación" y "Anestesia" a los ya existentes "médica"/"enfermería"), no agregando columnas nuevas. Cada ítem del menú abre el mismo formulario de "agregar orden" con el tipo pre-seleccionado.
- "Costo del paciente" no calcula nada todavía — depende del módulo de Facturación y Cobros (aún no construido). Por ahora el ítem solo enfoca el buscador de la lista de hospitalizaciones.
- `habitaciones` y `camas` son dos tablas reales en el esquema; se simplificaron en un solo catálogo mock `CAMAS` (id + etiqueta combinada "Habitación X · Cama Y") para no construir un CRUD de habitaciones que la entrevista no pidió. Si se necesita administrar el inventario de camas/habitaciones en sí, eso falta.
- `notas_enfermeria` (con `signosVitales` como JSON) quedó fuera de este alcance, similar a como se dejaron fuera los resultados de laboratorio.

### Notas sobre Emergencias (2026-09-07)

- **Atención prioritaria** no tiene tabla en el esquema compartido (no aparece en el mapa de módulos). Se modeló como un registro propio (`CasoEmergencia`, en memoria) con nivel de triaje (Rojo/Naranja/Amarillo/Verde/Azul, escala tipo Manchester/ESI) y estado (Esperando/En atención/Atendido/Referido). **Pendiente confirmar con el cliente** si esto debe vivir como extensión de `citas` o como tabla nueva propia cuando se defina la API real.
- **Hoja de compromiso de pago** sí se modeló sobre `ConsentimientoInformado` real (con un `TipoConsentimiento` fijo "Compromiso de pago - Emergencia"), pero el nombre/parentesco/teléfono del familiar responsable no tienen columna en esa tabla — se guardan como campos locales aparte (`nombreResponsable`, `idParentescoResponsable`, `telefonoResponsable`) en vez de forzarlos dentro de `idTestigo` (que es un id de persona del sistema, no un familiar externo). Si se agrega una columna o tabla relacionada para esto, migrar esos 3 campos ahí.

## Fuera del menú actual (no hay ni categoría todavía)

- **Reportes** — `reportes_generados` + vistas `vw_indicadores_clinicos` / `vw_indicadores_financieros`. Ningún ítem del menú apunta aquí hoy; habría que decidir si va dentro de otra categoría o si se agrega una nueva.
- **Resultados de examen** (`resultados_examen`) — el módulo de Laboratorio solo cubre la *solicitud* de exámenes, no la captura de resultados (texto, archivo adjunto, validación médica). Se dejó fuera a propósito por ser un alcance bastante más grande.
- **Seguridad / auditoría** (`bitacora_auditoria`, roles y permisos) — no hay pantalla de administración de usuarios/roles ni de consulta de bitácora.
- **Interacciones entre medicamentos** (`interaccion_medicamentos`) y **seguimiento de tratamientos** (`tratamiento_seguimiento`) — tablas ya modeladas en `tratamiento.model.ts` pero sin UI.
- **Notas de enfermería** (`notas_enfermeria`, con `signosVitales` como JSON) — Hospitalización solo cubre ingreso/alta y órdenes médicas, no el registro de notas de enfermería.
- **Administración de habitaciones/camas** (`habitaciones`, `camas`) — Hospitalización usa un catálogo mock fijo de camas; no hay pantalla para dar de alta/mantenimiento de habitaciones o camas reales.
- **Alertas de stock** (`alertas_stock`) — Farmacia calcula `bajoStock` por ítem y lo muestra en la lista, pero no genera/gestiona alertas como registros propios (sin pantalla de "alertas pendientes/atendidas").
- **Proveedores** (`proveedores`) — Farmacia no tiene pantalla para administrar proveedores; los ítems de inventario no capturan `idProveedor` en el formulario todavía.
- **Cuentas por cobrar y notas de crédito** (`cuentas_por_cobrar`, `notas_credito`) — Facturación y Cobros solo cubre facturas y pagos completos; no hay cartera vencida ni anulación/devolución con nota de crédito.

## Funcionalidad transversal pendiente (afecta a todo el sistema)

- **Sin backend real**: todo vive en servicios en memoria; al recargar la página o navegar con `page.goto` se pierde lo agregado en la sesión. Migrar a `HttpClient` es el paso natural una vez exista la API.
- **Catálogos hardcodeados**: géneros, tipos de documento, estados, aseguradoras, médicos, etc. están en arrays fijos (`*-catalogos.ts`) en vez de venir de `cat_valor_catalogo`. Cuando exista el endpoint de catálogos, esos archivos se reemplazan por un servicio que los consulte.
- **Autenticación/login**: no existe pantalla de login ni control de sesión; `cerrarSesion()` en el header solo hace `console.log`.
- **Notificaciones**: la campana del header muestra un contador fijo (`alertCount = 3`), no hay notificaciones reales.
- **Perfil y configuración de usuario**: el menú del avatar no tiene pantallas de "Perfil" ni "Configuración" implementadas.
- **Roles y permisos**: ningún control de acceso todavía — cualquier usuario "ve" todo el sistema.
- **Signos vitales estructurados**: en Expedientes Clínicos se guardan como texto libre dentro de `notas` porque el esquema no tiene columnas dedicadas; si se agregan esas columnas a la BD, vale la pena migrar a campos numéricos con su propio control.

## Deuda técnica

- El presupuesto de tamaño de bundle (`angular.json`) ya se subió una vez (500kB→1MB de advertencia, 1MB→2MB de error) porque el build empezó a fallar; con cada módulo nuevo el bundle sigue creciendo (~1.22MB con Facturación) y probablemente haya que revisar lazy-loading de rutas en vez de seguir subiendo el límite.
- Ver la nota de Farmacia arriba sobre el bug de `<form (ngSubmit)>` sin `[formGroup]` en formularios con múltiples `FormGroup`/`FormArray` — vale la pena una pasada rápida por los formularios existentes para confirmar que ninguno más tiene este patrón (ya se revisó: todos los demás sí tienen `[formGroup]="form"` en su `<form>`).
- Se encontró y corrigió un bug visual menor en el formulario de Hospitalización: el hint del campo "Fecha de egreso" se envolvía a 2 líneas y se superponía con el campo siguiente por falta de espacio vertical en el grid (`gap` insuficiente). Si aparecen hints largos en otros formularios con el mismo patrón de grid, revisar lo mismo.
- No hay pruebas automatizadas (unit tests ni e2e) — la verificación hasta ahora ha sido manual vía Playwright en cada sesión de trabajo.
- RRHH quedó fuera de alcance a propósito (vacaciones, turnos, asistencia) según lo indicado al compartir el esquema.

## Ideas / mejoras menores que han salido en el camino

- Extender el patrón de "un tipo de registro, un formulario que se adapta" (usado en Expedientes Clínicos y ahora en las órdenes de Hospitalización) a Farmacia, que también tiene varios sub-flujos parecidos entre sí.
- Revisar si "Copago consulta / hospital" en Seguros Médicos necesita su propia vista filtrada (hoy es idéntica a la lista general de pólizas) — mismo caso que "Costo del paciente" en Hospitalización.
- Íconos y colores de categoría ya están definidos en `menu-data.ts` — reutilizarlos consistentemente en los módulos nuevos (Farmacia `#00838f`, Facturación `#5d4037`).
- Cuando exista Facturación y Cobros, conectar "Costo del paciente" en Hospitalización con los cargos reales de la estancia (hoy no calcula nada).
- Vincular "Nuevo compromiso de pago" desde la ficha de un caso de emergencia (hoy son dos pantallas independientes; tendría sentido un botón directo cuando el caso es de triaje alto).
- Si más adelante se registra un paciente durante la atención de un caso "walk-in", falta un flujo para vincular el `CasoEmergencia.idPaciente` (hoy queda `null` permanentemente una vez creado, no hay edición para "convertir" un walk-in en paciente registrado).
- Conectar "Venta de medicamentos" (Farmacia) con Facturación: hoy una venta solo descuenta inventario, no genera ninguna factura ni línea de cobro.
- Con Facturación construida, retomar "Costo del paciente" en Hospitalización y "Copago consulta / hospital" en Seguros Médicos para que muestren cargos/facturas reales en vez de solo enfocar el buscador.
