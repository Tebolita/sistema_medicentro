# Auditoría: qué falta del lado de Mantenimiento

**Fecha:** 2026-10-09
**Contexto:** con los 6 módulos clínicos del otro equipo ya integrados (ver `AUDITORIA_DDL_IDS_QUEMADOS.md`), se revisó qué le falta específicamente a **Mantenimiento** para considerar el sistema completo: capacidad del backend que es claramente de catálogo/configuración pero todavía no tiene pantalla.

Mantenimiento hoy tiene 14 pantallas completas y conectadas: Catálogos del sistema, Proveedores, Convenios, Usuarios, Roles, Permisos, Aseguradoras, Salas, Habitaciones, Tipos de consentimiento, Tipos de examen, Empleados, Puestos, Especialidades.

---

## Pantallas que faltan (backend ya existe, frontend no)

### 1. Papelera / Eliminados global

El backend tiene `EliminadosController` + `EliminadosService`: un endpoint genérico que ya cubre **~29 tipos de recursos** (medicamentos, pacientes, polizas, expedientes, casos-emergencia, compromisos-pago, interacciones-medicamentos, proveedores, aseguradoras, empleados, salas, disponibilidad-medico, inventario-farmacia, notas-credito, usuarios, roles, permisos, especialidades, puestos, actas, tipos-examen, tipos-consentimiento, citas, recetas, tratamientos, convenios, habitaciones, laboratorio, hospitalizaciones, facturas).

**Nadie lo usa.** En su lugar, 7 pantallas (`empleados-lista`, `permisos-lista`, `puestos-lista`, `tipos-consentimiento-lista`, `tipos-examen-lista`, `inventario-lista`, `medicamentos-lista`) armaron su propio tab de "eliminados" a mano, cada una contra su propio endpoint específico. El resto (proveedores, aseguradoras, salas, usuarios, roles, convenios, habitaciones, actas, notas-credito, interacciones-medicamentos, disponibilidad-medico, citas, recetas, tratamientos) **no tiene ninguna forma de ver o reactivar un registro borrado**.

**Recomendación:** una pantalla "Papelera" en Mantenimiento (selector de tipo de recurso + lista + botón reactivar) usando este endpoint genérico tal cual ya existe. Cubre de un solo golpe todo lo que hoy no tiene esa opción.

### 2. Disponibilidad de médicos

`DisponibilidadMedicoController` ya tiene CRUD completo (plantilla semanal recurrente: día/hora inicio/hora fin por médico). El frontend ya tiene `disponibilidad.service.ts` completo y conectado a la API real — pero **ninguna pantalla lo inyecta**.

Es conceptualmente lo mismo que Puestos/Especialidades (una plantilla de configuración, no una transacción en vivo), así que encaja de forma natural en Mantenimiento → Recursos Humanos, junto a Empleados.

**Recomendación:** construir la pantalla "Disponibilidad de médicos".

### 3. Interacciones de medicamentos

`InteraccionesMedicamentosController` tiene CRUD completo sobre un catálogo de referencia (pares de medicamentos + severidad/descripción) que Farmacia necesita para alertas. **Cero uso en el frontend** — ni servicio ni componente.

**Recomendación:** pantalla en Mantenimiento, grupo "farmacia".

### 4. Bitácora de auditoría global

`BitacoraAuditoriaController` soporta filtrar por `tablaAfectada` y por `idUsuario`. Hoy se consume solo en pedazos: 4 módulos clínicos (`casos-emergencia`, `compromisos-pago`, `hospitalizaciones`, `laboratorio`) muestran un historial acotado a su propia tabla. **Nadie usa el filtro por `idUsuario`, y no hay una vista general** ("qué hizo este usuario en todo el sistema" / "qué pasó con cualquier registro").

**Recomendación:** pantalla en Mantenimiento → Seguridad, filtrable por usuario y/o tabla, reutilizando el endpoint existente sin cambios.

---

## Revisado y sin pendientes

