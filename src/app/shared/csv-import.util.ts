// Utilidades genéricas para importar/exportar CSV desde el navegador (sin
// librería externa — el formato es simple y así no se agrega una dependencia
// nueva solo para esto). Usado por ImportarCsvDialog (ver importar-csv/).

// Detecta coma o punto y coma como separador leyendo la primera línea (Excel
// en español suele exportar CSV con punto y coma cuando el sistema usa coma
// decimal) — así una plantilla editada en Excel funciona igual que una hecha
// a mano con comas.
function detectarDelimitador(primeraLinea: string): ',' | ';' {
  const comas = (primeraLinea.match(/,/g) ?? []).length;
  const puntoComas = (primeraLinea.match(/;/g) ?? []).length;
  return puntoComas > comas ? ';' : ',';
}

// Parser CSV mínimo: soporta campos entre comillas (con comas/saltos de
// línea/comillas escapadas "" adentro) y detecta el delimitador solo. Quita
// filas completamente vacías (líneas en blanco al final del archivo).
export function parseCsv(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!limpio.trim()) return [];

  const delimitador = detectarDelimitador(limpio.split('\n')[0] ?? '');
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (entreComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      entreComillas = true;
    } else if (c === delimitador) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n') {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas.filter((f) => f.some((v) => v.trim() !== ''));
}

// Arma el texto CSV (con los encabezados) para la plantilla de ejemplo.
export function generarCsv(headers: string[], filas: string[][], delimitador: ',' | ';' = ','): string {
  const escapar = (valor: string) =>
    /["\n,;]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
  return [headers, ...filas].map((f) => f.map(escapar).join(delimitador)).join('\r\n');
}

// Descarga un archivo de texto en el navegador. El BOM al inicio es para que
// Excel abra el CSV reconociendo los acentos como UTF-8 (si no, los muestra
// mal hasta que el usuario elige la codificación a mano al importar).
export function descargarArchivo(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob(['﻿' + contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
