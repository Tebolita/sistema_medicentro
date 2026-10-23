# Solicitud: expediente unificado a partir de la cita

Objetivo pedido: que todo comience con una **cita**, y que desde una sola
pantalla el médico pueda ver el **historial completo del paciente** (como un
récord hospitalario), solicitar **exámenes de laboratorio** y emitir
**recetas**, todo centralizado en vez de repartido en módulos sueltos.

Esto es investigación + propuesta de diseño (backend y frontend), sin tocar
código todavía — para acordar el alcance antes de implementar.

---

## 1. Qué ya existe hoy

### Las 4 piezas y cómo se relacionan

| Entidad | Dónde vive | `idPaciente` | `idCita` |
|---|---|---|---|
| **Cita** (`src/app/models/cita.model.ts:29`) | Módulo Citas (Recepción) | dueña | — |
| **Expediente** (`HistorialClinico`, `src/app/models/tratamiento.model.ts:87`) | `src/app/expedientes/` | sí | **sí** (nullable, ya existe) |
| **Orden de laboratorio** (`src/app/models/laboratorio.model.ts:14`) | `src/app/laboratorio/` | sí | **sí** (nullable, ya existe) |
| **Receta** (`src/app/models/tratamiento.model.ts:48`) | `src/app/farmacia/recetas-lista/` | sí | **no existe** — solo via `idTratamiento` (opcional) → `idCita` |
| **Hospitalización** | `src/app/hospitalizacion/` | sí | no aplica, flujo de ingreso aparte |

**Conclusión clave**: Expediente y Laboratorio ya están listos para colgar de
una cita (`WHERE idCita = X` funciona hoy). **Receta es el único hueco real**:
hoy solo se puede llegar de una receta a su cita si esa receta tiene un
`idTratamiento` asignado (campo opcional) y ese tratamiento a su vez tiene
`idCita` (también opcional) — dos saltos opcionales, así que muchas recetas
quedan sin forma confiable de saber "de qué cita salieron".

### Cómo se listan hoy (backend)

Los 4 `GET` de listado (`CitasController`, `ExpedientesController`,
`OrdenesLaboratorioController`, `RecetasController`) **no aceptan ningún
filtro** — cada uno trae TODOS los registros activos de la tabla completa.
Hoy el frontend filtra por `idPaciente` del lado del cliente (se nota en
cómo `pacientes-lista.ts` y similares piden la lista completa y filtran en
memoria). Funciona mientras los volúmenes sean chicos, pero no escala y
obliga a 4 llamadas HTTP + 4 filtros manuales para armar "todo lo de este
paciente".

---

## 2. Qué falta

### 2.1 Columna `idCita` en Receta (bloqueante para el flujo pedido)

Backend:

```csharp
// Entidades/Receta.cs
public long? IdCita { get; set; }

// Data/MedicentroDbContext.cs, dentro del Entity<Receta>
entity.Property(r => r.IdCita).HasColumnName("id_cita");

// Dto/Recetas/RecetaDto.cs y RecetaInputDto.cs
public long? IdCita { get; set; }
```

```sql
ALTER TABLE dbo.recetas ADD id_cita BIGINT NULL;
-- (sin FK si no hay FK explícita hacia citas en otras tablas similares;
-- revisar si historial_clinico/ordenes_laboratorio la tienen y replicar)
```

Frontend: agregar `idCita: number | null` a `Receta` y `RecetaRequest` en
`src/app/models/tratamiento.model.ts`.

### 2.2 Un endpoint "todo por cita" (para la pantalla de atención médica)

```
GET /api/citas/{idCita}/atencion
```

Devuelve, para una cita puntual: la cita, el/los expedientes generados en
ella, las órdenes de laboratorio solicitadas, y las recetas emitidas — un
solo viaje en vez de 4. Reemplaza la necesidad de que el frontend arme esto
a mano con `forkJoin`.

### 2.3 Un endpoint "todo por paciente" (para el historial completo)

```
GET /api/pacientes/{idPaciente}/historial
```

Devuelve, para un paciente: todas sus citas (con su expediente/laboratorio/
receta si los tiene), ordenadas cronológicamente — el "récord hospitalario"
pedido. Evita pedir las 4 listas completas y filtrar en el cliente.

*(Alternativa más barata si no se quiere un endpoint nuevo: agregar
`?idPaciente=` como filtro opcional a los 4 `Listar()` existentes, y que el
frontend siga haciendo 4 llamadas pero ya filtradas en el servidor. Es menos
trabajo de backend, pero la pantalla sigue necesitando 4 llamadas + unir los
resultados a mano en el frontend. Recomiendo el endpoint agregador si el
volumen de historial por paciente puede crecer mucho con los años.)*

### 2.4 Decisión pendiente: Hospitalización

Hospitalización no tiene `idCita` ni fue diseñada para colgar de una cita
(es su propio flujo: "paciente ingresa", no "paciente tiene cita"). Para el
historial completo del paciente, ¿la mostramos igual (de solo lectura, como
una sección más del récord) aunque no nazca de una cita? Recomiendo que sí
aparezca en el historial unificado — el "récord hospitalario" de un paciente
sin sus hospitalizaciones estaría incompleto — pero sin forzarla a tener
`idCita`.

---

## 3. Propuesta de pantallas (frontend)

Dos pantallas con propósitos distintos, no una sola mezclada:

**A. Historial del paciente** (solo lectura, el "récord hospitalario")
Línea de tiempo de TODO lo del paciente: citas pasadas, expedientes,
resultados de laboratorio, recetas, hospitalizaciones — ordenado por fecha.
Se abre desde `pacientes-lista.ts` ("Ver historial completo").

**B. Atención de la cita** (pantalla de trabajo del médico, donde se crea)
Al entrar a una cita activa: datos de la cita arriba, y debajo 3 acciones
centralizadas, todas pre-llenadas con `idPaciente`/`idCita`/`idMedico` de esa
cita sin tener que volver a escribirlos:
- Registrar/completar el expediente de esta consulta.
- Solicitar examen de laboratorio.
- Emitir receta.

Esto es justo "que todo comience con una cita" — la cita pasa a ser la
puerta de entrada, y desde ahí el médico dispara las otras 3 acciones en vez
de navegar a 3 módulos distintos y volver a buscar al paciente en cada uno.

---

## 4. Plan sugerido (por fases, para no bloquear todo en un solo cambio)

1. **Backend**: `idCita` en Receta (2.1) — chico, no rompe nada existente.
2. **Backend**: endpoint `GET /api/citas/{id}/atencion` (2.2).
3. **Frontend**: pantalla "Atención de la cita" (3.B), usando el endpoint
   nuevo y los `POST` que ya existen (`/api/expedientes`,
   `/api/laboratorio`, `/api/recetas`) pasándoles el `idCita`.
4. **Backend**: endpoint `GET /api/pacientes/{id}/historial` (2.3).
5. **Frontend**: pantalla "Historial del paciente" (3.A).

## 5. Impacto si no se hace

El sistema sigue funcionando como hoy: cada módulo (Citas, Expedientes,
Laboratorio, Recetas) por separado, con el médico teniendo que buscar al
mismo paciente en cada uno. Ya es posible, con lo que existe hoy, filtrar
Expediente y Laboratorio por `idCita` sin cambios — solo Receta y la
pantalla unificada requieren trabajo nuevo.
