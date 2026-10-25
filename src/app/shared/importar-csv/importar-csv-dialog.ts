import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, from, of } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import { descargarArchivo, generarCsv, parseCsv } from '../csv-import.util';

export interface ColumnaCsv {
  // Encabezado exacto que se espera en el CSV (y el que trae la plantilla).
  clave: string;
  etiqueta: string;
  requerido: boolean;
  // Valor de ejemplo para la fila de muestra de la plantilla descargable.
  ejemplo: string;
}

interface FilaValidada<T> {
  indice: number;
  errores: string[];
  datos: T | null;
  resumen: string;
}

interface ResultadoFilaImportada {
  indice: number;
  resumen: string;
  ok: boolean;
  error?: string;
}

export interface ImportarCsvDialogData<T> {
  titulo: string;
  icono: string;
  // Plural en minúsculas para los mensajes ("medicamentos", "tipos de examen").
  nombreEntidadPlural: string;
  nombreArchivoPlantilla: string;
  columnas: ColumnaCsv[];
  // Texto libre de ayuda sobre cómo llenar alguna columna especial (p. ej.
  // que "categoría" acepta el nombre tal como aparece en Mantenimiento).
  ayuda?: string;
  // Valida y transforma una fila cruda del CSV. Si `errores` no está vacío,
  // la fila se marca como inválida y no se intenta crear.
  validarFila: (fila: Record<string, string>, indice: number) => { errores: string[]; datos: T | null };
  // Texto corto para identificar la fila en la vista previa y el resumen
  // final (p. ej. "Paracetamol — Q5.00").
  resumenFila: (datos: T) => string;
  crear: (datos: T) => Observable<unknown>;
}

// Popup genérico de "Importar CSV": descarga de plantilla, selección de
// archivo, vista previa con validación fila por fila (sin tocar el backend
// todavía) y, al confirmar, creación real una por una con resultado por
// fila. Cada pantalla de Mantenimiento solo aporta sus columnas, su validación
// (incluida la resolución de catálogos por nombre, no por id) y su
// `crear()` — ver medicamentos-lista.ts / tipos-examen-lista.ts.
@Component({
  selector: 'app-importar-csv-dialog',
  imports: [NgClass, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './importar-csv-dialog.html',
  styleUrl: './importar-csv-dialog.css',
})
export class ImportarCsvDialog<T> {
  data = inject<ImportarCsvDialogData<T>>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ImportarCsvDialog<T>>);

  nombreArchivo = signal('');
  errorArchivo = signal('');
  filas = signal<FilaValidada<T>[]>([]);

  validas = computed(() => this.filas().filter((f) => f.errores.length === 0));
  invalidas = computed(() => this.filas().filter((f) => f.errores.length > 0));

  importando = signal(false);
  resultados = signal<ResultadoFilaImportada[]>([]);
  terminado = computed(() => !this.importando() && this.resultados().length > 0);
  exitosos = computed(() => this.resultados().filter((r) => r.ok).length);
  fallidos = computed(() => this.resultados().filter((r) => !r.ok).length);

  descargarPlantilla(): void {
    const headers = this.data.columnas.map((c) => c.clave);
    const ejemplo = this.data.columnas.map((c) => c.ejemplo);
    descargarArchivo(this.data.nombreArchivoPlantilla, generarCsv(headers, [ejemplo]));
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // deja elegir el mismo archivo otra vez si hace falta.
    if (!archivo) return;

    this.errorArchivo.set('');
    this.filas.set([]);
    this.resultados.set([]);
    this.nombreArchivo.set(archivo.name);

    const lector = new FileReader();
    lector.onload = () => this.procesarTexto(String(lector.result ?? ''));
    lector.onerror = () => this.errorArchivo.set('No se pudo leer el archivo.');
    lector.readAsText(archivo, 'utf-8');
  }

  private procesarTexto(texto: string): void {
    const matriz = parseCsv(texto);
    if (matriz.length < 2) {
      this.errorArchivo.set('El archivo no tiene filas de datos (solo encabezados, o está vacío).');
      return;
    }

    const headers = matriz[0].map((h) => h.trim());
    const registros = matriz.slice(1).map((fila) => {
      const registro: Record<string, string> = {};
      headers.forEach((h, i) => (registro[h] = (fila[i] ?? '').trim()));
      return registro;
    });

    this.filas.set(
      registros.map((fila, i) => {
        const { errores, datos } = this.data.validarFila(fila, i);
        return { indice: i, errores, datos, resumen: datos ? this.data.resumenFila(datos) : '—' };
      }),
    );
  }

  importar(): void {
    const pendientes = this.validas();
    if (pendientes.length === 0 || this.importando()) return;

    this.importando.set(true);
    this.resultados.set([]);

    from(pendientes)
      .pipe(
        concatMap((f) =>
          this.data.crear(f.datos as T).pipe(
            map(() => ({ indice: f.indice, resumen: f.resumen, ok: true }) as ResultadoFilaImportada),
            catchError((err: Error) =>
              of({ indice: f.indice, resumen: f.resumen, ok: false, error: err.message } as ResultadoFilaImportada),
            ),
          ),
        ),
      )
      .subscribe({
        next: (resultado) => this.resultados.update((r) => [...r, resultado]),
        complete: () => this.importando.set(false),
      });
  }

  cerrar(): void {
    // Si se importó al menos un registro, la pantalla que abrió el diálogo
    // recarga su lista (ver medicamentos-lista.ts / tipos-examen-lista.ts).
    this.dialogRef.close(this.exitosos() > 0);
  }
}
