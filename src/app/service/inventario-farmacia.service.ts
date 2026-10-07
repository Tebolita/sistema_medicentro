import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { ItemInventario, MovimientoInventario } from '../models';
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

// EditarItemFarmaciaDto: a diferencia de crear, NO lleva stockActual — el
// backend no deja tocar el stock desde acá, solo desde un movimiento.
export interface EditarItemFarmacia {
  idMedicamento: number | null;
  idProveedor: number | null;
  nombre: string;
  idUnidadMedida: number;
  stockMinimo: number;
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

  // El backend no tiene un listado global de movimientos: se arma juntando
  // los de cada item (GET /api/inventario-farmacia/{id}/movimientos).
  private movimientos = signal<MovimientoInventario[]>([]);
  cargandoMovimientos = signal(false);
  errorMovimientos = signal('');

  listarMovimientos = computed(() =>
    [...this.movimientos()].sort((a, b) => b.fechaMovimiento.localeCompare(a.fechaMovimiento)),
  );

  movimientosDe(idItemInventario: number): MovimientoInventario[] {
    return this.listarMovimientos().filter((m) => m.idItemInventario === idItemInventario);
  }

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

  // Trae el inventario y, con él, los movimientos de cada item.
  cargarMovimientos(): void {
    this.cargandoMovimientos.set(true);
    this.errorMovimientos.set('');
    this.http
      .get<ApiResponse<ItemInventario[]>>(this.apiUrl)
      .pipe(
        map((resp) => resp.datos ?? []),
        tap((items) => this.items.set(items)),
        switchMap((items) =>
          items.length
            ? forkJoin(items.map((i) => this.pedirMovimientos(i.idItemInventario)))
            : of([] as MovimientoInventario[][]),
        ),
        catchError(this.errorService.handleError),
      )
      .subscribe({
        next: (porItem) => {
          this.movimientos.set(porItem.flat());
          this.cargandoMovimientos.set(false);
        },
        error: (err: Error) => {
          this.errorMovimientos.set(err.message);
          this.cargandoMovimientos.set(false);
        },
      });
  }

  private pedirMovimientos(idItemInventario: number): Observable<MovimientoInventario[]> {
    return this.http
      .get<ApiResponse<MovimientoInventario[]>>(`${this.apiUrl}/${idItemInventario}/movimientos`)
      .pipe(map((resp) => resp.datos ?? []));
  }

  agregarItem(item: CrearItemFarmacia): Observable<ItemInventario> {
    return this.http.post<ApiResponse<ItemInventario>>(this.apiUrl, item).pipe(
      map((resp) => resp.datos as ItemInventario),
      tap((nuevo) => this.items.update((lista) => [...lista, nuevo])),
      catchError(this.errorService.handleError),
    );
  }

  // Para editar un item directo por URL (recarga de página).
  obtenerPorId(id: number): Observable<ItemInventario> {
    return this.http.get<ApiResponse<ItemInventario>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as ItemInventario),
      tap((item) => this.guardarEnCache(item)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, item: EditarItemFarmacia): Observable<ItemInventario> {
    return this.http.put<ApiResponse<ItemInventario>>(`${this.apiUrl}/${id}`, item).pipe(
      map((resp) => resp.datos as ItemInventario),
      tap((actualizado) => this.guardarEnCache(actualizado)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.items.update((lista) => lista.filter((i) => i.idItemInventario !== id))),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(item: ItemInventario): void {
    this.items.update((lista) =>
      lista.some((x) => x.idItemInventario === item.idItemInventario)
        ? lista.map((x) => (x.idItemInventario === item.idItemInventario ? item : x))
        : [...lista, item],
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
        switchMap((actualizado) =>
          this.pedirMovimientos(idItemInventario).pipe(
            tap((movs) =>
              this.movimientos.update((lista) => [
                ...lista.filter((m) => m.idItemInventario !== idItemInventario),
                ...movs,
              ]),
            ),
            map(() => actualizado),
          ),
        ),
        catchError(this.errorService.handleError),
      );
  }
}
