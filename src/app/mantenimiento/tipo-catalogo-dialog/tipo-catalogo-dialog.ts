import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CatalogoTipo, CatalogosService } from '../../service/catalogos.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

export interface TipoCatalogoDialogData {
  // Si viene, es edición; si no, es "nuevo catálogo".
  tipo?: CatalogoTipo;
}

// Popup para crear o editar un catálogo (cat_tipo_catalogo). El backend ya
// tiene GET /api/catalogos (lista todos los que existen, con su módulo
// real), así que al guardar basta con pedirle al servicio que recargue esa
// lista. El código no se puede editar (el backend resuelve los catálogos
// por ese código), por eso se bloquea en modo edición.
@Component({
  selector: 'app-tipo-catalogo-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './tipo-catalogo-dialog.html',
  styleUrl: './tipo-catalogo-dialog.css',
})
export class TipoCatalogoDialog {
  data = inject<TipoCatalogoDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  private dialogRef = inject(MatDialogRef<TipoCatalogoDialog>);
  private fb = inject(FormBuilder);
  private catalogosService = inject(CatalogosService);
  private notificaciones = inject(NotificacionesService);

  esNuevo = !this.data.tipo;
  guardando = signal(false);
  error = signal('');

  private modulosApi = this.catalogosService.obtener('MODULO_SISTEMA');
  modulos = computed(() => this.modulosApi().map((v) => ({ codigo: v.codigo, nombre: v.nombre })));

  form = this.fb.nonNullable.group({
    codigo: [this.data.tipo?.codigo ?? '', [Validators.required, Validators.pattern(/^[A-Za-z0-9_]+$/)]],
    nombre: [this.data.tipo?.nombre ?? '', Validators.required],
    descripcion: [this.data.tipo?.descripcion ?? ''],
    codigoModulo: this.fb.control<string | null>(this.data.tipo?.codigoModulo ?? null),
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
      nombre: v.nombre.trim(),
      descripcion: v.descripcion.trim() || null,
      codigoModulo: v.codigoModulo,
    };

    this.guardando.set(true);
    this.error.set('');
    const peticion = this.data.tipo
      ? this.catalogosService.editarTipo(this.data.tipo.codigo, input)
      : this.catalogosService.crearTipo({ ...input, codigo: v.codigo.trim().toUpperCase() });
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.notificaciones.exito(this.esNuevo ? 'Creado correctamente' : 'Actualizado correctamente');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
