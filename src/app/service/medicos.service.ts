import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

// MedicoDto real del backend (GET /api/empleados/medicos).
export interface Medico {
  idEmpleado: number;
  nombreCompleto: string;
  colegiado: string | null;
  idEspecialidad: number | null;
  correo: string | null;
  telefono: string | null;
}

// Reemplaza la lista de 3 médicos de ejemplo que traía Farmacia
// (Sandoval/Estrada/Fernández, ids 1-3) por el personal médico real.
@Injectable({ providedIn: 'root' })
export class MedicosService {
  private http = inject(HttpClient);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/empleados/medicos';

  private registros = signal<Medico[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => this.registros());

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Medico[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de médicos.');
          this.cargando.set(false);
        },
      });
  }

  nombreDe(idEmpleado: number): string {
    return this.registros().find((m) => m.idEmpleado === idEmpleado)?.nombreCompleto ?? '—';
  }
}
