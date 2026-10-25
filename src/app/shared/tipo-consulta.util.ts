// La tabla `citas` no tiene columna de tipo de consulta (Primera vez /
// Reconsulta / Laboratorios): se guarda al inicio de `notas` con este
// prefijo (ver consulta-formulario.ts). Este helper centraliza cómo leerlo
// desde cualquier pantalla que solo tenga la Cita (listados, por ejemplo),
// sin tener que cargar el catálogo TIPO_CONSULTA completo solo para eso.
const PREFIJO_TIPO_CONSULTA = /^Tipo de consulta: ([^.]+)\./;

export function tipoConsultaDeNotas(notas: string | null): string | null {
  return notas?.match(PREFIJO_TIPO_CONSULTA)?.[1]?.trim() ?? null;
}

// "Laboratorios" (ver SOLICITUD_MOTOR_CONSULTAS.md): consulta de solo
// exámenes, sin médico asignado — se identifica por este tipo, no por un
// campo aparte, para no tener que tocar el esquema de citas.
export function esConsultaDeLaboratorio(notas: string | null): boolean {
  return (tipoConsultaDeNotas(notas) ?? '').toLowerCase() === 'laboratorios';
}
