import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CatalogosService } from '../../service/catalogos.service';

export interface OperacionDialogData {
  idTipoOperacion: number | null;
  notasOperacion: string | null;
}

export interface OperacionDialogResultado {
  idTipoOperacion: number;
  notasOperacion: string | null;
}

// Modal que obliga a capturar QUÉ operación se va a realizar al marcar una
// consulta "para operación" — ver SOLICITUD_MOTOR_CONSULTAS.md, sección 5
// (decisión confirmada: alerta, no una automatización silenciosa).
@Component({
  selector: 'app-operacion-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  templateUrl: './operacion-dialog.html',
  styleUrl: './operacion-dialog.css',
})
export class OperacionDialog {
  data = inject<OperacionDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? { idTipoOperacion: null, notasOperacion: null };
  private dialogRef = inject(MatDialogRef<OperacionDialog>);
  private fb = inject(FormBuilder);
  private catalogosService = inject(CatalogosService);

  private tiposApi = this.catalogosService.obtener('TIPO_OPERACION');
  tipos = computed(() => this.tiposApi().map((v) => ({ id: v.id, nombre: v.nombre })));

  form = this.fb.nonNullable.group({
    idTipoOperacion: this.fb.control<number | null>(this.data.idTipoOperacion, Validators.required),
    notasOperacion: [this.data.notasOperacion ?? ''],
  });

  cancelar(): void {
    this.dialogRef.close(null);
  }

  confirmar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const resultado: OperacionDialogResultado = {
      idTipoOperacion: v.idTipoOperacion!,
      notasOperacion: v.notasOperacion.trim() || null,
    };
    this.dialogRef.close(resultado);
  }
}
