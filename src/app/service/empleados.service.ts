import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

// Empleado real (EmpleadosController tiene CRUD completo; acá solo se
// necesita el listado para vincular un usuario a su empleado).
export interface Empleado {
  idEmpleado: number;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  correo: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmpleadosService {
  private http = inject(HttpClient);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/empleados';

  private registros = signal<Empleado[]>([]);
  cargando = signal(false);

  listar = computed(() => [...this.registros()].filter((e) => e.activo).sort((a, b) => a.primerApellido.localeCompare(b.primerApellido)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  nombreCompleto(idEmpleado: number): string {
    const e = this.registros().find((x) => x.idEmpleado === idEmpleado);
    return e ? [e.primerNombre, e.segundoNombre, e.primerApellido, e.segundoApellido].filter(Boolean).join(' ') : '—';
  }

  cargar(): void {
    this.cargando.set(true);
    this.http
      .get<ApiResponse<Empleado[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }
}
