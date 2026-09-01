import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LibroActasService } from './libro-actas.service';
import { RECEPCIONISTAS } from './libro-actas-catalogos';
import { PacientesService } from '../pacientes/pacientes.service';

@Component({
  selector: 'app-libro-actas',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './libro-actas.html',
  styleUrl: './libro-actas.css',
})
export class LibroActas {
  private fb = inject(FormBuilder);
  private libroActasService = inject(LibroActasService);
  private pacientesService = inject(PacientesService);

  mostrarFormulario = signal(false);

  pacientes = this.pacientesService.listar;
  recepcionistas = RECEPCIONISTAS;

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    motivoIngreso: ['', Validators.required],
    idAtendidoPor: this.fb.control<number | null>(null, Validators.required),
    observaciones: [''],
  });

  actas = this.libroActasService.listar;

  toggleFormulario(): void {
    this.mostrarFormulario.update((v) => !v);
  }

  registrar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    this.libroActasService.agregar({
      idPaciente: v.idPaciente!,
      motivoIngreso: v.motivoIngreso,
      idAtendidoPor: v.idAtendidoPor!,
      observaciones: v.observaciones || null,
      fechaHora: new Date().toISOString(),
    });
    this.form.reset();
    this.mostrarFormulario.set(false);
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Eliminar el acta de "${nombre}"?`)) {
      return;
    }
    this.libroActasService.eliminar(id);
  }

  formatFechaHora(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.listar().find((pac) => pac.idPaciente === idPaciente);
    if (!p) {
      return 'Paciente no encontrado';
    }
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
  }

  atendidoPorLabel(idAtendidoPor: number): string {
    return this.recepcionistas.find((r) => r.id === idAtendidoPor)?.nombre ?? '—';
  }

  iniciales(idPaciente: number): string {
    const partes = this.nombrePaciente(idPaciente).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }
}
