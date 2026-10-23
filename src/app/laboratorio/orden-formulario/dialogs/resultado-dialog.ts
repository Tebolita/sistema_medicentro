import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OpcionCatalogo, MedicoOpcion } from '../../../service/laboratorio.service';
import { ResultadoExamen } from '../../../models';

export interface ResultadoDialogData {
  // null = nuevo resultado para este detalle. Con valor = editar uno existente.
  resultado: ResultadoExamen | null;
  estados: OpcionCatalogo[];
  medicos: MedicoOpcion[];
}

export interface ResultadoDialogResultado {
  fechaResultado: string;
  resultadoTexto: string | null;
  idEstadoResultado: number;
  idMedicoValida: number | null;
  // El archivo todavía no se sube: lo sube el formulario que abrió este
  // diálogo justo antes de guardar, para no dejar archivos huérfanos si al
  // final no se confirma (mismo criterio que el comprobante de factura).
  archivoNuevo: File | null;
  // true = se pidió quitar el archivo adjunto que ya tenía (si lo tenía).
  quitarArchivoExistente: boolean;
}

// Popup para cargar/editar el resultado de un examen: texto del resultado,
// estado, médico que valida, y opcionalmente un archivo adjunto (PDF o
// imagen del resultado). Ver SOLICITUD_MOTOR_CONSULTAS.md.
@Component({
  selector: 'app-resultado-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './resultado-dialog.html',
  styleUrl: './resultado-dialog.css',
})
export class ResultadoDialog {
  data = inject<ResultadoDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ResultadoDialog>);
  private fb = inject(FormBuilder);

  private readonly EXTENSIONES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
  private readonly TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024;

  form = this.fb.nonNullable.group({
    fecha: this.fb.nonNullable.control<string>(
      (this.data.resultado?.fechaResultado ?? new Date().toISOString()).slice(0, 10),
      Validators.required,
    ),
    resultadoTexto: [this.data.resultado?.resultadoTexto ?? ''],
    idEstadoResultado: this.fb.control<number | null>(
      this.data.resultado?.idEstadoResultado ?? this.data.estados[0]?.id ?? null,
      Validators.required,
    ),
    idMedicoValida: this.fb.control<number | null>(this.data.resultado?.idMedicoValida ?? null),
  });

  archivoNombreExistente = signal<string | null>(
    this.data.resultado?.archivoAdjuntoUrl ? this.data.resultado.archivoAdjuntoUrl.split('/').pop()!.split('?')[0] : null,
  );
  archivoNuevo = signal<File | null>(null);
  errorArchivo = signal('');

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    if (!this.EXTENSIONES_PERMITIDAS.includes(extension)) {
      this.errorArchivo.set('Solo se aceptan imágenes (JPG, PNG, WEBP) o PDF.');
      return;
    }
    if (archivo.size > this.TAMANO_MAXIMO_BYTES) {
      this.errorArchivo.set('El archivo no puede pesar más de 8 MB.');
      return;
    }
    this.errorArchivo.set('');
    this.archivoNuevo.set(archivo);
    this.archivoNombreExistente.set(null);
  }

  quitarArchivo(): void {
    this.archivoNuevo.set(null);
    this.archivoNombreExistente.set(null);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const habiaArchivo = !!this.data.resultado?.archivoAdjuntoUrl;
    const quedaArchivo = !!this.archivoNombreExistente() || !!this.archivoNuevo();

    const resultado: ResultadoDialogResultado = {
      fechaResultado: v.fecha,
      resultadoTexto: v.resultadoTexto.trim() || null,
      idEstadoResultado: v.idEstadoResultado!,
      idMedicoValida: v.idMedicoValida,
      archivoNuevo: this.archivoNuevo(),
      quitarArchivoExistente: habiaArchivo && !quedaArchivo,
    };
    this.dialogRef.close(resultado);
  }
}
