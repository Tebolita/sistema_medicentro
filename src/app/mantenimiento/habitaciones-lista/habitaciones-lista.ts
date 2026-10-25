import { HistorialCambios } from '../../shared/historial-cambios/historial-cambios';
import { tieneCambios } from '../../shared/bitacora-cambios';
import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { BitacoraItem, HabitacionInput, HabitacionesService, UsuarioOpcion } from '../../service/habitaciones.service';
import { CatalogosService } from '../../service/catalogos.service';
import { TIPOS_HABITACION, ESTADOS_HABITACION } from '../habitaciones-catalogos';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
import { ColumnaCsv, ImportarCsvDialog, ImportarCsvDialogData } from '../../shared/importar-csv/importar-csv-dialog';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-habitaciones-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './habitaciones-lista.html',
  styleUrl: './habitaciones-lista.css',
})
export class HabitacionesLista {
  private habitacionesService = inject(HabitacionesService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private notificaciones = inject(NotificacionesService);

  private catalogos = inject(CatalogosService);
  private confirmacion = inject(ConfirmacionService);
  private dialog = inject(MatDialog);
  private tiposApi = this.catalogos.obtener('TIPO_HABITACION');
  private tipos = computed(() => {
    const api = this.tiposApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_HABITACION;
  });
  private estadosApi = this.catalogos.obtener('ESTADO_HABITACION');
  private estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_HABITACION;
  });

  buscar = signal('');
  errorAccion = signal('');

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.habitacionesService.cargandoEliminadas;
  errorEliminadas = this.habitacionesService.errorEliminadas;

  cargando = computed(() =>
    this.vista() === 'activas' ? this.habitacionesService.cargando() : this.cargandoEliminadas(),
  );
  errorCarga = computed(() =>
    this.vista() === 'activas' ? this.habitacionesService.errorCarga() : this.errorEliminadas(),
  );

  constructor() {
    this.habitacionesService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: Error) => console.error('❌ [HabitacionesLista] Error usuarios:', err.message),
    });
  }

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.habitacionesService.listarEliminadas().length) {
      this.habitacionesService.cargarEliminadas();
    }
  }

  habitaciones = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista =
      this.vista() === 'activas' ? this.habitacionesService.listar() : this.habitacionesService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((r) => r.habitacion.numero.toLowerCase().includes(term));
  });

  tipoLabel(idTipoHabitacion: number | null): string {
    if (!idTipoHabitacion) {
      return 'Sin tipo';
    }
    return this.tipos().find((t) => t.id === idTipoHabitacion)?.label ?? '—';
  }

  estadoLabel(idEstadoHabitacion: number): string {
    return this.estados().find((e) => e.id === idEstadoHabitacion)?.label ?? '—';
  }

  async eliminar(id: number, numero: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Dar de baja la habitación "${numero}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.habitacionesService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  async reactivar(id: number, numero: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Reactivar la habitación "${numero}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.habitacionesService.reactivar(id).subscribe({
      next: () => this.notificaciones.exito('Reactivado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // ============================================================
  // IMPORTAR CSV
  // ============================================================

  private readonly columnasCsv: ColumnaCsv[] = [
    { clave: 'numero', etiqueta: 'Número de habitación', requerido: true, ejemplo: '201' },
    { clave: 'piso', etiqueta: 'Piso (opcional)', requerido: false, ejemplo: '2' },
    { clave: 'tipo', etiqueta: 'Tipo (opcional, ej. Individual, Compartida, UCI)', requerido: false, ejemplo: 'Individual' },
    { clave: 'estado', etiqueta: 'Estado (ej. Disponible, Ocupada)', requerido: true, ejemplo: 'Disponible' },
  ];

  private validarFilaCsv(fila: Record<string, string>): { errores: string[]; datos: HabitacionInput | null } {
    const errores: string[] = [];
    const numero = (fila['numero'] ?? '').trim();
    if (!numero) errores.push('Falta el número de habitación');

    let piso: number | null = null;
    const pisoTexto = (fila['piso'] ?? '').trim();
    if (pisoTexto) {
      piso = Number(pisoTexto);
      if (isNaN(piso)) errores.push('El piso debe ser un número');
    }

    const tipoTexto = (fila['tipo'] ?? '').trim();
    const idTipoHabitacion = tipoTexto ? this.tipos().find((t) => t.label.toLowerCase() === tipoTexto.toLowerCase())?.id ?? null : null;
    if (tipoTexto && idTipoHabitacion === null) errores.push(`El tipo "${tipoTexto}" no existe (revisa Mantenimiento → Catálogos)`);

    const estadoTexto = (fila['estado'] ?? '').trim();
    let idEstadoHabitacion: number | null = null;
    if (!estadoTexto) {
      errores.push('Falta el estado');
    } else {
      idEstadoHabitacion = this.estados().find((e) => e.label.toLowerCase() === estadoTexto.toLowerCase())?.id ?? null;
      if (idEstadoHabitacion === null) errores.push(`El estado "${estadoTexto}" no existe (revisa Mantenimiento → Catálogos)`);
    }

    if (errores.length > 0 || idEstadoHabitacion === null) return { errores, datos: null };

    return { errores: [], datos: { numero, piso, idTipoHabitacion, idEstadoHabitacion } };
  }

  abrirImportarCsv(): void {
    this.dialog
      .open<ImportarCsvDialog<HabitacionInput>, ImportarCsvDialogData<HabitacionInput>>(ImportarCsvDialog, {
        autoFocus: false,
        data: {
          titulo: 'Importar habitaciones desde CSV',
          icono: 'bed',
          nombreEntidadPlural: 'habitaciones',
          nombreArchivoPlantilla: 'plantilla_habitaciones.csv',
          columnas: this.columnasCsv,
          ayuda: 'Las camas de cada habitación se agregan después, desde la pantalla de la habitación. Las columnas "tipo" y "estado" aceptan el nombre tal como aparece en Mantenimiento → Catálogos.',
          validarFila: (fila) => this.validarFilaCsv(fila),
          resumenFila: (datos) => `Habitación ${datos.numero}`,
          crear: (datos) => this.habitacionesService.crear(datos),
        },
      })
      .afterClosed()
      .subscribe((recargar) => {
        if (recargar) this.habitacionesService.cargar();
      });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.habitacionesService.RetornarBitacoraGeneral('habitaciones').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora habitaciones:', err.message);
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
    if (tabla === 'habitaciones') return 'Habitación';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'habitaciones') return 'bed';
    return 'description';
  }

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario #${idUsuario}`;
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
