# Solicitud: endpoints de reportería y módulo de cada catálogo

Dos pedidos separados, ambos de backend — se investigó primero qué ya existe
antes de escribir esto, para no pedir algo que ya está hecho a medias.

**Estado del frontend:** la pantalla "Reportes y Estadísticas"
(`src/app/reportes/reportes-lista/`) ya está construida y conectada a los
endpoints de la sección 1 de abajo — hoy muestra un aviso de "endpoint
pendiente" en vez de datos, porque esos endpoints todavía no existen. En
cuanto el backend los agregue, la pantalla empieza a mostrar datos reales
sin ningún cambio más del lado del frontend.

---

# 1. Reportería (Módulo 9: Reportes y Estadísticas)

## Qué ya existe

- Las dos vistas SQL que el frontend necesita **ya existen en la base**:
  `vw_indicadores_clinicos` y `vw_indicadores_financieros`. Verificado
  directo contra la base:

  ```sql
  SELECT TOP 3 * FROM dbo.vw_indicadores_clinicos;
  -- mes          estado_cita   total_citas
  -- 2026-06-01   PROGRAMADA    1

  SELECT TOP 3 * FROM dbo.vw_indicadores_financieros;
  -- mes          estado_factura   monto_total   cantidad_facturas
  -- 2026-09-01   INACTIVO         260.00        1
  -- 2026-09-01   PAGADA           940.80        2
  -- 2026-10-01   PAGADA           112.00        1
  ```

- El modelo del frontend (`src/app/models/reporte.model.ts`) ya está escrito
  esperando exactamente esas columnas:

  ```ts
  export interface IndicadorClinico {
    mes: string;
    estadoCita: string; // código de cat ESTADO_CITA
    totalCitas: number;
  }

  export interface IndicadorFinanciero {
    mes: string;
    estadoFactura: string; // código de cat ESTADO_FACTURA
    montoTotal: number;
    cantidadFacturas: number;
  }
  ```

- También existe `ReportesGeneradosController` (`GET/POST
  /api/reportes-generados`), pero eso es otra cosa: es un **registro** de
  "se generó/exportó tal reporte, en tal fecha, con tales parámetros" (tiene
  `UrlArchivo`, pensado para cuando un reporte se descarga como archivo). No
  sirve para traer los datos de los indicadores en sí.

## Qué falta

Ningún endpoint expone todavía los datos de esas dos vistas. El frontend no
tiene ni pantalla construida para Reportes porque no hay de dónde
consumirlos.

## Propuesto

Dos endpoints de solo lectura, simples (es una vista ya resuelta en SQL, no
hace falta lógica de agregación del lado del backend):

```
GET /api/reportes/indicadores-clinicos
GET /api/reportes/indicadores-financieros
```

```csharp
// Ejemplo de DTO, mapeando 1:1 la vista:
public class IndicadorClinicoDto
{
    public DateTime Mes { get; set; }
    public string EstadoCita { get; set; } = string.Empty;
    public int TotalCitas { get; set; }
}

public class IndicadorFinancieroDto
{
    public DateTime Mes { get; set; }
    public string EstadoFactura { get; set; } = string.Empty;
    public decimal MontoTotal { get; set; }
    public int CantidadFacturas { get; set; }
}
```

Como son vistas, no hace falta una `Entidad` con `[Key]` real — se puede
mapear sin clave (`.HasNoKey()`) o consultar con SQL crudo
(`FromSqlRaw`/`SqlQuery<T>`), lo que sea más simple con el patrón que ya use
el resto del backend para datos de solo lectura.

**Opcional, si se quiere filtrar por rango de fechas** (recomendado, para no
traer todo el histórico cada vez):

```
GET /api/reportes/indicadores-clinicos?desde=2026-01-01&hasta=2026-10-01
GET /api/reportes/indicadores-financieros?desde=2026-01-01&hasta=2026-10-01
```

## Nota aparte: catálogo TIPO_REPORTE vacío

Si en algún momento se usa `ReportesGeneradosController` (el registro de
"reporte exportado"), el catálogo `TIPO_REPORTE` no existía ni como *tipo*
en `cat_tipo_catalogo` en la base local (no solo le faltaban valores):

```sql
SELECT vc.codigo, vc.nombre FROM dbo.cat_tipo_catalogo tc
JOIN dbo.cat_valor_catalogo vc ON vc.id_tipo_catalogo = tc.id_tipo_catalogo
WHERE tc.codigo = 'TIPO_REPORTE';
-- 0 filas
```

