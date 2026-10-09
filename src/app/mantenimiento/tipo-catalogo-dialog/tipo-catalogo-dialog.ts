import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CatalogosService } from '../../service/catalogos.service';

// Popup para crear un catálogo (cat_tipo_catalogo) nuevo. El backend ya
// tiene GET /api/catalogos (lista todos los que existen), así que al
// guardar basta con pedirle al servicio que recargue esa lista — no hace
// falta que este popup recuerde nada más (grupo/ícono ya no se usan: la
// pantalla principal ya no agrupa y el ícono de la tarjeta es siempre el
// mismo, ver catalogos-lista.ts).
@Component({
  selector: 'app-tipo-catalogo-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './tipo-catalogo-dialog.html',
  styleUrl: './tipo-catalogo-dialog.css',
})
export class TipoCatalogoDialog {
  private dialogRef = inject(MatDialogRef<TipoCatalogoDialog>);
  private fb = inject(FormBuilder);
  private catalogosService = inject(CatalogosService);

  guardando = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_]+$/)]],
    nombre: ['', Validators.required],
    descripcion: [''],
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

    this.guardando.set(true);
    this.error.set('');
    this.catalogosService
      .crearTipo({ codigo: v.codigo.trim().toUpperCase(), nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null })
      .subscribe({
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
