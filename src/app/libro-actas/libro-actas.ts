import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';

import { ActaService } from '../service/acta.service';
import { PacienteService } from '../service/paciente.service';
import { EmpleadoService } from '../service/empleado.service';
import { PuestoService } from '../service/puesto.service';
import { Acta, ActaRequest } from '../models/acta.model';
import { PacienteListado } from '../models/paciente.model';

// Forma que espera el HTML en el selector "Atendido por".
interface Recepcionista {
  id: number;
  nombre: string;
}

// Nombre del puesto en la tabla `puestos` (se busca por nombre, no por id).
const PUESTO_RECEPCION = 'recepcionista';

// Fecha + hora LOCAL como 'YYYY-MM-DDTHH:mm:ss' (sin 'Z'): si no se manda,
// el backend usa la hora UTC y el acta saldría 6 horas adelantada.
function toIsoDateTimeLocal(value: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}T${p(value.getHours())}:${p(value.getMinutes())}:${p(value.getSeconds())}`;
}

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
  private actaService = inject(ActaService);
  private pacienteService = inject(PacienteService);
  private empleadoService = inject(EmpleadoService);
  private puestoService = inject(PuestoService);
  private platformId = inject(PLATFORM_ID);

  mostrarFormulario = signal(false);
  guardando = signal(false);

  // Datos reales desde la API (ya no hay datos de ejemplo).
  pacientes = signal<PacienteListado[]>([]);
  private recepcionistasApi = signal<Recepcionista[]>([]);
  actas = signal<Acta[]>([]);

  get recepcionistas() { return this.recepcionistasApi(); }

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    motivoIngreso: ['', Validators.required],
    idAtendidoPor: this.fb.control<number | null>(null, Validators.required),
    observaciones: [''],
  });

  constructor() {
    // En el servidor (SSR) no hay sesión ni token: solo se consulta desde el navegador.
    if (isPlatformBrowser(this.platformId)) {
      this.cargar();
    }
  }

  private cargar(): void {
    forkJoin({
      actas: this.actaService.RetornarActas(),
      pacientes: this.pacienteService.RetornarPacientes(),
      puestos: this.puestoService.RetornarPuestos(),
    }).subscribe({
      next: (r) => {
        this.actas.set(r.actas.datos ?? []);
        this.pacientes.set(r.pacientes.datos ?? []);
        const puesto = (r.puestos.datos ?? []).find((p) => p.nombre.trim().toLowerCase() === PUESTO_RECEPCION);
        if (puesto) {
          this.cargarRecepcionistas(puesto.idPuesto);
        } else {
          // Sin el puesto en la base se muestran todos los empleados activos.
          console.warn('No existe el puesto "Recepcionista" en la tabla puestos; se listan todos los empleados.');
          this.cargarRecepcionistas();
        }
      },
      error: (err: Error) => alert('No se pudo cargar el libro de actas: ' + err.message),
    });
  }

  private cargarRecepcionistas(idPuesto?: number): void {
    this.empleadoService.RetornarEmpleados(idPuesto).subscribe({
      next: (resp) =>
        this.recepcionistasApi.set(
          (resp.datos ?? []).map((e) => ({
            id: e.idEmpleado,
            nombre: [e.primerNombre, e.segundoNombre, e.primerApellido, e.segundoApellido].filter(Boolean).join(' '),
          })),
        ),
      error: (err: Error) => alert('No se pudo cargar el personal de recepción: ' + err.message),
    });
  }

  toggleFormulario(): void {
    this.mostrarFormulario.update((v) => !v);
  }

  registrar(): void {
    if (this.guardando()) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const request: ActaRequest = {
      idPaciente: v.idPaciente!,
      motivoIngreso: v.motivoIngreso,
      idAtendidoPor: v.idAtendidoPor!,
      observaciones: v.observaciones || null,
      fechaHora: toIsoDateTimeLocal(new Date()),
    };

    this.guardando.set(true);
    this.actaService.CrearActa(request).subscribe({
      next: (resp) => {
        this.guardando.set(false);
        if (resp.datos) {
          // La más reciente va primero, igual que la lista del backend.
          this.actas.update((l) => [resp.datos!, ...l]);
        }
        this.form.reset();
        this.mostrarFormulario.set(false);
      },
      error: (err: Error) => {
        this.guardando.set(false);
        alert('No se pudo registrar el acta: ' + err.message);
      },
    });
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Eliminar el acta de "${nombre}"?`)) {
      return;
    }
    this.actaService.EliminarActa(id).subscribe({
      next: () => this.actas.update((l) => l.filter((a) => a.idActa !== id)),
      error: (err: Error) => alert('No se pudo eliminar el acta: ' + err.message),
    });
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
    const p = this.pacientes().find((pac) => pac.idPaciente === idPaciente);
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