- **`RecursosHumanosController`** — solo respalda Puestos y Especialidades, ambos con CRUD completo ya construido. Nada más expuesto sin usar.
- **Permiso ↔ Módulo (catálogo `MODULO_SISTEMA`)** — `permiso-formulario.ts`/`permisos-lista.ts` ya usan el catálogo real correctamente. No es un cabo suelto.

---

## Nota aparte (no es Mantenimiento, pero mismo patrón)

**`CitaService`** también existe completo y conectado a `CitasController`/`RecordatoriosController`, y **tampoco lo usa ninguna pantalla** — no hay agenda de citas en ningún lado del sistema. Como comparte la misma causa que el punto 2 (servicio ya armado, pantalla nunca construida) y probablemente ambos sean parte de una futura feature de "Agenda", conviene decidirlos juntos aunque Citas no sea estrictamente Mantenimiento.

**`ReportesGeneradosController`** — GET lista/por id + POST para registrar que se generó un reporte. Cero uso en el frontend, pero es ambiguo: parece más una bitácora de "se generó este reporte" que una tabla de configuración. Se marca para que el equipo decida si se construye o se deja pendiente a propósito; no es una recomendación fuerte de Mantenimiento por sí sola.

---

## Catálogos nuevos sin sembrar

Confirmados, los mismos 8 que ya se habían encontrado en la auditoría de los 6 módulos (siguen ausentes en `scripts/sembrar_catalogos.sql`):

```
PRIORIDAD_ORDEN
ESTADO_ORDEN_LABORATORIO
NIVEL_TRIAGE
ESTADO_CASO_EMERGENCIA
PARENTESCO
ESTADO_CONSENTIMIENTO
ESTADO_HOSPITALIZACION
TIPO_ORDEN_HOSPITALIZACION
```

**Posible 9no, sin confirmar:** Emergencias usa `TIPO_CONSENTIMIENTO_COMPROMISO_PAGO = 46` (comentario interno dice `id_tipo_catalogo = 13`, es decir un catálogo `TIPO_CONSENTIMIENTO` distinto de `ESTADO_CONSENTIMIENTO`). No está claro si esto es en realidad una fila de la tabla `tipos_consentimiento` (que ya tiene su propia pantalla vía `CatalogosPropiosController`) en vez de un `cat_valor_catalogo`. **Hay que revisarlo contra la base antes de tratarlo como catálogo faltante.**

### Riesgo adicional encontrado (no es un catálogo sin sembrar, es un cruce de ids)

`emergencias-catalogos.ts` y `hospitalizacion-catalogos.ts` traen ids numéricos quemados (37-55 y 56-71 respectivamente) asumiendo un orden fijo de inserción en `cat_valor_catalogo`. Pero `TIPO_HABITACION`/`ESTADO_HABITACION`/`ESTADO_CAMA` **ya se siembran por separado** en `sembrar_catalogos.sql`. Si ambos caminos de siembra corren, los ids quemados en `hospitalizacion-catalogos.ts` podrían terminar apuntando a la fila equivocada. No se verificó contra la base real — solo se deja la advertencia (ver también `AUDITORIA_DDL_IDS_QUEMADOS.md`, que ya marca esto como prioridad 1).

---

## Checklist de acción sugerida

- [ ] Construir pantalla "Papelera" genérica sobre `EliminadosController`.
- [ ] Construir pantalla "Disponibilidad de médicos" (Mantenimiento → Recursos Humanos).
- [ ] Construir pantalla "Interacciones de medicamentos" (Mantenimiento → Farmacia).
- [ ] Construir pantalla "Bitácora de auditoría" global (Mantenimiento → Seguridad).
- [ ] Decidir sobre "Agenda" (Citas + Disponibilidad de médicos) como feature conjunta.
- [ ] Decidir si se construye algo para `ReportesGeneradosController` o se deja pendiente a propósito.
- [ ] Confirmar si `TIPO_CONSENTIMIENTO` (id 46) es un catálogo real sin sembrar o una fila de `tipos_consentimiento` mal referenciada.
- [ ] Sembrar los 8 catálogos confirmados arriba.
