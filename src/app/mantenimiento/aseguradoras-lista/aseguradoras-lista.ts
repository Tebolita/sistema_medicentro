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
import { AseguradoraInput, BitacoraItem, AseguradorasService } from '../../service/aseguradoras.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { TIPOS_ENTIDAD_ASEGURADORA } from '../aseguradoras-catalogos';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
import { ColumnaCsv, ImportarCsvDialog, ImportarCsvDialogData } from '../../shared/importar-csv/importar-csv-dialog';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-aseguradoras-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './aseguradoras-lista.html',
  styleUrl: './aseguradoras-lista.css',
})
export class AseguradorasLista {
  private aseguradorasService = inject(AseguradorasService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);
  private dialog = inject(MatDialog);

  private catalogos = inject(CatalogosService);
  private tiposEntidadApi = this.catalogos.obtener('TIPO_ENTIDAD_ASEGURADORA');
  private tiposEntidad = computed(() => {
    const api = this.tiposEntidadApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_ENTIDAD_ASEGURADORA;
  });

  buscar = signal('');
  errorAccion = signal('');

  // ============================================================
  // Historial general de Aseguradoras
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.aseguradorasService.cargandoEliminadas;
  errorEliminadas = this.aseguradorasService.errorEliminadas;

  cargando = computed(() =>
    this.vista() === 'activas' ? this.aseguradorasService.cargando() : this.cargandoEliminadas(),
  );
  errorCarga = computed(() =>
    this.vista() === 'activas' ? this.aseguradorasService.errorCarga() : this.errorEliminadas(),
  );

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.aseguradorasService.listarEliminadas().length) {
      this.aseguradorasService.cargarEliminadas();
    }
  }

  aseguradoras = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista =
      this.vista() === 'activas' ? this.aseguradorasService.listar() : this.aseguradorasService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((a) =>
      [a.nombre, a.nit, a.telefono, a.correo].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  });

  async eliminar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Dar de baja la aseguradora "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.aseguradorasService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  async reactivar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Reactivar la aseguradora "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.aseguradorasService.reactivar(id).subscribe({
      next: () => this.notificaciones.exito('Reactivado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // ============================================================
  // IMPORTAR CSV
  // ============================================================

  private readonly columnasCsv: ColumnaCsv[] = [
    { clave: 'nombre', etiqueta: 'Nombre de la aseguradora', requerido: true, ejemplo: 'Seguros El Roble' },
    { clave: 'nit', etiqueta: 'NIT (opcional)', requerido: false, ejemplo: '12345678-9' },
    { clave: 'tipo_entidad', etiqueta: 'Tipo de entidad (opcional: Aseguradora, Mutualidad, Cooperativa)', requerido: false, ejemplo: 'Aseguradora' },
    { clave: 'contacto', etiqueta: 'Persona de contacto (opcional)', requerido: false, ejemplo: 'Juan Pérez' },
    { clave: 'telefono', etiqueta: 'Teléfono (opcional)', requerido: false, ejemplo: '22223333' },
    { clave: 'correo', etiqueta: 'Correo (opcional)', requerido: false, ejemplo: 'contacto@elroble.com' },
  ];

  private validarFilaCsv(fila: Record<string, string>): { errores: string[]; datos: AseguradoraInput | null } {
    const errores: string[] = [];
    const nombre = (fila['nombre'] ?? '').trim();
    if (!nombre) errores.push('Falta el nombre');

    const correo = (fila['correo'] ?? '').trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      errores.push(`El correo "${correo}" no es válido`);
    }

    // No es un error si no matchea: el backend no valida este id contra
    // nada (ver aseguradoras-catalogos.ts), así que una fila con un tipo que
    // no coincide simplemente queda sin tipo en vez de rechazarse.
    const tipoTexto = (fila['tipo_entidad'] ?? '').trim();
    const idTipoEntidad = tipoTexto
      ? this.tiposEntidad().find((t) => t.label.toLowerCase() === tipoTexto.toLowerCase())?.id ?? null
      : null;

    if (errores.length > 0) return { errores, datos: null };

    return {
      errores: [],
      datos: {
        nombre,
        nit: (fila['nit'] ?? '').trim() || null,
        idTipoEntidad,
        contacto: (fila['contacto'] ?? '').trim() || null,
        telefono: (fila['telefono'] ?? '').trim() || null,
        correo: correo || null,
      },
    };
  }

  abrirImportarCsv(): void {
    this.dialog
      .open<ImportarCsvDialog<AseguradoraInput>, ImportarCsvDialogData<AseguradoraInput>>(ImportarCsvDialog, {
        autoFocus: false,
        data: {
          titulo: 'Importar aseguradoras desde CSV',
          icono: 'health_and_safety',
          nombreEntidadPlural: 'aseguradoras',
          nombreArchivoPlantilla: 'plantilla_aseguradoras.csv',
          columnas: this.columnasCsv,
          validarFila: (fila) => this.validarFilaCsv(fila),
          resumenFila: (datos) => datos.nombre,
          crear: (datos) => this.aseguradorasService.crear(datos),
        },
      })
      .afterClosed()
      .subscribe((recargar) => {
        if (recargar) this.aseguradorasService.cargar();
      });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.aseguradorasService.RetornarBitacoraGeneral('aseguradoras').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora aseguradoras:', err);
        this.cargandoHistorial.set(false);
        this.notificaciones.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorialGeneral(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    return this.usuariosService.obtener(idUsuario)?.nombreUsuario ?? `Usuario #${idUsuario}`;
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
    if (tabla === 'aseguradoras') return 'Aseguradora';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'aseguradoras') return 'health_and_safety';
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
