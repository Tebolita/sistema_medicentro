import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Factura, FacturaDetalle } from '../../models';
import { FacturaCompleta, FacturasService } from '../facturas.service';
import { ESTADOS_FACTURA, FORMAS_PAGO, TASA_IVA, TIPOS_ITEM_FACTURA } from '../facturacion-catalogos';
import { PolizasService } from '../../polizas/polizas.service';
import { PacientesService } from '../../pacientes/pacientes.service';

@Component({
  selector: 'app-factura-formulario',
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
  templateUrl: './factura-formulario.html',
  styleUrl: './factura-formulario.css',
})
export class FacturaFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  facturasService = inject(FacturasService);
  private pacientesService = inject(PacientesService);
  private polizasService = inject(PolizasService);

  pacientes = this.pacientesService.listar;
  polizas = this.polizasService.listar;
  tiposItem = TIPOS_ITEM_FACTURA;
  estadosFactura = ESTADOS_FACTURA;
  formasPago = FORMAS_PAGO;

  idFactura = signal(0);
  esNueva = computed(() => this.idFactura() === 0);
  registro = signal<FacturaCompleta | undefined>(undefined);

  // "Facturación Digefact (copago seguro)" del menú preselecciona el modo
  // con póliza; "Facturación SAT" es una factura directa sin póliza. No hay
  // columna de "certificador FEL" en el esquema — la distinción real es si
  // la factura está o no ligada a una póliza (copago de seguro).
  esDigefact = signal(false);

  cabecera = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idPoliza: this.fb.control<number | null>(null),
    descuento: [0, [Validators.required, Validators.min(0)]],
    idEstadoFactura: [1, Validators.required],
  });

  detalles = this.fb.array<ReturnType<typeof this.crearDetalleGroup>>([]);

  pagoForm = this.fb.nonNullable.group({
    monto: [0, [Validators.required, Validators.min(0.01)]],
    idFormaPago: this.fb.control<number | null>(null, Validators.required),
    referenciaPago: [''],
  });

  // El total tiene que reaccionar mientras se escribe en las líneas de
  // detalle. Un `computed()` no sirve directamente acá: no rastrea cambios
  // de un FormArray (no son signals), así que se recalcula a mano en cada
  // valueChanges y se guarda en una signal real.
  private subtotalSignal = signal(0);
  subtotal = computed(() => this.subtotalSignal());

  private recalcularSubtotal(): void {
    const total = this.detalles.controls.reduce((sum, g) => {
      const v = g.getRawValue();
      return sum + Math.max(0, v.cantidad * v.precioUnitario - v.descuento);
    }, 0);
    this.subtotalSignal.set(total);
  }

  descuentoHeader = signal(0);
  impuesto = computed(() => Math.round((this.subtotal() - this.descuentoHeader()) * TASA_IVA * 100) / 100);
  total = computed(() => Math.round((this.subtotal() - this.descuentoHeader() + this.impuesto()) * 100) / 100);

  totalPagado = computed(() => (this.esNueva() ? 0 : this.facturasService.totalPagado(this.idFactura())));
  saldoPendiente = computed(() => Math.max(0, this.total() - this.totalPagado()));

  constructor() {
    this.cabecera.controls.descuento.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.descuentoHeader.set(v));

    this.detalles.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.recalcularSubtotal());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      const id = Number(idParam);
      const registro = this.facturasService.obtener(id);
      if (registro) {
        this.cargar(registro);
        return;
      }
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.esDigefact.set(params.get('tipo') === 'digefact');
    });

    this.agregarDetalle();
  }

  private crearDetalleGroup(d?: FacturaDetalle) {
    return this.fb.nonNullable.group({
      id: d?.idFacturaDetalle ?? 0,
      idTipoItem: this.fb.control<number | null>(d?.idTipoItem ?? 1, Validators.required),
      descripcion: [d?.descripcion ?? '', Validators.required],
      cantidad: [d?.cantidad ?? 1, [Validators.required, Validators.min(1)]],
      precioUnitario: [d?.precioUnitario ?? 0, [Validators.required, Validators.min(0)]],
      descuento: [d?.descuento ?? 0, [Validators.required, Validators.min(0)]],
    });
  }

  agregarDetalle(): void {
    this.detalles.push(this.crearDetalleGroup());
  }

  quitarDetalle(index: number): void {
    this.detalles.removeAt(index);
  }

  private cargar(registro: FacturaCompleta): void {
    this.idFactura.set(registro.factura.idFactura);
    this.registro.set(registro);
    this.esDigefact.set(registro.factura.idPoliza != null);
    this.cabecera.patchValue({
      idPaciente: registro.factura.idPaciente,
      idPoliza: registro.factura.idPoliza,
      descuento: registro.factura.descuento,
      idEstadoFactura: registro.factura.idEstadoFactura,
    });
    this.descuentoHeader.set(registro.factura.descuento);
    registro.detalles.forEach((d) => this.detalles.push(this.crearDetalleGroup(d)));
    this.pagoForm.patchValue({ monto: this.saldoPendiente() });
  }

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.listar().find((pac) => pac.idPaciente === idPaciente);
    return p ? [p.primerNombre, p.primerApellido].filter(Boolean).join(' ') : '—';
  }

  formaPagoLabel(idFormaPago: number): string {
    return FORMAS_PAGO.find((f) => f.id === idFormaPago)?.label ?? '—';
  }

  formatMonto(monto: number): string {
    return `Q${monto.toFixed(2)}`;
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  guardar(): void {
    this.cabecera.markAllAsTouched();
    this.detalles.markAllAsTouched();
    if (this.cabecera.invalid || this.detalles.invalid || this.detalles.length === 0) {
      return;
    }

    const cab = this.cabecera.getRawValue();
    const idFactura = this.idFactura();
    const numeroDocumento = this.esNueva()
      ? `FAC-${String(idFactura || Date.now()).slice(-4).padStart(4, '0')}`
      : (this.facturasService.obtener(idFactura)?.factura.numeroDocumento ?? '');

    const factura: Factura = {
      idFactura,
      idPaciente: cab.idPaciente!,
      idTipoDocumentoFiscal: 1,
      serie: 'A',
      numeroDocumento,
      fechaEmision: this.esNueva()
        ? new Date().toISOString()
        : (this.facturasService.obtener(idFactura)?.factura.fechaEmision ?? new Date().toISOString()),
      subtotal: this.subtotal(),
      descuento: cab.descuento,
      impuesto: this.impuesto(),
      total: this.total(),
      idEstadoFactura: cab.idEstadoFactura,
      numeroAutorizacionFel: this.esNueva()
        ? `FEL-${Math.floor(10000 + Math.random() * 89999)}-${this.esDigefact() ? 'DIGEFACT' : 'SAT'}`
        : (this.facturasService.obtener(idFactura)?.factura.numeroAutorizacionFel ?? null),
      fechaCertificacionFel: this.esNueva()
        ? new Date().toISOString()
        : (this.facturasService.obtener(idFactura)?.factura.fechaCertificacionFel ?? null),
      idConvenio: null,
      idPoliza: cab.idPoliza,
      activo: true,
      fechaCreacion: this.esNueva()
        ? new Date().toISOString()
        : (this.facturasService.obtener(idFactura)?.factura.fechaCreacion ?? new Date().toISOString()),
      fechaModificacion: this.esNueva() ? null : new Date().toISOString(),
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    };

    const registro: FacturaCompleta = {
      factura,
      detalles: this.detalles.getRawValue().map((d) => ({
        idFacturaDetalle: d.id,
        idFactura,
        idTipoItem: d.idTipoItem!,
        idCita: null,
        idTratamiento: null,
        idMedicamento: null,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        descuento: d.descuento,
        subtotal: Math.max(0, d.cantidad * d.precioUnitario - d.descuento),
        activo: true,
        fechaCreacion: new Date().toISOString(),
      })),
    };

    const id = this.facturasService.guardar(registro);
    this.router.navigate(['/home/facturacion', id]);
  }

  registrarPago(): void {
    this.pagoForm.markAllAsTouched();
    if (this.pagoForm.invalid || this.esNueva()) {
      return;
    }
    const v = this.pagoForm.getRawValue();
    this.facturasService.registrarPago({
      idFactura: this.idFactura(),
      fechaPago: new Date().toISOString(),
      monto: v.monto,
      idFormaPago: v.idFormaPago!,
      idEstadoPago: 1,
      referenciaPago: v.referenciaPago || null,
      observaciones: null,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    });
    this.pagoForm.reset({ monto: 0, idFormaPago: null, referenciaPago: '' });
  }
}
