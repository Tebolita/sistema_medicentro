import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InventarioFarmaciaService } from '../inventario-farmacia.service';
import { ESTADOS_ITEM_INVENTARIO, MEDICAMENTOS, UNIDADES_MEDIDA } from '../farmacia-catalogos';

@Component({
  selector: 'app-item-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './item-formulario.html',
  styleUrl: './item-formulario.css',
})
export class ItemFormulario {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private inventarioService = inject(InventarioFarmaciaService);

  medicamentos = MEDICAMENTOS;
  unidadesMedida = UNIDADES_MEDIDA;
  estadosItem = ESTADOS_ITEM_INVENTARIO;

  form = this.fb.nonNullable.group({
    idMedicamento: this.fb.control<number | null>(null, Validators.required),
    nombre: ['', Validators.required],
    idUnidadMedida: this.fb.control<number | null>(1, Validators.required),
    stockMinimo: [0, [Validators.required, Validators.min(0)]],
    stockActual: [0, [Validators.required, Validators.min(0)]],
    idEstadoItem: [1, Validators.required],
  });

  onMedicamentoSeleccionado(idMedicamento: number): void {
    const medicamento = this.medicamentos.find((m) => m.id === idMedicamento);
    if (medicamento && !this.form.controls.nombre.value) {
      this.form.patchValue({ nombre: medicamento.nombre });
    }
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    this.inventarioService.agregarItem({
      idMedicamento: v.idMedicamento,
      idProveedor: null,
      nombre: v.nombre,
      idUnidadMedida: v.idUnidadMedida!,
      stockMinimo: v.stockMinimo,
      stockActual: v.stockActual,
      idEstadoItem: v.idEstadoItem,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    });

    this.router.navigate(['/home/farmacia']);
  }
}
