# Auditoría: dropdowns de catálogo e ids quemados

**Fecha:** 2026-10-08
**Alcance:** Recepción, Seguros Médicos, Expedientes Clínicos, Laboratorio y Diagnóstico, Emergencias, Hospitalización (post-merge `b1d9b93`/`ee4f20a` a `Cambios-unificados`).
**Motivo:** mismo patrón de bug que ya corrompió datos en Mantenimiento (un id de ejemplo hardcodeado que coincidía por accidente con un id real de otro catálogo). Se revisó si los otros módulos recién integrados tienen el mismo riesgo.

**Cómo leer esto:** por cada módulo se indica si su *servicio* habla con la API real o es un mock en memoria, y si sus *dropdowns* (`mat-select` de catálogo) jalan del catálogo real (`CatalogosService`/`CatalogoService`) o están hardcodeados.

---

## Resumen

| Módulo | Servicio | Dropdowns | Riesgo |
|---|---|---|---|
| Recepción (pacientes) | ✅ Real | ✅ Real | Ninguno (hay archivos muertos sin usar, ver abajo) |
| Seguros Médicos (polizas) | ❌ Mock en memoria | ❌ Hardcodeados | Alto si se conecta sin revisar `idAseguradora` |
| Expedientes Clínicos | ❌ Mock en memoria | ❌ Hardcodeados | Alto si se conecta sin revisar `idMedico` |
| Laboratorio y Diagnóstico | ✅ Real | ✅ Real (2 catálogos sin sembrar) | Bajo — dropdowns vacíos, no hay escritura mala |
| Emergencias | ✅ Real | ✅ Real (4 catálogos sin sembrar) | Medio — 1 id quemado sí se manda al backend |
| Hospitalización | ✅ Real | ✅ Real (2 catálogos sin sembrar) | 🔴 **Alto** — 3 ids quemados se escriben al backend en cada ingreso/alta |

---

## 🔴 Prioridad 1 — Hospitalización

`src/app/hospitalizacion/hospitalizacion-catalogos.ts` define:

```ts
ESTADO_CAMA_LIBRE = 62
ESTADO_CAMA_OCUPADA = 63
ESTADO_HOSPITALIZACION_ACTIVA = 65
```

Estos no son solo un valor de respaldo para la UI — **se usan en la lógica real**:

- `hospitalizacion-formulario.ts:198` filtra "camas libres" comparando `c.idEstadoCama === 62`.
- `hospitalizacion-formulario.ts:392-400` (`aplicarCambioDeCama()`) escribe literalmente `62` o `63` con un `PUT /api/Habitaciones/{id}/camas/{id}` cada vez que se ingresa o se da de alta a un paciente.

El comentario del archivo asume que esos ids numéricos ya coinciden con lo que insertó `scripts/sembrar_catalogos.sql` para `ESTADO_CAMA` — pero el script solo fija el **código** y el **orden**, nunca el `id_valor_catalogo` real (que es un autoincremental compartido por *todos* los catálogos). Si el orden real de inserción no coincide exactamente con lo que se asumió al escribir `62`/`63`/`65`, cada ingreso/alta puede estar cambiando el estado de la cama equivocada, o pisando un valor que pertenece a otro catálogo — en silencio, sin error visible.

**Fix sugerido:** reemplazar los 3 literales por una búsqueda real, igual que ya hace `paciente-formulario.ts` con `idPorCodigo`:
```ts
catalogos.idPorCodigo('ESTADO_CAMA', 'OCUPADA')
```

---

## 🟡 Prioridad 2 — Emergencias

`compromiso-formulario.ts:21,192` manda `idTipoConsentimiento: TIPO_CONSENTIMIENTO_COMPROMISO_PAGO` — una constante `= 46` (`emergencias-catalogos.ts:27`) que se envía al backend en cada guardado **sin validarla contra el catálogo real**. Mismo patrón de riesgo que Hospitalización, pero en un solo campo.

El resto del CRUD de Emergencias sí es real (`casos-emergencia.service.ts`, `compromisos-pago.service.ts`), pero estos 4 catálogos **no están sembrados** en `scripts/sembrar_catalogos.sql` (sus dropdowns están vacíos hoy):
- `NIVEL_TRIAGE`
- `ESTADO_CASO_EMERGENCIA`
- `PARENTESCO`
- `ESTADO_CONSENTIMIENTO`

