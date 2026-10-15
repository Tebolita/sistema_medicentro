import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, FacturasService } from '../../service/facturas.service';
import { ESTADOS_FACTURA } from '../facturacion-catalogos';
import { PacientesService } from '../../service/pacientes.service';
import { MENU_SECTIONS } from '../../shared/menu-data';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-facturas-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './facturas-lista.html',
  styleUrl: './facturas-lista.css',
})
export class FacturasLista {
  private facturasService = inject(FacturasService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);
  private catalogos = inject(CatalogosService);
  private usuariosService = inject(UsuariosService);
  private estadosFacturaApi = this.catalogos.obtener('ESTADO_FACTURA');
  private notificaciones = inject(NotificacionesService);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  opcionesFacturacion = MENU_SECTIONS.find((s) => s.slug === 'facturacion-cobros')?.items ?? [];

  errorAccion = signal('');

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.facturasService.cargandoEliminadas;
  errorEliminadas = this.facturasService.errorEliminadas;

  cargando = computed(() => (this.vista() === 'activas' ? this.facturasService.cargando() : this.cargandoEliminadas()));
  errorCarga = computed(() => (this.vista() === 'activas' ? this.facturasService.errorCarga() : this.errorEliminadas()));

  // ============================================================
  // Historial general de Facturas
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => this.facturasService.cargar());

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });
  }

  facturas = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activas' ? this.facturasService.listar() : this.facturasService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((r) =>
      [this.nombrePaciente(r.factura.idPaciente), r.factura.numeroDocumento]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    // Se pide la primera vez que se entra a la pestaña, no en cada clic.
    if (!this.facturasService.listarEliminadas().length) {
      this.facturasService.cargarEliminadas();
    }
  }

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.directorio().find((pac) => pac.idPaciente === idPaciente);
    if (!p) {
      return 'Paciente no encontrado';
    }
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
  }

  iniciales(idPaciente: number): string {
    const partes = this.nombrePaciente(idPaciente).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  estadoLabel(idEstadoFactura: number): string {
    const api = this.estadosFacturaApi();
    const lista = api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_FACTURA;
    return lista.find((e) => e.id === idEstadoFactura)?.label ?? '—';
  }

  estadoClase(idEstadoFactura: number): string {
    if (idEstadoFactura === (this.catalogos.idPorCodigo('ESTADO_FACTURA', 'PAGADA') ?? 2)) return 'estado-pagada';
    if (idEstadoFactura === (this.catalogos.idPorCodigo('ESTADO_FACTURA', 'ANULADA') ?? 3)) return 'estado-anulada';
    return 'estado-emitida';
  }

  esDigefact(idPoliza: number | null): boolean {
    return idPoliza != null;
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  formatMonto(monto: number): string {
    return `Q${monto.toFixed(2)}`;
  }

  // Igual que en medicamentos/inventario: el backend todavía no llena
  // "idUsuarioCreacion"/"idUsuarioModificacion" con el usuario real (ver
  // SOLICITUD_ENDPOINTS_ELIMINADOS.md punto 5), así que esto muestra "—"
  // hasta que eso se arregle del lado del backend.
  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Anular la factura de "${paciente}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.facturasService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, paciente: string): void {
    if (!confirm(`¿Reactivar la factura de "${paciente}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.facturasService.reactivar(id).subscribe({
      next: () => this.notificaciones.exito('Reactivado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.facturasService.RetornarBitacoraGeneral('facturas').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora facturas:', err);
        this.cargandoHistorial.set(false);
        this.notificaciones.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorialGeneral(): void {
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

  tablaLabel(tabla: string): string {
    if (tabla === 'facturas') return 'Factura';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'facturas') return 'receipt_long';
    return 'description';
  }

  formatFechaHoraUTC(iso: string): string {
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
}
