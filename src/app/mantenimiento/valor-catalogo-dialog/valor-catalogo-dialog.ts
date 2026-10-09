import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CatalogoValor, CatalogosService } from '../../service/catalogos.service';

export interface ValorCatalogoDialogData {
  codigoTipo: string;
  nombreTipo: string;
  // Si viene, es edición; si no, es "nuevo valor".
  valor?: CatalogoValor;
  siguienteOrden: number;
}

// Popup para crear o editar un valor dentro de un catálogo (en vez del
// formulario inline que se mezclaba con la tarjeta de arriba).
@Component({
  selector: 'app-valor-catalogo-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './valor-catalogo-dialog.html',
  styleUrl: './valor-catalogo-dialog.css',
})
export class ValorCatalogoDialog {
  data = inject<ValorCatalogoDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ValorCatalogoDialog>);
  private fb = inject(FormBuilder);
  private catalogosService = inject(CatalogosService);

  esNuevo = !this.data.valor;
  guardando = signal(false);
  error = signal('');

  // El backend no valida que "orden" sea único dentro del catálogo (solo
  // el código), así que dos valores podrían terminar con el mismo número
  // y confundir el orden real. Se bloquea acá antes de guardar: el valor
  // que se está editando no cuenta contra sí mismo. Declarado ANTES de
  // "form" porque el control de abajo lo usa como validador al crearse.
  private ordenDuplicadoValidator = (control: AbstractControl): ValidationErrors | null => {
    const propio = this.data.valor?.id;
    const duplicado = this.catalogosService
      .obtener(this.data.codigoTipo)()
      .some((v) => v.orden === control.value && v.id !== propio);
    return duplicado ? { ordenDuplicado: true } : null;
  };

  form = this.fb.nonNullable.group({
    codigo: [this.data.valor?.codigo ?? '', [Validators.required, Validators.pattern(/^[A-Za-z0-9_]+$/)]],
    nombre: [this.data.valor?.nombre ?? '', Validators.required],
    descripcion: [''],
    orden: [
      this.data.valor?.orden ?? this.data.siguienteOrden,
      [Validators.required, Validators.min(1), this.ordenDuplicadoValidator],
    ],
  });

  cerrar(): void {
    this.dialogRef.close(false);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input = {
      codigo: v.codigo.trim().toUpperCase(),
      nombre: v.nombre.trim(),
      descripcion: v.descripcion.trim() || null,
      orden: v.orden,
    };

    this.guardando.set(true);
    this.error.set('');
    const idValor = this.data.valor?.id;
    const peticion = idValor
      ? this.catalogosService.editarValor(this.data.codigoTipo, idValor, input)
      : this.catalogosService.crearValor(this.data.codigoTipo, input);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
