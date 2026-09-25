import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ItemInventario } from '../models';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// Datos que el backend espera para crear un medicamento en inventario
// (CrearItemFarmaciaDto). El tipo de ítem (medicamento) lo fuerza el backend.
export interface CrearItemFarmacia {
  idMedicamento: number | null;
  idProveedor: number | null;
  nombre: string;
  idUnidadMedida: number;
  stockMinimo: number;
  stockActual: number;
  idEstadoItem: number;
}

@Injectable({ providedIn: 'root' })
export class InventarioFarmaciaService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = 'https://localhost:7086/api/inventario-farmacia';

  // Caché en memoria de la última lista traída del backend; las pantallas la
  // leen de acá y se refresca con cargar() o al crear/mover stock.
  private items = signal<ItemInventario[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => this.items());
  bajoStock = computed(() => this.items().filter((i) => i.bajoStock));

  obtener(id: number): ItemInventario | undefined {
    return this.items().find((i) => i.idItemInventario === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<ItemInventario[]>>(this.apiUrl)
      .pipe(catchError(this.errorService.handleError))
      .subscribe({
        next: (resp) => {
          this.items.set(resp.datos ?? []);
          this.cargando.set(false);
        },
        error: (err: Error) => {
          this.errorCarga.set(err.message);
          this.cargando.set(false);
        },
      });
  }

  agregarItem(item: CrearItemFarmacia): Observable<ItemInventario> {
    return this.http.post<ApiResponse<ItemInventario>>(this.apiUrl, item).pipe(
      map((resp) => resp.datos as ItemInventario),
      tap((nuevo) => this.items.update((lista) => [...lista, nuevo])),
      catchError(this.errorService.handleError),
    );
  }

  // El backend devuelve el ítem ya con el stock actualizado.
  registrarMovimiento(
    idItemInventario: number,
    idTipoMovimiento: number,
    cantidad: number,
    motivo: string | null,
  ): Observable<ItemInventario> {
    return this.http
      .post<ApiResponse<ItemInventario>>(`${this.apiUrl}/${idItemInventario}/movimientos`, {
        idTipoMovimiento,
        cantidad,
        motivo,
      })
      .pipe(
        map((resp) => resp.datos as ItemInventario),
        tap((actualizado) =>
          this.items.update((lista) =>
            lista.map((i) => (i.idItemInventario === actualizado.idItemInventario ? actualizado : i)),
          ),
        ),
        catchError(this.errorService.handleError),
      );
  }
}
