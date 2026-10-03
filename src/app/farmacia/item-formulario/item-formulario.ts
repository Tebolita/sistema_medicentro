import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ItemInventario } from '../../models';
import { InventarioFarmaciaService } from '../../service/inventario-farmacia.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { ESTADOS_ITEM_INVENTARIO, UNIDADES_MEDIDA } from '../farmacia-catalogos';
import { CatalogosService } from '../../service/catalogos.service';
import { ProveedoresService } from '../../service/proveedores.service';

@Component({
  selector: 'app-item-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './item-formulario.html',
  styleUrl: './item-formulario.css',
})
export class ItemFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventarioService = inject(InventarioFarmaciaService);

  private medicamentosService = inject(MedicamentosService);
  medicamentos = this.medicamentosService.listar;
  // GET /api/proveedores ya existe (ProveedoresController).
  private proveedoresService = inject(ProveedoresService);
  proveedores = this.proveedoresService.listar;
  // Códigos de catálogo sin confirmar con el backend todavía (a diferencia
  // de TIPO_MOVIMIENTO_INVENTARIO/TIPO_ITEM_INVENTARIO): si existen en la
  // base se usan sus valores reales, si no, la lista de ejemplo de siempre.
  private catalogos = inject(CatalogosService);
  private unidadesMedidaApi = this.catalogos.obtener('UNIDAD_MEDIDA');
  unidadesMedida = computed(() => {
    const api = this.unidadesMedidaApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : UNIDADES_MEDIDA;
  });
  private estadosItemApi = this.catalogos.obtener('ESTADO_ITEM_INVENTARIO');
  estadosItem = computed(() => {
    const api = this.estadosItemApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_ITEM_INVENTARIO;
  });

  idItemInventario = signal(0);
  esNuevo = computed(() => this.idItemInventario() === 0);
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    idMedicamento: this.fb.control<number | null>(null, Validators.required),
    idProveedor: this.fb.control<number | null>(null),
    nombre: ['', Validators.required],
    idUnidadMedida: this.fb.control<number | null>(1, Validators.required),
    stockMinimo: [0, [Validators.required, Validators.min(0)]],
    // Solo se puede fijar al crear; al editar el backend no lo acepta (el
    // stock cambia únicamente con "Registrar movimiento"), así que el
    // control se deshabilita en ese modo (ver cargar()).
    stockActual: [0, [Validators.required, Validators.min(0)]],
    idEstadoItem: [1, Validators.required],
  });

  constructor() {
    afterNextRender(() => this.medicamentosService.cargar());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.inventarioService.obtenerPorId(Number(idParam)).subscribe({
        next: (item) => this.cargar(item),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(item: ItemInventario): void {
    this.idItemInventario.set(item.idItemInventario);
    this.form.patchValue({
      idMedicamento: item.idMedicamento,
      idProveedor: item.idProveedor,
      nombre: item.nombre,
      idUnidadMedida: item.idUnidadMedida,
      stockMinimo: item.stockMinimo,
      stockActual: item.stockActual,
      idEstadoItem: item.idEstadoItem,
    });
    // El stock actual solo se puede cambiar con un movimiento, no editando el item.
    this.form.controls.stockActual.disable();
  }

  onMedicamentoSeleccionado(idMedicamento: number): void {
    const medicamento = this.medicamentos().find((m) => m.idMedicamento === idMedicamento);
    if (medicamento && !this.form.controls.nombre.value) {
      this.form.patchValue({ nombre: medicamento.nombre });
    }
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.errorMsg.set('');

    const peticion = this.esNuevo()
      ? this.inventarioService.agregarItem({
          idMedicamento: v.idMedicamento,
          idProveedor: v.idProveedor,
          nombre: v.nombre,
          idUnidadMedida: v.idUnidadMedida!,
          stockMinimo: v.stockMinimo,
          stockActual: v.stockActual,
          idEstadoItem: v.idEstadoItem,
        })
      : this.inventarioService.actualizar(this.idItemInventario(), {
          idMedicamento: v.idMedicamento,
          idProveedor: v.idProveedor,
          nombre: v.nombre,
          idUnidadMedida: v.idUnidadMedida!,
          stockMinimo: v.stockMinimo,
          idEstadoItem: v.idEstadoItem,
        });

    peticion.subscribe({
      next: () => this.router.navigate(['/home/farmacia']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
