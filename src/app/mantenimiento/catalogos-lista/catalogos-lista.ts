import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CatalogosService } from '../../service/catalogos.service';
import { TIPOS_CATALOGO_CONOCIDOS } from '../mantenimiento-catalogos';

@Component({
  selector: 'app-catalogos-lista',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './catalogos-lista.html',
  styleUrl: './catalogos-lista.css',
})
export class CatalogosLista {
  private fb = inject(FormBuilder);
  private catalogosService = inject(CatalogosService);

  tiposConocidos = TIPOS_CATALOGO_CONOCIDOS;

  // El backend no tiene un endpoint para listar los tipos que existen
  // (GET /api/catalogos/{codigoTipo} asume que ya conoces el código), así
  // que se elige de la lista curada o se escribe uno nuevo a mano.
  tipoSeleccionado = signal<string | null>(null);
  otroCodigo = signal(false);

  valores = computed(() => {
    const codigo = this.tipoSeleccionado();
    return codigo ? this.catalogosService.obtener(codigo)() : [];
  });

  seleccionarTipo(codigo: string): void {
    this.tipoSeleccionado.set(codigo);
    this.cancelarValor();
  }

  seleccionarTipoDesdeInput(event: Event): void {
    const valor = (event.target as HTMLInputElement).value.trim().toUpperCase();
    if (valor) {
      this.seleccionarTipo(valor);
    }
  }

  // --- Crear un tipo de catálogo nuevo ---
  mostrandoFormTipo = signal(false);
  guardandoTipo = signal(false);
  errorTipo = signal('');
  formTipo = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_]+$/)]],
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  abrirFormTipo(): void {
    this.formTipo.reset({ codigo: '', nombre: '', descripcion: '' });
    this.errorTipo.set('');
    this.mostrandoFormTipo.set(true);
  }

  cancelarTipo(): void {
    this.mostrandoFormTipo.set(false);
  }

  guardarTipo(): void {
    this.formTipo.markAllAsTouched();
    if (this.formTipo.invalid) {
      return;
    }
    const v = this.formTipo.getRawValue();
    this.guardandoTipo.set(true);
    this.errorTipo.set('');
    this.catalogosService
      .crearTipo({ codigo: v.codigo.trim().toUpperCase(), nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null })
      .subscribe({
        next: () => {
          this.guardandoTipo.set(false);
          this.mostrandoFormTipo.set(false);
          this.seleccionarTipo(v.codigo.trim().toUpperCase());
        },
        error: (err: Error) => {
          this.errorTipo.set(err.message);
          this.guardandoTipo.set(false);
        },
      });
  }

  // --- Crear/editar un valor dentro del tipo seleccionado ---
  editandoValor = signal<number | null>(null); // null = nuevo, id = editando ese valor
  guardandoValor = signal(false);
  errorValor = signal('');
  formValor = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_]+$/)]],
    nombre: ['', Validators.required],
    descripcion: [''],
    orden: [1, [Validators.required, Validators.min(1)]],
  });

  mostrandoFormValor = signal(false);

  nuevoValor(): void {
    this.editandoValor.set(null);
    this.formValor.reset({ codigo: '', nombre: '', descripcion: '', orden: this.valores().length + 1 });
    this.errorValor.set('');
    this.mostrandoFormValor.set(true);
  }

  editarValor(idValor: number): void {
    const v = this.valores().find((x) => x.id === idValor);
    if (!v) {
      return;
    }
    this.editandoValor.set(idValor);
    // El GET de valores no trae la descripción (solo id/código/nombre/orden),
    // así que al editar queda vacía salvo que se vuelva a escribir.
    this.formValor.reset({ codigo: v.codigo, nombre: v.nombre, descripcion: '', orden: v.orden });
    this.errorValor.set('');
    this.mostrandoFormValor.set(true);
  }

  cancelarValor(): void {
    this.editandoValor.set(null);
    this.mostrandoFormValor.set(false);
    this.formValor.reset({ codigo: '', nombre: '', descripcion: '', orden: 1 });
  }

  guardarValor(): void {
    this.formValor.markAllAsTouched();
    const codigoTipo = this.tipoSeleccionado();
    if (this.formValor.invalid || !codigoTipo) {
      return;
    }
    const v = this.formValor.getRawValue();
    const input = {
      codigo: v.codigo.trim().toUpperCase(),
      nombre: v.nombre.trim(),
      descripcion: v.descripcion.trim() || null,
      orden: v.orden,
    };

    this.guardandoValor.set(true);
    this.errorValor.set('');
    const idEditando = this.editandoValor();
    const peticion = idEditando
      ? this.catalogosService.editarValor(codigoTipo, idEditando, input)
      : this.catalogosService.crearValor(codigoTipo, input);
    peticion.subscribe({
      next: () => {
        this.guardandoValor.set(false);
        this.mostrandoFormValor.set(false);
        this.cancelarValor();
      },
      error: (err: Error) => {
        this.errorValor.set(err.message);
        this.guardandoValor.set(false);
      },
    });
  }

  eliminarValor(idValor: number, nombre: string): void {
    const codigoTipo = this.tipoSeleccionado();
    if (!codigoTipo) {
      return;
    }
    // El backend no tiene forma de reactivar un valor dado de baja (el GET
    // solo trae los activos): aviso explícito de que no es reversible acá.
    if (!confirm(`¿Dar de baja el valor "${nombre}"? No se puede deshacer desde esta pantalla.`)) {
      return;
    }
    this.errorValor.set('');
    this.catalogosService.eliminarValor(codigoTipo, idValor).subscribe({
      error: (err: Error) => this.errorValor.set(err.message),
    });
  }
}