`POST /api/reportes-generados` va a fallar por llave foránea (`IdTipoReporte`)
hasta que se siembre. Ya se agregó `scripts/sembrar_tipo_reporte.sql`, que
crea el tipo y sus dos valores (`INDICADORES_CLINICOS`,
`INDICADORES_FINANCIEROS`) — falta correrlo contra cada base.

---

# 2. Campo para saber a qué módulo pertenece un `cat_tipo_catalogo`

## Problema

La pantalla **Mantenimiento → Catálogos** agrupa visualmente los tipos de
catálogo por módulo (Farmacia, Facturación y Cobros, Seguros Médicos, etc.),
pero ese agrupamiento hoy vive **a mano, en el frontend**
(`src/app/mantenimiento/mantenimiento-catalogos.ts`):

```ts
export const TIPOS_CATALOGO_CONOCIDOS: TipoCatalogoConocido[] = [
  { codigo: 'ESTADO_FACTURA', nombre: 'Estado de factura', grupo: 'facturacion-cobros', icono: 'receipt' },
  { codigo: 'TIPO_ITEM_INVENTARIO', nombre: 'Tipo de item de inventario', grupo: 'farmacia', icono: 'inventory_2' },
  // ...una fila por cada tipo de catálogo que el frontend ya conoce
];
```

`GET /api/catalogos` (que ya existe y trae TODOS los tipos de catálogo) no
manda a qué módulo pertenece cada uno — el frontend solo puede asignarle un
grupo a los que ya están en esa lista curada. Cualquier `cat_tipo_catalogo`
que el backend agregue y no esté ahí cae automáticamente en el grupo
genérico "general" hasta que alguien edite el frontend y se vuelva a
desplegar — el mismo problema de fondo que ya se señaló en el reporte de
auditoría para los IDs quemados: un dato de negocio viviendo en código en
vez de en la base.

## Propuesto

Agregar a `cat_tipo_catalogo` una columna que diga a qué módulo pertenece,
usando el **mismo catálogo que ya existe** para esto
(`MODULO_SISTEMA` — ya lo usa `PermisosMenuService` en el frontend para
resolver permisos por módulo), en vez de inventar un concepto paralelo:

```sql
ALTER TABLE dbo.cat_tipo_catalogo ADD codigo_modulo NVARCHAR(50) NULL;

-- Ejemplo de qué llevaría cada fila (mismos códigos que ya usa MODULO_SISTEMA
-- — ver src/app/shared/menu-data.ts, CODIGO_MODULO_A_SLUG):
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'FACTURACION_COBROS' WHERE codigo IN ('ESTADO_FACTURA', 'FORMA_PAGO', 'ESTADO_PAGO', 'TIPO_DOCUMENTO_FISCAL', 'ESTADO_CONVENIO');
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'FARMACIA' WHERE codigo IN ('TIPO_ITEM_INVENTARIO', 'TIPO_MOVIMIENTO_INVENTARIO', 'ESTADO_ITEM_INVENTARIO', 'UNIDAD_MEDIDA', 'ESTADO_RECETA', 'CATEGORIA_MEDICAMENTO');
-- etc. para el resto (ver TIPOS_CATALOGO_CONOCIDOS en mantenimiento-catalogos.ts
-- para la lista completa de a qué grupo pertenece cada código hoy en el frontend).
```

(Una columna de texto simple en vez de una FK hacia `cat_valor_catalogo`
porque `codigo_modulo` describe al propio *tipo* de catálogo, no a uno de
sus valores — meter eso como FK sería una auto-referencia rara dentro del
mismo sistema de catálogos. Si el equipo de backend prefiere una FK real,
también funciona, con tal de que el campo exista.)

Y que `GET /api/catalogos` devuelva ese campo (`codigoModulo`) en cada tipo.
Con eso, `mantenimiento-catalogos.ts` deja de hacer falta — el frontend
agrupa directo con el dato real, y un catálogo nuevo aparece en su módulo
correcto sin tocar código.

## Impacto si no se hace

No es bloqueante — la pantalla de Catálogos funciona hoy, solo que cualquier
tipo de catálogo nuevo que el backend agregue (o cualquier error de
tipeo en el `codigo` del lado del frontend) va a aparecer mal agrupado
("general") hasta que alguien lo note y actualice el frontend a mano.
