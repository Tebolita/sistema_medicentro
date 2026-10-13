import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validadores reutilizables de los formularios de Recepción, Seguros
// Médicos y Expedientes Clínicos. Cada uno devuelve un error con nombre
// propio para poder mostrar un mensaje claro debajo del campo.

// Largos máximos de las columnas de la base (nvarchar(n)), para no mandar
// textos que la base va a rechazar con un error del servidor.
export const LARGOS = {
  NOMBRE: 100,
  DOCUMENTO: 50,
  TELEFONO: 30,
  CORREO: 150,
  DIRECCION: 255,
  NOMBRE_COMPLETO: 200,
  DESCRIPCION_CORTA: 255,
  DESCRIPCION_LARGA: 500,
  NUMERO_POLIZA: 50,
  NOTAS: 4000,
} as const;

// Obligatorio que además rechaza un campo lleno solo de espacios.
export function requeridoSinEspacios(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (valor === null || valor === undefined) {
    return { required: true };
  }
  if (typeof valor === 'string' && valor.trim().length === 0) {
    return { required: true };
  }
  return null;
}

// Solo dígitos, con un largo exacto (ej. DPI de 13 dígitos).
export function soloDigitos(largo: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = (control.value ?? '').toString().trim();
    if (!valor) {
      return null;
    }
    return new RegExp(`^\\d{${largo}}$`).test(valor) ? null : { digitos: { largo } };
  };
}

// Teléfono de Guatemala: 8 dígitos; se permiten espacios o guiones al escribir
// (ej. 5555-1234). Para números extranjeros se acepta un "+" inicial.
export function telefono(control: AbstractControl): ValidationErrors | null {
  const valor = (control.value ?? '').toString().trim();
  if (!valor) {
    return null;
  }
  const limpio = valor.replace(/[\s-]/g, '');
  if (/^\d{8}$/.test(limpio) || /^\+\d{8,15}$/.test(limpio)) {
    return null;
  }
  return { telefono: true };
}

function soloFecha(valor: Date | string): Date {
  const fecha = typeof valor === 'string' ? new Date(valor) : valor;
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function hoy(): Date {
  return soloFecha(new Date());
}

// La fecha no puede ser posterior a hoy (nacimiento, diagnóstico, etc.).
export function noFutura(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  return soloFecha(control.value) > hoy() ? { fechaFutura: true } : null;
}

// La fecha no puede ser anterior a hoy (citas nuevas).
export function noPasada(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  return soloFecha(control.value) < hoy() ? { fechaPasada: true } : null;
}

// Validador de grupo: la fecha "fin" debe ser igual o posterior a la fecha
// "inicio". El error se pone en el control "fin" para mostrarlo ahí.
export function rangoFechas(inicio: string, fin: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const controlInicio = grupo.get(inicio);
    const controlFin = grupo.get(fin);
    if (!controlInicio || !controlFin) {
      return null;
    }
    const errores = { ...(controlFin.errors ?? {}) };
    delete errores['rangoFechas'];
    const invalido =
      !!controlInicio.value && !!controlFin.value && soloFecha(controlFin.value) < soloFecha(controlInicio.value);
    if (invalido) {
      errores['rangoFechas'] = true;
    }
    controlFin.setErrors(Object.keys(errores).length ? errores : null);
    return invalido ? { rangoFechas: true } : null;
  };
}

// Texto corto para mostrar debajo de un campo según su primer error.
export function mensajeError(control: AbstractControl | null): string {
  const e = control?.errors;
  if (!e) return '';
  if (e['required']) return 'Requerido';
  if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
  if (e['digitos']) return `Debe tener ${e['digitos'].largo} dígitos`;
  if (e['telefono']) return 'Teléfono inválido (8 dígitos)';
  if (e['email']) return 'Correo inválido';
  if (e['fechaFutura']) return 'No puede ser una fecha futura';
  if (e['fechaPasada']) return 'No puede ser una fecha pasada';
  if (e['rangoFechas']) return 'Debe ser posterior a la fecha de inicio';
  if (e['min']) return `El valor mínimo es ${e['min'].min}`;
  if (e['max']) return `El valor máximo es ${e['max'].max}`;
  if (e['duplicado']) return e['duplicado'];
  if (e['matDatepickerParse']) return 'Fecha inválida';
  if (e['pattern']) return 'Formato inválido';
  return 'Valor inválido';
}

// Quita espacios al inicio y al final de todos los textos de un objeto
// plano antes de mandarlo al backend. Un texto que queda vacío se manda null.
export function limpiarTextos<T extends Record<string, unknown>>(datos: T): T {
  const resultado: Record<string, unknown> = { ...datos };
  for (const [clave, valor] of Object.entries(resultado)) {
    if (typeof valor === 'string') {
      const limpio = valor.trim();
      resultado[clave] = limpio.length ? limpio : null;
    }
  }
  return resultado as T;
}