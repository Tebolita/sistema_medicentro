import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';

export interface CostoPacienteConsultaDialogData {
  medicamentos: { idMedicamento: number; nombre: string; precioVentaPublico: number }[];
}

export interface CostoPacienteConsultaDialogResultado {
  idMedicamento: number | null;
  fecha: Date;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
}

// Popup para dejar un costo en ESTA consulta externa — replica el papel
// "COSTO PACIENTE" del Sanatorio Medicentro. Seleccionar un medicamento del
// catálogo prellena descripción y valor unitario (siguen siendo editables),
// o se puede capturar libre para cosas que no son medicamentos.
@Component({
  selector: 'app-costo-paciente-consulta-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatButtonModule, MatIconModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './costo-paciente-consulta-dialog.html',
  styleUrl: './dialogs.css',
})
export class CostoPacienteConsultaDialog {
  data = inject<CostoPacienteConsultaDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<CostoPacienteConsultaDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    idMedicamento: this.fb.control<number | null>(null),
    fecha: this.fb.control<Date | null>(new Date(), Validators.required),
    descripcion: ['', Validators.required],
    cantidad: this.fb.nonNullable.control<number>(1, [Validators.required, Validators.min(0.01)]),
    valorUnitario: this.fb.nonNullable.control<number>(0, [Validators.required, Validators.min(0)]),
  });

  onSeleccionarMedicamento(idMedicamento: number | null): void {
    const m = idMedicamento != null ? this.data.medicamentos.find((x) => x.idMedicamento === idMedicamento) : null;
    if (m) {
      this.form.patchValue({ descripcion: m.nombre, valorUnitario: m.precioVentaPublico });
    }
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const resultado: CostoPacienteConsultaDialogResultado = {
      idMedicamento: v.idMedicamento,
      fecha: v.fecha!,
      descripcion: v.descripcion.trim(),
      cantidad: v.cantidad,
      valorUnitario: v.valorUnitario,
    };
    this.dialogRef.close(resultado);
  }
}
