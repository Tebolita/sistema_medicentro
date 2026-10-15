import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ItemInventario } from '../../models';
import { BitacoraItem, InventarioFarmaciaService } from '../../service/inventario-farmacia.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { ESTADOS_ITEM_INVENTARIO, UNIDADES_MEDIDA } from '../farmacia-catalogos';
import { CatalogosService } from '../../service/catalogos.service';
import { ProveedoresService } from '../../service/proveedores.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

@Component({
  selector: 'app-item-formulario',
  imports: [
    NgClass,
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
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventarioService = inject(InventarioFarmaciaService);
  private notificaciones = inject(NotificacionesService);

  private medicamentosService = inject(MedicamentosService);
  medicamentos = this.medicamentosService.listar;
  // GET /api/proveedores ya existe (ProveedoresController).
  private proveedoresService = inject(ProveedoresService);
  proveedores = this.proveedoresService.listar;
  private usuariosService = inject(UsuariosService);
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
  registro = signal<ItemInventario | undefined>(undefined);

  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);

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
    this.registro.set(item);
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
      next: () => {
        this.notificaciones.exito(this.esNuevo() ? 'Creado correctamente' : 'Actualizado correctamente');
        this.router.navigate(['/home/farmacia']);
      },
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }

  // Igual que en la lista: el backend tiene el campo pero todavía no lo
  // llena (ver SOLICITUD_ENDPOINTS_ELIMINADOS.md punto 5), así que esto
  // muestra "—" hasta que eso se arregle del lado del backend.
  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idItemInventario();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.inventarioService.RetornarBitacoraPorRegistro('items_inventario', id).subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al cargar bitácora:', err.status);
        this.cargandoHistorial.set(false);
        this.notificaciones.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorial(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  accionLabel(idTipoAccion: number): string {
    return this.accionAuditoria.label(idTipoAccion);
  }

  accionClase(idTipoAccion: number): string {
    return this.accionAuditoria.clase(idTipoAccion);
  }

  accionIcono(idTipoAccion: number): string {
    return this.accionAuditoria.icono(idTipoAccion);
  }

  formatFechaHora(iso: string): string {
    if (!iso) return '—';
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';
    const fecha = new Date(isoConZona);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  camposCambiados(item: BitacoraItem): Array<{ campo: string; antes: string; despues: string }> {
    try {
      const antes = item.valoresAnteriores ? JSON.parse(item.valoresAnteriores) : {};
      const despues = item.valoresNuevos ? JSON.parse(item.valoresNuevos) : {};

      const camposIgnorados = new Set([
        'IdUsuarioModificacion',
        'FechaModificacion',
        'IdUsuarioCreacion',
      ]);

      const idRegistroReal = this.idItemInventario();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdItemInventario' && idRegistroReal != null) {
          a = idRegistroReal;
          d = idRegistroReal;
        }

        if (JSON.stringify(a) === JSON.stringify(d)) continue;

        cambios.push({
          campo: this.formatearNombreCampo(k),
          antes: this.formatearValor(a, k),
          despues: this.formatearValor(d, k),
        });
      }

      cambios.sort((x, y) => {
        if (x.campo.toLowerCase().includes('id item inventario')) return -1;
        if (y.campo.toLowerCase().includes('id item inventario')) return 1;
        return x.campo.localeCompare(y.campo);
      });

      return cambios;
    } catch {
      return [];
    }
  }

  private formatearNombreCampo(campo: string): string {
    return campo
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  private formatearValor(valor: any, nombreCampo: string = ''): string {
    if (valor === null || valor === undefined) return '—';

    if (this.esCampoFecha(nombreCampo) && typeof valor === 'string') {
      const fecha = new Date(valor);
      if (!isNaN(fecha.getTime())) {
        return fecha.toLocaleString('es-GT', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  }

  private esCampoFecha(nombreCampo: string): boolean {
    return /fecha|fechahora|creacion|modificacion/i.test(nombreCampo);
  }
}
