import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

// AseguradorasController ya tiene CRUD completo, pero por ahora solo se
// necesita el listado como apoyo del selector del formulario de convenio.
export interface Aseguradora {
  idAseguradora: number;
  nombre: string;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class AseguradorasService {
  private http = inject(HttpClient);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/aseguradoras';

  private registros = signal<Aseguradora[]>([]);
  cargando = signal(false);

  listar = computed(() => [...this.registros()].filter((a) => a.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  cargar(): void {
    this.cargando.set(true);
    this.http
      .get<ApiResponse<Aseguradora[]>>(this.apiUrl)
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
