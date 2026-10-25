import { HistorialCambios } from '../../shared/historial-cambios/historial-cambios';
import { tieneCambios } from '../../shared/bitacora-cambios';
import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { BitacoraItem, InteraccionInput, InteraccionesService } from '../../service/interacciones.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
import { ColumnaCsv, ImportarCsvDialog, ImportarCsvDialogData } from '../../shared/importar-csv/importar-csv-dialog';

type Vista = 'activas' | 'eliminadas';

// Mismos códigos/ids de ejemplo que ya usa Pacientes para 'SEVERIDAD'
// (pacientes-catalogos.ts) — mientras ese catálogo no esté sembrado.
const SEVERIDADES_EJEMPLO = [
  { id: 1, label: 'Leve' },
  { id: 2, label: 'Moderada' },
  { id: 3, label: 'Severa' },
];

@Component({
  selector: 'app-interacciones-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './interacciones-lista.html',
  styleUrl: './interacciones-lista.css',
})
export class InteraccionesLista {
  private interaccionesService = inject(InteraccionesService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private medicamentosService = inject(MedicamentosService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  private catalogos = inject(CatalogosService);
  private confirmacion = inject(ConfirmacionService);
  private dialog = inject(MatDialog);
  private severidadApi = this.catalogos.obtener('SEVERIDAD');
  private severidades = computed(() => {
    const api = this.severidadApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : SEVERIDADES_EJEMPLO;
  });

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.interaccionesService.cargandoEliminadas;
  errorEliminadas = this.interaccionesService.errorEliminadas;

  cargando = computed(() => (this.vista() === 'activas' ? this.interaccionesService.cargando() : this.cargandoEliminadas()));
  errorCarga = computed(() => (this.vista() === 'activas' ? this.interaccionesService.errorCarga() : this.errorEliminadas()));

  // ============================================================
  // Historial general de Interacciones
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    afterNextRender(() => this.medicamentosService.cargar());
  }

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.interaccionesService.listarEliminadas().length) {
      this.interaccionesService.cargarEliminadas();
    }
  }

  medicamentoNombre(id: number): string {
    return this.medicamentosService.obtener(id)?.nombre ?? `Medicamento #${id}`;
  }

  severidadLabel(id: number): string {
    return this.severidades().find((s) => s.id === id)?.label ?? '—';
  }

  interacciones = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activas' ? this.interaccionesService.listar() : this.interaccionesService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((i) =>
      [this.medicamentoNombre(i.idMedicamento1), this.medicamentoNombre(i.idMedicamento2), i.descripcion]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  async eliminar(id: number, etiqueta: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Dar de baja la interacción "${etiqueta}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.interaccionesService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  async reactivar(id: number, etiqueta: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Reactivar la interacción "${etiqueta}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.interaccionesService.reactivar(id).subscribe({
      next: () => this.notificaciones.exito('Reactivado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  usuarioLabel(id: number | null): string {
    if (!id) return '—';
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  // ============================================================
  // IMPORTAR CSV
  // ============================================================

  private readonly columnasCsv: ColumnaCsv[] = [
    { clave: 'medicamento_1', etiqueta: 'Nombre exacto del primer medicamento', requerido: true, ejemplo: 'Paracetamol 500mg' },
    { clave: 'medicamento_2', etiqueta: 'Nombre exacto del segundo medicamento', requerido: true, ejemplo: 'Ibuprofeno 400mg' },
    { clave: 'severidad', etiqueta: 'Severidad (Leve, Moderada, Severa)', requerido: true, ejemplo: 'Moderada' },
    { clave: 'descripcion', etiqueta: 'Descripción de la interacción', requerido: true, ejemplo: 'Puede aumentar el riesgo de sangrado' },
  ];

  private buscarMedicamento(nombre: string): number | null {
    return this.medicamentosService.listar().find((m) => m.nombre.toLowerCase() === nombre.toLowerCase())?.idMedicamento ?? null;
  }

  private validarFilaCsv(fila: Record<string, string>): { errores: string[]; datos: InteraccionInput | null } {
    const errores: string[] = [];

    const nombre1 = (fila['medicamento_1'] ?? '').trim();
    const idMedicamento1 = nombre1 ? this.buscarMedicamento(nombre1) : null;
    if (!nombre1) errores.push('Falta el primer medicamento');
    else if (idMedicamento1 === null) errores.push(`No existe un medicamento llamado "${nombre1}"`);

    const nombre2 = (fila['medicamento_2'] ?? '').trim();
    const idMedicamento2 = nombre2 ? this.buscarMedicamento(nombre2) : null;
    if (!nombre2) errores.push('Falta el segundo medicamento');
    else if (idMedicamento2 === null) errores.push(`No existe un medicamento llamado "${nombre2}"`);

    if (idMedicamento1 !== null && idMedicamento1 === idMedicamento2) {
      errores.push('Un medicamento no puede interactuar consigo mismo');
    }

    const severidadTexto = (fila['severidad'] ?? '').trim();
    let idNivelSeveridad: number | null = null;
    if (!severidadTexto) {
      errores.push('Falta la severidad');
    } else {
      idNivelSeveridad = this.severidades().find((s) => s.label.toLowerCase() === severidadTexto.toLowerCase())?.id ?? null;
      if (idNivelSeveridad === null) errores.push(`La severidad "${severidadTexto}" debe ser Leve, Moderada o Severa`);
    }

    const descripcion = (fila['descripcion'] ?? '').trim();
    if (!descripcion) errores.push('Falta la descripción');

    if (errores.length > 0 || idMedicamento1 === null || idMedicamento2 === null || idNivelSeveridad === null) {
      return { errores, datos: null };
    }

    return { errores: [], datos: { idMedicamento1, idMedicamento2, idNivelSeveridad, descripcion } };
  }

  abrirImportarCsv(): void {
    this.dialog
      .open<ImportarCsvDialog<InteraccionInput>, ImportarCsvDialogData<InteraccionInput>>(ImportarCsvDialog, {
        autoFocus: false,
        data: {
          titulo: 'Importar interacciones desde CSV',
          icono: 'warning',
          nombreEntidadPlural: 'interacciones',
          nombreArchivoPlantilla: 'plantilla_interacciones.csv',
          columnas: this.columnasCsv,
          ayuda: 'Los medicamentos deben escribirse exactamente igual a como aparecen en Farmacia → Medicamentos.',
          validarFila: (fila) => this.validarFilaCsv(fila),
          resumenFila: (datos) => `${this.medicamentoNombre(datos.idMedicamento1)} + ${this.medicamentoNombre(datos.idMedicamento2)}`,
          crear: (datos) => this.interaccionesService.crear(datos),
        },
      })
      .afterClosed()
      .subscribe((recargar) => {
        if (recargar) this.interaccionesService.cargar();
      });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.interaccionesService.RetornarBitacoraGeneral('interaccion_medicamentos').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora interacciones:', err.status);
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
    if (tabla === 'interaccion_medicamentos') return 'Interacción de medicamentos';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'interaccion_medicamentos') return 'warning';
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
