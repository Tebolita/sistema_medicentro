import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, RecetaCompleta, RecetasService } from '../../service/recetas.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { ESTADOS_RECETA } from '../farmacia-catalogos';
import { MedicosService } from '../../service/medicos.service';
import { PacientesService } from '../../service/pacientes.service';
import { UsuariosService } from '../../service/usuarios.service';
import { CatalogosService } from '../../service/catalogos.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

@Component({
  selector: 'app-recetas-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './recetas-lista.html',
  styleUrl: './recetas-lista.css',
})
export class RecetasLista {
  private recetasService = inject(RecetasService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private medicamentosService = inject(MedicamentosService);
  private pacientesService = inject(PacientesService);
  private medicosService = inject(MedicosService);
  private route = inject(ActivatedRoute);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private catalogos = inject(CatalogosService);
  private confirmacion = inject(ConfirmacionService);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  cargando = this.recetasService.cargando;
  errorCarga = this.recetasService.errorCarga;
  errorAccion = signal('');

  // ============================================================
  // Historial general de Recetas
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    afterNextRender(() => {
      this.recetasService.cargar();
      this.medicamentosService.cargar();
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });
  }

  recetas = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.recetasService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((r) =>
      [this.nombrePaciente(r.receta.idPaciente), this.medicamentosTexto(r)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

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

  medicoLabel(idMedico: number): string {
    return this.medicosService.nombreDe(idMedico);
  }

  medicamentosTexto(r: RecetaCompleta): string {
    return r.detalles
      .map((d) => this.medicamentosService.nombreDe(d.idMedicamento) ?? d.nombreMedicamentoExterno)
      .filter(Boolean)
      .join(', ');
  }

  // ESTADO_RECETA real si el catálogo existe en la base (id_valor_catalogo
  // cambia en cada base de datos: en esta, Surtida/Cancelada son 102/103,
  // no 2/3); si el catálogo no cargó, cae a la lista de ejemplo.
  private estadosRecetaApi = this.catalogos.obtener('ESTADO_RECETA');

  estadoLabel(idEstadoReceta: number): string {
    const api = this.estadosRecetaApi();
    if (api.length) {
      return api.find((e) => e.id === idEstadoReceta)?.nombre ?? '—';
    }
    return ESTADOS_RECETA.find((e) => e.id === idEstadoReceta)?.label ?? '—';
  }

  estadoClase(idEstadoReceta: number): string {
    const codigo = this.catalogos.codigoPorId('ESTADO_RECETA', idEstadoReceta);
    if (codigo === 'SURTIDA') return 'estado-surtida';
    if (codigo === 'CANCELADA') return 'estado-cancelada';
    if (codigo === 'EMITIDA') return 'estado-emitida';
    // Catálogo todavía sin cargar: usa los ids de ejemplo como último recurso.
    if (idEstadoReceta === 2) return 'estado-surtida';
    if (idEstadoReceta === 3) return 'estado-cancelada';
    return 'estado-emitida';
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async eliminar(id: number, paciente: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Eliminar la receta de "${paciente}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.recetasService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.recetasService.RetornarBitacoraGeneral('recetas').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora recetas:', err.status);
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
    if (tabla === 'recetas') return 'Receta';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'recetas') return 'receipt_long';
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
