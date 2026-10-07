import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

// PermisoDto. Solo lectura por ahora: el mantenimiento de Roles necesita
// la lista completa para armar el checklist de permisos a asignar, pero no
// se construyó una pantalla propia para crear/editar permisos todavía.
export interface Permiso {
  idPermiso: number;
  codigo: string;
  nombre: string;
  idModulo: number;
  descripcion: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class PermisosService {
  private http = inject(HttpClient);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/permisos';

  private registros = signal<Permiso[]>([]);
  cargando = signal(false);

  listar = computed(() => [...this.registros()].filter((p) => p.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  cargar(): void {
    this.cargando.set(true);
    this.http
      .get<ApiResponse<Permiso[]>>(this.apiUrl)
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
