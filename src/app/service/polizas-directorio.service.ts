import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PolizaSeguro } from '../models';
import { ApiResponse } from '../models/api-response.model';

// Pólizas reales (GET /api/Polizas) para elegir en las facturas Digefact.
// Es solo lectura y va aparte de PolizasService (datos en memoria del módulo
// de Pólizas, que se trabaja por separado) para no pisarlo.
@Injectable({ providedIn: 'root' })
export class PolizasDirectorioService {
  private http = inject(HttpClient);

  private registros = signal<PolizaSeguro[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => this.registros().filter((p) => p.activo));

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      setTimeout(() => this.cargar());
    }
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http.get<ApiResponse<PolizaSeguro[]>>('https://localhost:7086/api/Polizas').subscribe({
      next: (resp) => {
        this.registros.set(resp.datos ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudo cargar el listado de pólizas.');
        this.cargando.set(false);
      },
    });
  }
}
