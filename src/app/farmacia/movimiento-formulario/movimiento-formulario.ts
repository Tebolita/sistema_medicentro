import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InventarioFarmaciaService } from '../../service/inventario-farmacia.service';
import { TIPOS_MOVIMIENTO, TIPO_MOVIMIENTO_SALIDA } from '../farmacia-catalogos';

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
  tiposMovimiento = TIPOS_MOVIMIENTO;

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

  itemSeleccionado = computed(() => {
    const id = this.form.controls.idItemInventario.value;
    return id ? this.inventarioService.obtener(id) : undefined;
  });

  constructor() {
    afterNextRender(() => this.inventarioService.cargar());
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
    if (this.form.invalid) {
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
