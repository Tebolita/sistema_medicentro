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
import { BitacoraItem, ConvenioInput, ConveniosService } from '../../service/convenios.service';
import { AseguradorasService } from '../../service/aseguradoras.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
import { ColumnaCsv, ImportarCsvDialog, ImportarCsvDialogData } from '../../shared/importar-csv/importar-csv-dialog';

const ESTADOS_CONVENIO_EJEMPLO = [
  { id: 1, label: 'Vigente' },
  { id: 2, label: 'Vencido' },
  { id: 3, label: 'Suspendido' },
];

@Component({
  selector: 'app-convenios-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './convenios-lista.html',
  styleUrl: './convenios-lista.css',
})
export class ConveniosLista {
  private conveniosService = inject(ConveniosService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private aseguradorasService = inject(AseguradorasService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);
  private dialog = inject(MatDialog);

  private catalogos = inject(CatalogosService);
  private estadosApi = this.catalogos.obtener('ESTADO_CONVENIO');
  private estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_CONVENIO_EJEMPLO;
  });

  buscar = signal('');
  errorAccion = signal('');
  cargando = this.conveniosService.cargando;
  errorCarga = this.conveniosService.errorCarga;

  // ============================================================
  // Historial general de Convenios
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => {
      this.conveniosService.cargar();
      this.aseguradorasService.cargar();
    });
  }

  convenios = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.conveniosService.listarTodos();
    if (!term) {
      return lista;
    }
    return lista.filter((c) =>
      [c.nombreConvenio, this.aseguradoraLabel(c.idAseguradora)].join(' ').toLowerCase().includes(term),
    );
  });

  aseguradoraLabel(idAseguradora: number): string {
    return this.aseguradorasService.listar().find((a) => a.idAseguradora === idAseguradora)?.nombre ?? '—';
  }

  formatFecha(fecha: string | null | undefined): string {
    // Defensivo: no debería faltar (fechaInicio es obligatoria en el
    // backend), pero si llegara null/undefined no tiene sentido tronar la
    // pantalla completa por una fecha que no se puede mostrar.
    if (!fecha) {
      return '—';
    }
    // fechaInicio/fechaFin son DateOnly ("yyyy-MM-dd"): si se arman con
    // `new Date('yyyy-MM-dd')` se interpretan en UTC y en husos horarios
    // negativos (como Guatemala) se corren un día hacia atrás. Se arman en
    // hora local para evitar eso.
    const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  async eliminar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Dar de baja el convenio "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.conveniosService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // ============================================================
  // IMPORTAR CSV
  // ============================================================

  private readonly columnasCsv: ColumnaCsv[] = [
    { clave: 'aseguradora', etiqueta: 'Nombre exacto de la aseguradora', requerido: true, ejemplo: 'Seguros El Roble' },
    { clave: 'nombre_convenio', etiqueta: 'Nombre del convenio', requerido: true, ejemplo: 'Convenio corporativo 2026' },
    { clave: 'fecha_inicio', etiqueta: 'Fecha de inicio (AAAA-MM-DD)', requerido: true, ejemplo: '2026-01-01' },
    { clave: 'fecha_fin', etiqueta: 'Fecha de fin (opcional, AAAA-MM-DD)', requerido: false, ejemplo: '2026-12-31' },
    { clave: 'cobertura_general', etiqueta: 'Porcentaje de cobertura general (opcional, 0-100)', requerido: false, ejemplo: '80' },
    { clave: 'estado', etiqueta: 'Estado (ej. Vigente, Vencido, Suspendido)', requerido: true, ejemplo: 'Vigente' },
    { clave: 'condiciones', etiqueta: 'Condiciones (opcional)', requerido: false, ejemplo: 'Aplica a consulta externa y laboratorio' },
  ];

  private validarFilaCsv(fila: Record<string, string>): { errores: string[]; datos: ConvenioInput | null } {
    const errores: string[] = [];

    const aseguradoraTexto = (fila['aseguradora'] ?? '').trim();
    const idAseguradora = aseguradoraTexto
      ? this.aseguradorasService.listar().find((a) => a.nombre.toLowerCase() === aseguradoraTexto.toLowerCase())?.idAseguradora ?? null
      : null;
    if (!aseguradoraTexto) errores.push('Falta la aseguradora');
    else if (idAseguradora === null) errores.push(`No existe una aseguradora llamada "${aseguradoraTexto}"`);

    const nombreConvenio = (fila['nombre_convenio'] ?? '').trim();
    if (!nombreConvenio) errores.push('Falta el nombre del convenio');

    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    const fechaInicio = (fila['fecha_inicio'] ?? '').trim();
    if (!fechaInicio) errores.push('Falta la fecha de inicio');
    else if (!fechaRegex.test(fechaInicio)) errores.push('La fecha de inicio debe tener el formato AAAA-MM-DD');

    const fechaFin = (fila['fecha_fin'] ?? '').trim();
    if (fechaFin && !fechaRegex.test(fechaFin)) errores.push('La fecha de fin debe tener el formato AAAA-MM-DD');

    let porcentajeCoberturaGeneral: number | null = null;
    const coberturaTexto = (fila['cobertura_general'] ?? '').trim();
    if (coberturaTexto) {
      porcentajeCoberturaGeneral = Number(coberturaTexto);
      if (isNaN(porcentajeCoberturaGeneral) || porcentajeCoberturaGeneral < 0 || porcentajeCoberturaGeneral > 100) {
        errores.push('El porcentaje de cobertura debe ser un número entre 0 y 100');
      }
    }

    const estadoTexto = (fila['estado'] ?? '').trim();
    let idEstadoConvenio: number | null = null;
    if (!estadoTexto) {
      errores.push('Falta el estado');
    } else {
      idEstadoConvenio = this.estados().find((e) => e.label.toLowerCase() === estadoTexto.toLowerCase())?.id ?? null;
      if (idEstadoConvenio === null) errores.push(`El estado "${estadoTexto}" no existe (revisa Mantenimiento → Catálogos)`);
    }

    if (errores.length > 0 || idAseguradora === null || idEstadoConvenio === null) return { errores, datos: null };

    return {
      errores: [],
      datos: {
        idAseguradora,
        nombreConvenio,
        fechaInicio,
        fechaFin: fechaFin || null,
        porcentajeCoberturaGeneral,
        idEstadoConvenio,
        condiciones: (fila['condiciones'] ?? '').trim() || null,
      },
    };
  }

  abrirImportarCsv(): void {
    this.dialog
      .open<ImportarCsvDialog<ConvenioInput>, ImportarCsvDialogData<ConvenioInput>>(ImportarCsvDialog, {
        autoFocus: false,
        data: {
          titulo: 'Importar convenios desde CSV',
          icono: 'handshake',
          nombreEntidadPlural: 'convenios',
          nombreArchivoPlantilla: 'plantilla_convenios.csv',
          columnas: this.columnasCsv,
          ayuda: 'La aseguradora debe escribirse exactamente igual a como aparece en Mantenimiento → Aseguradoras.',
          validarFila: (fila) => this.validarFilaCsv(fila),
          resumenFila: (datos) => datos.nombreConvenio,
          crear: (datos) => this.conveniosService.crear(datos),
        },
      })
      .afterClosed()
      .subscribe((recargar) => {
        if (recargar) this.conveniosService.cargar();
      });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.conveniosService.RetornarBitacoraGeneral('convenios').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora convenios:', err);
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
    if (tabla === 'convenios') return 'Convenio';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'convenios') return 'handshake';
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
