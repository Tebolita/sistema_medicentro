import { Component, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InventarioFarmaciaService } from '../../service/inventario-farmacia.service';
import { TIPOS_MOVIMIENTO, TIPO_MOVIMIENTO_ENTRADA, TIPO_MOVIMIENTO_SALIDA } from '../farmacia-catalogos';
import { CatalogosService } from '../../service/catalogos.service';

@Component({
  selector: 'app-movimiento-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './movimiento-formulario.html',
  styleUrl: './movimiento-formulario.css',
})
export class MovimientoFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventarioService = inject(InventarioFarmaciaService);

  items = this.inventarioService.listar;

  // TIPO_MOVIMIENTO_INVENTARIO es el código real que ya usa el backend
  // (Servicios/InventarioFarmaciaService.cs) para resolver la entrada de
  // stock; si existe en la base se usan sus valores reales, si no, la
  // lista de ejemplo.
  private catalogos = inject(CatalogosService);
  private tiposMovimientoApi = this.catalogos.obtener('TIPO_MOVIMIENTO_INVENTARIO');
  tiposMovimiento = computed(() => {
    const api = this.tiposMovimientoApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_MOVIMIENTO;
  });

  // Si se llega desde "Registrar venta" en el header de Farmacia, la
  // pantalla se enmarca como venta (salida) en vez del formulario genérico
  // de movimiento de inventario.
  esVenta = signal(false);
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    idItemInventario: this.fb.control<number | null>(null, Validators.required),
    idTipoMovimiento: this.fb.control<number | null>(TIPO_MOVIMIENTO_SALIDA, Validators.required),
    cantidad: [1, [Validators.required, Validators.min(1)]],
    motivo: [''],
  });

  // Un computed() de Angular solo se vuelve a calcular cuando lee una signal;
  // `form.controls.x.value` es una propiedad normal, no una signal, así que
  // si el computed la lee directamente queda "pegado" en el primer valor que
  // vio (acá, vacío) y nunca se entera de los cambios del formulario. Por
  // eso cada control relevante también se refleja en una signal propia vía
  // valueChanges, y los computed() leen esa signal en vez del FormControl.
  private idItemInventario = signal<number | null>(null);
  itemSeleccionado = computed(() => {
    const id = this.idItemInventario();
    return id ? this.inventarioService.obtener(id) : undefined;
  });

  // El backend descuenta stock en cualquier movimiento que no sea "entrada"
  // (salida, ajuste o merma; ver InventarioFarmaciaService.cs), así que la
  // validación de stock disponible aplica igual a los tres.
  private idTipoMovimiento = signal<number | null>(TIPO_MOVIMIENTO_SALIDA);
  private cantidad = signal(1);

  esEntrada = computed(() => {
    const idEntrada = this.catalogos.idPorCodigo('TIPO_MOVIMIENTO_INVENTARIO', 'ENTRADA') ?? TIPO_MOVIMIENTO_ENTRADA;
    return this.idTipoMovimiento() === idEntrada;
  });

  stockInsuficiente = computed(() => {
    const item = this.itemSeleccionado();
    if (!item || this.esEntrada()) {
      return false;
    }
    return this.cantidad() > item.stockActual;
  });

  constructor() {
    afterNextRender(() => this.inventarioService.cargar());

    this.form.controls.idItemInventario.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.idItemInventario.set(v));
    this.form.controls.idTipoMovimiento.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.idTipoMovimiento.set(v));
    this.form.controls.cantidad.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => this.cantidad.set(v));

    // El control arranca con el id de ejemplo de "Salida"; en cuanto llega
    // el catálogo real se reemplaza por el id verdadero de SALIDA/ENTRADA,
    // pero solo si la persona no lo ha tocado.
    effect(() => {
      const idReal = this.catalogos.idPorCodigo('TIPO_MOVIMIENTO_INVENTARIO', 'SALIDA');
      if (idReal !== undefined && this.form.controls.idTipoMovimiento.pristine) {
        this.form.controls.idTipoMovimiento.setValue(idReal);
      }
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const itemParam = params.get('item');
      if (itemParam) {
        this.form.patchValue({ idItemInventario: Number(itemParam) });
      }
      const tipoParam = params.get('tipo');
      if (tipoParam === 'venta') {
        this.esVenta.set(true);
        this.form.patchValue({ idTipoMovimiento: TIPO_MOVIMIENTO_SALIDA, motivo: 'Venta directa' });
      }
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.stockInsuficiente()) {
      return;
    }

    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.errorMsg.set('');
    this.inventarioService
      .registrarMovimiento(v.idItemInventario!, v.idTipoMovimiento!, v.cantidad, v.motivo || null)
      .subscribe({
        next: () => this.router.navigate(['/home/farmacia']),
        error: (err: Error) => {
          this.errorMsg.set(err.message);
          this.guardando.set(false);
        },
      });
  }
}
