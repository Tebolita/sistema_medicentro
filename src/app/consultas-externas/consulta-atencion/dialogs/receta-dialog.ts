import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Medicamento } from '../../../models/tratamiento.model';
import { ItemInventario } from '../../../models/inventario.model';

export interface RecetaDialogData {
  medicamentos: Medicamento[];
  itemsInventario: ItemInventario[];
  unidadesMedida: { id: number; label: string }[];
  // Recetas vigentes de esta cita a las que se les puede agregar otra línea,
  // en vez de crear una receta nueva (ver SOLICITUD_MOTOR_CONSULTAS.md:
  // "una receta puede tener n medicamentos, otra receta solo si hace falta").
  recetasVigentes: { idReceta: number; resumen: string }[];
}

export interface RecetaDialogResultado {
  // null = crear una receta nueva con esta línea. Si trae un id, se agrega
  // como una línea más a esa receta existente.
  idRecetaDestino: number | null;
  // Exactamente uno de los dos: medicamento del inventario de la clínica, o
  // el nombre libre de un medicamento externo que no se maneja aquí.
  idMedicamento: number | null;
  nombreMedicamentoExterno: string | null;
  cantidad: number;
  dosis: string;
  frecuencia: string;
  duracion: string | null;
  indicaciones: string | null;
}

// Popup para agregar un medicamento a una receta de la consulta (nueva o
// una que ya esté vigente).
@Component({
  selector: 'app-receta-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
  ],
  templateUrl: './receta-dialog.html',
  styleUrl: './dialogs.css',
})
export class RecetaDialog {
  data = inject<RecetaDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<RecetaDialog>);
  private fb = inject(FormBuilder);

  // Si ya hay alguna receta vigente, por defecto se agrega a la más
  // reciente (primera de la lista) en vez de crear otra de entrada.
  form = this.fb.nonNullable.group({
    idRecetaDestino: this.fb.control<number | null>(this.data.recetasVigentes[0]?.idReceta ?? null),
    esExterno: this.fb.nonNullable.control<boolean>(false),
    idMedicamento: this.fb.control<number | null>(null),
    nombreMedicamentoExterno: this.fb.nonNullable.control<string>(''),
    cantidad: this.fb.nonNullable.control<number>(1, [Validators.required, Validators.min(0.01)]),
    dosis: ['', Validators.required],
    frecuencia: ['', Validators.required],
    duracion: [''],
    indicaciones: [''],
  });

  private idMedicamentoSeleccionado = signal<number | null>(null);
  esExterno = signal(false);
  intentoGuardar = signal(false);

  constructor() {
    this.form.controls.idMedicamento.valueChanges.subscribe((id) => this.idMedicamentoSeleccionado.set(id));
    this.form.controls.esExterno.valueChanges.subscribe((esExterno) => {
      this.esExterno.set(esExterno);
      if (esExterno) {
        this.form.controls.idMedicamento.reset(null);
      } else {
        this.form.controls.nombreMedicamentoExterno.reset('');
      }
    });
  }

  // Item de inventario de ese medicamento (si lo maneja la clínica).
  itemInventario = computed(() => {
    const id = this.idMedicamentoSeleccionado();
    if (id === null) return null;
    return this.data.itemsInventario.find((i) => i.idMedicamento === id) ?? null;
  });

  unidadLabel(idUnidadMedida: number): string {
    return this.data.unidadesMedida.find((u) => u.id === idUnidadMedida)?.label ?? '';
  }

  // Aviso informativo de stock — no bloquea: el médico decide (puede
  // reabastecerse pronto, o el paciente lo compra en otro lado si no
  // alcanza). Ver SOLICITUD_MOTOR_CONSULTAS.md.
  avisoStock = computed(() => {
    if (this.esExterno()) return null;
    const item = this.itemInventario();
    const cantidad = this.form.controls.cantidad.value ?? 0;
    if (!item) {
      return { tipo: 'sin-inventario' as const, mensaje: 'Este medicamento no se maneja en el inventario de la clínica.' };
    }
    const unidad = this.unidadLabel(item.idUnidadMedida);
    if (item.stockActual < cantidad) {
      return {
        tipo: 'insuficiente' as const,
        mensaje: `Stock insuficiente: solo hay ${item.stockActual} ${unidad} disponibles.`,
      };
    }
    return { tipo: 'disponible' as const, mensaje: `Stock disponible: ${item.stockActual} ${unidad}.` };
  });

  cancelar(): void {
    this.dialogRef.close(null);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    this.intentoGuardar.set(true);
    const v = this.form.getRawValue();
    const nombreExterno = v.nombreMedicamentoExterno.trim();

    if (this.form.invalid || (v.esExterno ? !nombreExterno : v.idMedicamento === null)) {
      return;
    }

    const resultado: RecetaDialogResultado = {
      idRecetaDestino: v.idRecetaDestino,
      idMedicamento: v.esExterno ? null : v.idMedicamento,
      nombreMedicamentoExterno: v.esExterno ? nombreExterno : null,
      cantidad: v.cantidad,
      dosis: v.dosis.trim(),
      frecuencia: v.frecuencia.trim(),
      duracion: v.duracion.trim() || null,
      indicaciones: v.indicaciones.trim() || null,
    };
    this.dialogRef.close(resultado);
  }
}