---

## 🟢 Prioridad 3 — Laboratorio y Diagnóstico

Servicio y dropdowns 100% reales (`/api/laboratorio`, `/api/catalogos/{codigo}`, etc.), sin ids quemados. Solo falta sembrar 2 catálogos (por eso esos 2 dropdowns están vacíos, pero no hay riesgo de escribir mal):
- `PRIORIDAD_ORDEN`
- `ESTADO_ORDEN_LABORATORIO`

---

## ❌ Pendientes de conectar — Seguros Médicos y Expedientes Clínicos

Ambos módulos están **completamente** en memoria/hardcodeados (no es un detalle menor, es todo el módulo):

- **Seguros Médicos** (`polizas/`): `polizas.service.ts` es un `signal` con 3 pólizas de ejemplo, sin `HttpClient`. `polizas-catalogos.ts` tiene `ASEGURADORAS`, `RAMOS_SEGURO`, `TITULARIDADES`, `ESTADOS_POLIZA` todos con ids 1-4 inventados — y ojo: `idAseguradora` es una FK real a la tabla `aseguradoras` (que ya tiene su propio servicio real en `service/aseguradoras.service.ts`, sin usar aquí). Si se conecta el servicio sin corregir esto primero, es el mismo bug de Hospitalización pero en Seguros Médicos.
- **Expedientes Clínicos** (`expedientes/`): mismo patrón — `expedientes.service.ts` en memoria, `expedientes-catalogos.ts` con `TIPOS_REGISTRO_CLINICO`/`NIVELES_CONFIDENCIALIDAD` hardcodeados, y `idMedico` sale de un array `MEDICOS` hardcodeado (también una FK real).

Estos dos no están rotos "silenciosamente" porque ni siquiera tocan el backend — pero hay que decidir si se conectan ahora o se dejan marcados explícitamente como pendientes.

---

## ✅ Sin problema — Recepción (pacientes)

`PacientesLista`/`PacienteFormulario` ya usan los servicios reales (`service/paciente.service.ts` + `service/catalogo.service.ts`), con catálogos reales (GENERO, TIPO_DOCUMENTO, ESTADO_CIVIL, etc.) y defaults por código, no por id. Es el que todos los demás módulos importan para su dropdown de "Paciente".

Único detalle de limpieza (no bloquea nada): dentro de `src/app/pacientes/` quedan un `pacientes.service.ts` y `pacientes-catalogos.ts` viejos, 100% en memoria, que **ninguna ruta usa** — son código muerto, pero si alguien los conecta por error a una pantalla nueva sin revisar, hereda el mismo problema. Candidatos a borrar.

---

## Catálogos que faltan sembrar (resumen)

Agregar a `scripts/sembrar_catalogos.sql`, con los códigos exactos que ya esperan los servicios:

```
PRIORIDAD_ORDEN
ESTADO_ORDEN_LABORATORIO
NIVEL_TRIAGE
ESTADO_CASO_EMERGENCIA
PARENTESCO
ESTADO_CONSENTIMIENTO
TIPO_CONSENTIMIENTO
ESTADO_HOSPITALIZACION
TIPO_ORDEN_HOSPITALIZACION
```

---

## Checklist de acción sugerida

- [ ] Hospitalización: reemplazar `ESTADO_CAMA_LIBRE`/`ESTADO_CAMA_OCUPADA`/`ESTADO_HOSPITALIZACION_ACTIVA` por lookup real vía `idPorCodigo`.
- [ ] Emergencias: reemplazar `TIPO_CONSENTIMIENTO_COMPROMISO_PAGO` por lookup real.
- [ ] Sembrar los 9 catálogos listados arriba.
- [ ] Decidir y conectar Seguros Médicos y Expedientes Clínicos a su API real (o marcarlos explícitamente como pendientes en este mismo documento).
- [ ] Borrar el código muerto en `src/app/pacientes/` (`pacientes.service.ts` viejo, `pacientes-catalogos.ts`) para que nadie lo reconecte por accidente.
