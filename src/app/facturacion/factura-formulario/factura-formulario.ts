import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FacturaDetalle } from '../../models';
import { FacturaCompleta, FacturaInput, FacturasService } from '../../service/facturas.service';
import { ESTADOS_FACTURA, FORMAS_PAGO, TASA_IVA, TIPOS_ITEM_FACTURA } from '../facturacion-catalogos';
import { CatalogosService } from '../../service/catalogos.service';
import { PolizasDirectorioService } from '../../service/polizas-directorio.service';
import { PacientesService } from '../../pacientes/pacientes.service';
import { ComprobantesService } from '../../service/comprobantes.service';
import { ConveniosService } from '../../service/convenios.service';
import { UsuariosService } from '../../service/usuarios.service';
import { esImagenComprobante as esUrlDeImagen } from '../comprobante-descripcion.util';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

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
  private polizasService = inject(PolizasDirectorioService);
  private comprobantesService = inject(ComprobantesService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  // GET /api/convenios ya existe. Si por alguna razón no hay convenios
  // sembrados todavía, se cae al campo numérico de respaldo para el id.
  private conveniosService = inject(ConveniosService);
  convenios = this.conveniosService.listar;
  hayConvenios = computed(() => this.convenios().length > 0);

  pacientes = this.pacientesService.directorio;
  polizas = this.polizasService.listar;

  // ESTADO_FACTURA es el código real que ya usa el backend (resuelve
  // "PAGADA" al aprobar un pago). Los demás todavía no están confirmados
  // con el backend: se intentan igual y, si no existen en la base, se cae
  // a la lista de ejemplo.
  private catalogos = inject(CatalogosService);
  private tiposItemApi = this.catalogos.obtener('TIPO_ITEM_FACTURA');
  tiposItem = computed(() => {
    const api = this.tiposItemApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_ITEM_FACTURA;
  });
  private estadosFacturaApi = this.catalogos.obtener('ESTADO_FACTURA');
  estadosFactura = computed(() => {
    const api = this.estadosFacturaApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_FACTURA;
  });
  private formasPagoApi = this.catalogos.obtener('FORMA_PAGO');
  formasPago = computed(() => {
    const api = this.formasPagoApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : FORMAS_PAGO;
  });

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
    // Campos opcionales de certificación FEL y convenio corporativo: el
    // esquema ya los tiene (numero_autorizacion_fel, fecha_certificacion_fel,
    // id_convenio) pero antes el formulario nunca los mostraba, así que
    // siempre se guardaban vacíos.
    numeroAutorizacionFel: [''],
    fechaCertificacionFel: [''], // input type="date" (yyyy-MM-dd)
    idConvenio: this.fb.control<number | null>(null),
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

  guardando = signal(false);
  errorMsg = signal('');
  errorPago = signal('');

  // Comprobante de pago (foto de recibo/voucher, opcional). El archivo NO se
  // sube al elegirlo: se guarda localmente (vista previa con un blob: URL) y
  // solo se sube al servidor Node (server.ts, no al backend .NET) cuando se
  // confirma "Guardar factura" — así, si cancelas o nunca guardas, no queda
  // un archivo huérfano en el servidor que no corresponde a ningún dato
  // persistido. La URL final se guarda en la columna comprobante_url.
  private comprobanteUrlGuardado = signal<string | null>(null); // persistido (o encontrado por respaldo) al cargar
  private archivoPendiente = signal<File | null>(null); // elegido, todavía sin subir
  private previewUrlLocal = signal<string | null>(null); // blob: URL del archivo pendiente, para la vista previa
  private comprobanteEliminado = signal(false); // se pidió quitar el comprobante existente

  comprobanteUrl = computed(() =>
    this.previewUrlLocal() ?? (this.comprobanteEliminado() ? null : this.comprobanteUrlGuardado()),
  );
  subiendoComprobante = signal(false);
  errorComprobante = signal('');

  constructor() {
    this.cabecera.controls.descuento.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.descuentoHeader.set(v));

    this.detalles.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.recalcularSubtotal());

    // Angular reutiliza esta misma instancia del componente al navegar entre
    // dos facturas distintas sin salir de esta ruta (p. ej. desde las
    // alertas del header, que llevan de una factura a otra con
    // [routerLink]="['/home/facturacion', idFactura]"): leer el id solo del
    // snapshot (como estaba antes) hacía que el formulario se quedara
    // mostrando la factura vieja. Suscribirse a paramMap sí reacciona cuando
    // cambia.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const idParam = params.get('id');
      this.resetFormulario();
      if (idParam && idParam !== 'nueva') {
        // Edición: se trae la factura (con sus pagos) del backend; sirve
        // también al recargar la página.
        this.facturasService.obtenerPorId(Number(idParam)).subscribe({
          next: (registro) => this.cargar(registro),
          error: (err: Error) => this.errorMsg.set(err.message),
        });
        return;
      }

      this.esDigefact.set(this.route.snapshot.queryParamMap.get('tipo') === 'digefact');
      this.agregarDetalle();
    });
  }

  // Deja el formulario como recién creado antes de cargar una factura
  // distinta (o una nueva): si no se limpia, lo de la factura anterior se
  // queda mezclado con lo nuevo (líneas de detalle duplicadas, comprobante
  // de la otra factura, etc.).
  private resetFormulario(): void {
    this.idFactura.set(0);
    this.registro.set(undefined);
    this.esDigefact.set(false);
    this.cabecera.reset({
      idPaciente: null,
      idPoliza: null,
      descuento: 0,
      idEstadoFactura: 1,
      numeroAutorizacionFel: '',
      fechaCertificacionFel: '',
      idConvenio: null,
    });
    while (this.detalles.length) {
      this.detalles.removeAt(0);
    }
    this.descuentoHeader.set(0);
    this.comprobanteUrlGuardado.set(null);
    this.liberarPreviewLocal();
    this.archivoPendiente.set(null);
    this.comprobanteEliminado.set(false);
    this.errorComprobante.set('');
    this.errorMsg.set('');
    this.errorPago.set('');
    this.pagoForm.reset({ monto: 0, idFormaPago: null, referenciaPago: '' });
  }

  private crearDetalleGroup(d?: FacturaDetalle) {
    return this.fb.nonNullable.group({
      id: d?.idFacturaDetalle ?? 0,
      idTipoItem: this.fb.control<number | null>(d?.idTipoItem ?? 1, Validators.required),
      descripcion: [d?.descripcion ?? '', [Validators.required, Validators.maxLength(200)]],
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
      numeroAutorizacionFel: registro.factura.numeroAutorizacionFel ?? '',
      fechaCertificacionFel: registro.factura.fechaCertificacionFel?.slice(0, 10) ?? '',
      idConvenio: registro.factura.idConvenio,
    });
    this.descuentoHeader.set(registro.factura.descuento);
    registro.detalles.forEach((d) => this.detalles.push(this.crearDetalleGroup(d)));

    // La URL del comprobante viaja en la factura (columna comprobante_url);
    // solo se busca por nombre de archivo en el servidor Node como respaldo
    // para facturas de antes de que existiera esa columna.
    if (registro.factura.comprobanteUrl) {
      this.comprobanteUrlGuardado.set(registro.factura.comprobanteUrl);
    } else {
      this.comprobantesService
        .buscar(registro.factura.idFactura)
        .subscribe((url) => this.comprobanteUrlGuardado.set(url));
    }

    this.pagoForm.patchValue({ monto: this.saldoPendiente() });
  }

  private readonly EXTENSIONES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
  private readonly TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024;

  // El archivo elegido NO se sube todavía: solo se guarda localmente (con
  // una vista previa via blob: URL) hasta que se confirme "Guardar factura"
  // (ver guardar()). Así nunca queda un archivo sin asociar en el servidor
  // si el usuario cancela o nunca llega a guardar.
  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo después
    if (!archivo) {
      return;
    }
    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    if (!this.EXTENSIONES_PERMITIDAS.includes(extension)) {
      this.errorComprobante.set('Solo se aceptan imágenes (JPG, PNG, WEBP) o PDF.');
      return;
    }
    if (archivo.size > this.TAMANO_MAXIMO_BYTES) {
      this.errorComprobante.set('El archivo no puede pesar más de 8 MB.');
      return;
    }

    this.errorComprobante.set('');
    this.comprobanteEliminado.set(false);
    this.liberarPreviewLocal();
    this.archivoPendiente.set(archivo);
    this.previewUrlLocal.set(URL.createObjectURL(archivo));
  }

  quitarComprobante(): void {
    const habiaComprobanteGuardado = !this.archivoPendiente() && !!this.comprobanteUrlGuardado();
    this.liberarPreviewLocal();
    this.archivoPendiente.set(null);
    this.comprobanteEliminado.set(true);

    if (habiaComprobanteGuardado) {
      // Se borra de una vez del servidor (no se espera a "Guardar factura"):
      // si no, el archivo se queda huérfano y la búsqueda de respaldo
      // (buscar() en cargar()) lo sigue encontrando aunque comprobante_url
      // ya esté en NULL. Best effort: si falla, igual queda marcado como
      // quitado localmente y comprobante_url se limpia al guardar.
      this.comprobantesService.eliminar(this.idFactura()).subscribe({
        next: () => this.comprobanteUrlGuardado.set(null),
        error: () => {},
      });
    }
  }

  private liberarPreviewLocal(): void {
    const actual = this.previewUrlLocal();
    if (actual) {
      URL.revokeObjectURL(actual);
    }
    this.previewUrlLocal.set(null);
  }

  esImagenComprobante(): boolean {
    const archivo = this.archivoPendiente();
    if (archivo) {
      return archivo.type.startsWith('image/');
    }
    const url = this.comprobanteUrl();
    return url ? esUrlDeImagen(url) : false;
  }

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.directorio().find((pac) => pac.idPaciente === idPaciente);
    return p ? [p.primerNombre, p.primerApellido].filter(Boolean).join(' ') : '—';
  }

  formaPagoLabel(idFormaPago: number): string {
    return this.formasPago().find((f) => f.id === idFormaPago)?.label ?? '—';
  }

  // Igual que en Medicamentos/Inventario: el backend tiene el campo pero
  // todavía no lo llena (ver SOLICITUD_ENDPOINTS_ELIMINADOS.md punto 5), así
  // que esto muestra "—" hasta que eso se arregle del lado del backend.
  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
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

    this.guardando.set(true);
    this.errorMsg.set('');
    this.errorComprobante.set('');

    // El archivo (si se eligió uno nuevo) recién se sube acá, al confirmar
    // guardar — ver onArchivoSeleccionado(). Con id conocido (edición) el
    // servidor ya lo nombra "factura-<id>.<ext>" de una vez; en una factura
    // nueva (sin id todavía) le pone un nombre al azar que se renombra más
    // abajo una vez el backend asigna el id real.
    const idParaNombre = this.esNueva() ? undefined : this.idFactura();
    this.resolverComprobanteUrl(idParaNombre).subscribe({
      next: (comprobanteUrl) => this.guardarFactura(comprobanteUrl),
      error: (err: Error) => {
        this.errorComprobante.set(err.message);
        this.guardando.set(false);
      },
    });
  }

  private resolverComprobanteUrl(idParaNombre: number | undefined): Observable<string | null> {
    const archivo = this.archivoPendiente();
    if (!archivo) {
      return of(this.comprobanteEliminado() ? null : this.comprobanteUrlGuardado());
    }
    this.subiendoComprobante.set(true);
    return this.comprobantesService
      .subir(archivo, idParaNombre)
      .pipe(finalize(() => this.subiendoComprobante.set(false)));
  }

  private guardarFactura(comprobanteUrl: string | null): void {
    const cab = this.cabecera.getRawValue();
    const original = this.registro()?.factura;

    // Serie, número de documento y totales los asigna/calcula el backend.
    // El número de autorización FEL solo se conserva si la factura ya lo
    // tenía: la certificación real no se genera desde el cliente.
    const factura: FacturaInput = {
      idPaciente: cab.idPaciente!,
      idTipoDocumentoFiscal: original?.idTipoDocumentoFiscal ?? 1,
      serie: original?.serie ?? null,
      fechaEmision: original?.fechaEmision ?? new Date().toISOString(),
      descuento: cab.descuento,
      idEstadoFactura: cab.idEstadoFactura,
      numeroAutorizacionFel: cab.numeroAutorizacionFel.trim() || null,
      fechaCertificacionFel: cab.fechaCertificacionFel ? new Date(cab.fechaCertificacionFel).toISOString() : null,
      idConvenio: cab.idConvenio,
      // Solo las facturas Digefact (copago de seguro) van ligadas a una póliza.
      idPoliza: this.esDigefact() ? cab.idPoliza : null,
      comprobanteUrl,
      // idFacturaDetalle 0 = línea nueva; el backend da de baja las que no vengan.
      detalles: this.detalles.getRawValue().map((d) => ({
        idFacturaDetalle: d.id,
        idTipoItem: d.idTipoItem!,
        idCita: null,
        idTratamiento: null,
        idMedicamento: null,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        descuento: d.descuento,
      })),
    };

    const esNuevaConComprobante = this.esNueva() && !!comprobanteUrl;
    const peticion = this.esNueva()
      ? this.facturasService.crear(factura)
      : this.facturasService.actualizar(this.idFactura(), factura);
    peticion.subscribe({
      next: (guardada) => {
        this.guardando.set(false);
        this.notificaciones.exito('Factura guardada correctamente');
        if (esNuevaConComprobante) {
          // El archivo se subió con nombre al azar (factura todavía sin id);
          // ahora que ya existe el id real, se renombra a "factura-<id>.ext"
          // para que quede con el mismo formato estable que usan las
          // ediciones. La URL cambia con el renombrado, así que hay que
          // volver a guardar la factura con la URL final; todo esto es "best
          // effort": si falla, la factura ya se guardó bien y el comprobante
          // solo quedaría con la URL temporal.
          const nombreTemporal = this.comprobantesService.nombreDesdeUrl(comprobanteUrl!);
          this.comprobantesService.confirmar(nombreTemporal, guardada.factura.idFactura).subscribe({
            next: (urlFinal) => {
              // Importante: reenviar los detalles con los id reales que
              // acaba de devolver el backend, NO los de `factura` (que
              // llevan idFacturaDetalle 0 por ser recién creados) — si no,
              // EditarAsync los interpreta como líneas nuevas, da de baja
              // las que sí existen y crea duplicados.
              this.facturasService
                .actualizar(guardada.factura.idFactura, {
                  ...factura,
                  comprobanteUrl: urlFinal,
                  detalles: guardada.detalles.map((d) => ({
                    idFacturaDetalle: d.idFacturaDetalle,
                    idTipoItem: d.idTipoItem,
                    idCita: d.idCita,
                    idTratamiento: d.idTratamiento,
                    idMedicamento: d.idMedicamento,
                    descripcion: d.descripcion,
                    cantidad: d.cantidad,
                    precioUnitario: d.precioUnitario,
                    descuento: d.descuento,
                  })),
                })
                .subscribe({ error: () => {} });
            },
            error: () => {},
          });
        }
        this.router.navigate(['/home/facturacion', guardada.factura.idFactura]);
      },
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }

  registrarPago(): void {
    this.pagoForm.markAllAsTouched();
    if (this.pagoForm.invalid || this.esNueva()) {
      return;
    }
    const v = this.pagoForm.getRawValue();
    this.errorPago.set('');
    this.facturasService
      .registrarPago(this.idFactura(), {
        idFormaPago: v.idFormaPago!,
        idEstadoPago: this.facturasService.idEstadoPagoAplicado(),
        monto: v.monto,
        referenciaPago: v.referenciaPago || null,
        observaciones: null,
      })
      .subscribe({
        next: () => {
          // El servicio ya refrescó la factura (p. ej. pasa a "pagada").
          const actualizada = this.facturasService.obtener(this.idFactura());
          if (actualizada) {
            this.registro.set(actualizada);
            this.cabecera.patchValue({ idEstadoFactura: actualizada.factura.idEstadoFactura });
          }
          this.pagoForm.reset({ monto: this.saldoPendiente(), idFormaPago: null, referenciaPago: '' });
          this.notificaciones.exito('Pago registrado correctamente');
        },
        error: (err: Error) => this.errorPago.set(err.message),
      });
  }
}
