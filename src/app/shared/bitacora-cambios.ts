// Convierte una fila de bitacora_auditoria (valoresAnteriores/valoresNuevos
// en JSON, con los nombres de propiedad de C# que serializa
// MedicentroDbContext.SerializarValores en el backend) en una lista legible
// de "qué campo cambió, de qué a qué". Lo usan los historiales generales de
// Mantenimiento (HistorialCambios) y para descartar entradas vacías.
//
// Las tablas de relación rol_permiso y usuario_rol se muestran como
// "Permiso: X / Rol: Y — Sin asignar → Asignado" en vez de sus columnas
// crudas (IdRolPermiso, IdRol, IdPermiso, Activo...).

export interface FilaBitacora {
  tablaAfectada: string;
  valoresAnteriores: string | null;
  valoresNuevos: string | null;
}

export interface CambioBitacora {
  campo: string;
  antes: string;
  despues: string;
}

// Resuelven ids a nombres para las tablas de relación. Si no se pasan (o
// no encuentran el registro) se muestra "Permiso #5", "Rol #2", etc.
export interface NombresBitacora {
  permiso?: (id: number) => string | undefined;
  rol?: (id: number) => string | undefined;
  usuario?: (id: number) => string | undefined;
}

// Siempre cambian (o nunca aportan) y solo llenan el detalle de ruido; los
// de contraseña no se deben mostrar nunca.
const CAMPOS_IGNORADOS = new Set([
  'FechaCreacion',
  'FechaModificacion',
  'IdUsuarioCreacion',
  'IdUsuarioModificacion',
  'HashPassword',
  'Contrasena',
  'ContrasenaHash',
  'Password',
]);

export function cambiosBitacora(fila: FilaBitacora, nombres: NombresBitacora = {}): CambioBitacora[] {
  const antes = parsear(fila.valoresAnteriores);
  const despues = parsear(fila.valoresNuevos);

  if (fila.tablaAfectada === 'rol_permiso') {
    const idPermiso = Number(despues['IdPermiso'] ?? antes['IdPermiso']);
    const nombre = nombres.permiso?.(idPermiso) ?? `Permiso #${idPermiso}`;
    return cambioAsignacion(antes, despues, `Permiso: ${nombre}`);
  }

  if (fila.tablaAfectada === 'usuario_rol') {
    const idRol = Number(despues['IdRol'] ?? antes['IdRol']);
    const idUsuario = Number(despues['IdUsuario'] ?? antes['IdUsuario']);
    const rol = nombres.rol?.(idRol) ?? `Rol #${idRol}`;
    const usuario = nombres.usuario?.(idUsuario) ?? `Usuario #${idUsuario}`;
    return cambioAsignacion(antes, despues, `Rol: ${rol} (${usuario})`);
  }

  const cambios: CambioBitacora[] = [];
  for (const campo of new Set([...Object.keys(antes), ...Object.keys(despues)])) {
    if (CAMPOS_IGNORADOS.has(campo)) {
      continue;
    }
    const a = antes[campo];
    const d = despues[campo];
    if (JSON.stringify(a) === JSON.stringify(d)) {
      continue;
    }
    cambios.push({ campo: humanizarCampo(campo), antes: formatearValor(a, campo), despues: formatearValor(d, campo) });
  }
  return cambios;
}

export function tieneCambios(fila: FilaBitacora): boolean {
  return cambiosBitacora(fila).length > 0;
}

// Saca un id (IdRol, IdUsuario...) de los valores guardados, para filtrar
// filas de las tablas de relación que pertenecen a un registro.
export function idEnBitacora(fila: FilaBitacora, campo: string): number | null {
  const valor = parsear(fila.valoresNuevos)[campo] ?? parsear(fila.valoresAnteriores)[campo];
  return typeof valor === 'number' ? valor : null;
}

function cambioAsignacion(antes: Record<string, unknown>, despues: Record<string, unknown>, campo: string): CambioBitacora[] {
  const activoAntes = antes['Activo'] === true;
  const activoDespues = despues['Activo'] === true;
  if (activoAntes === activoDespues) {
    return [];
  }
  const estado = (activo: boolean) => (activo ? 'Asignado' : 'Sin asignar');
  return [{ campo, antes: estado(activoAntes), despues: estado(activoDespues) }];
}

function parsear(json: string | null): Record<string, unknown> {
  if (!json) {
    return {};
  }
  try {
    return JSON.parse(json) ?? {};
  } catch {
    return {};
  }
}

function humanizarCampo(campo: string): string {
  return campo
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function formatearValor(valor: unknown, campo: string): string {
  if (valor === null || valor === undefined || valor === '') {
    return '—';
  }
  if (typeof valor === 'boolean') {
    return valor ? 'Sí' : 'No';
  }
  if (typeof valor === 'string' && /fecha/i.test(campo)) {
    const fecha = new Date(valor);
    if (!isNaN(fecha.getTime())) {
      return fecha.toLocaleString('es-GT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }
  if (typeof valor === 'object') {
    return JSON.stringify(valor);
  }
  return String(valor);
}
