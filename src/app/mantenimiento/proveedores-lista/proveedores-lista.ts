import { HistorialCambios } from '../../shared/historial-cambios/historial-cambios';
import { tieneCambios } from '../../shared/bitacora-cambios';
import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { BitacoraItem, ProveedorInput, ProveedoresService } from '../../service/proveedores.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
import { ColumnaCsv, ImportarCsvDialog, ImportarCsvDialogData } from '../../shared/importar-csv/importar-csv-dialog';

@Component({
  selector: 'app-proveedores-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './proveedores-lista.html',
  styleUrl: './proveedores-lista.css',
})
export class ProveedoresLista {
  private proveedoresService = inject(ProveedoresService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);
  private dialog = inject(MatDialog);

  buscar = signal('');
  errorAccion = signal('');
  cargando = this.proveedoresService.cargando;
  errorCarga = this.proveedoresService.errorCarga;

  // ============================================================
  // Historial general de Proveedores
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => {
      this.proveedoresService.cargar();
      this.usuariosService.cargar();
    });
  }

  proveedores = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.proveedoresService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((p) =>
      [p.nombre, p.nit, p.telefono, p.correo].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  });

  async eliminar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Dar de baja al proveedor "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.proveedoresService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // ============================================================
  // IMPORTAR CSV
  // ============================================================

  private readonly columnasCsv: ColumnaCsv[] = [
    { clave: 'nombre', etiqueta: 'Nombre del proveedor', requerido: true, ejemplo: 'Droguería Central' },
    { clave: 'nit', etiqueta: 'NIT (opcional)', requerido: false, ejemplo: '12345678-9' },
    { clave: 'telefono', etiqueta: 'Teléfono (opcional)', requerido: false, ejemplo: '22223333' },
    { clave: 'correo', etiqueta: 'Correo (opcional)', requerido: false, ejemplo: 'contacto@drogueria.com' },
    { clave: 'direccion', etiqueta: 'Dirección (opcional)', requerido: false, ejemplo: 'Zona 1, Guatemala' },
  ];

  private validarFilaCsv(fila: Record<string, string>): { errores: string[]; datos: ProveedorInput | null } {
    const errores: string[] = [];
    const nombre = (fila['nombre'] ?? '').trim();
    if (!nombre) errores.push('Falta el nombre');

    const correo = (fila['correo'] ?? '').trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      errores.push(`El correo "${correo}" no es válido`);
    }

    if (errores.length > 0) return { errores, datos: null };

    return {
      errores: [],
      datos: {
        nombre,
        nit: (fila['nit'] ?? '').trim() || null,
        telefono: (fila['telefono'] ?? '').trim() || null,
        correo: correo || null,
        direccion: (fila['direccion'] ?? '').trim() || null,
      },
    };
  }

  abrirImportarCsv(): void {
    this.dialog
      .open<ImportarCsvDialog<ProveedorInput>, ImportarCsvDialogData<ProveedorInput>>(ImportarCsvDialog, {
        autoFocus: false,
        data: {
          titulo: 'Importar proveedores desde CSV',
          icono: 'local_shipping',
          nombreEntidadPlural: 'proveedores',
          nombreArchivoPlantilla: 'plantilla_proveedores.csv',
          columnas: this.columnasCsv,
          validarFila: (fila) => this.validarFilaCsv(fila),
          resumenFila: (datos) => datos.nombre,
          crear: (datos) => this.proveedoresService.crear(datos),
        },
      })
      .afterClosed()
      .subscribe((recargar) => {
        if (recargar) this.proveedoresService.cargar();
      });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.proveedoresService.RetornarBitacoraGeneral('proveedores').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora proveedores:', err.message);
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
    if (tabla === 'proveedores') return 'Proveedor';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'proveedores') return 'local_shipping';
    return 'description';
  }

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    return this.usuariosService.obtener(idUsuario)?.nombreUsuario ?? `Usuario #${idUsuario}`;
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
