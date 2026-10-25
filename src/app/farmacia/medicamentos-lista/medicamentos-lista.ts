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
import { BitacoraItem, MedicamentoInput, MedicamentosService } from '../../service/medicamentos.service';
import { InventarioFarmaciaService } from '../../service/inventario-farmacia.service';
import { UsuariosService } from '../../service/usuarios.service';
import { CatalogosService } from '../../service/catalogos.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
import { ColumnaCsv, ImportarCsvDialog, ImportarCsvDialogData } from '../../shared/importar-csv/importar-csv-dialog';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-medicamentos-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './medicamentos-lista.html',
  styleUrl: './medicamentos-lista.css',
})
export class MedicamentosLista {
  private medicamentosService = inject(MedicamentosService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private inventarioService = inject(InventarioFarmaciaService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);
  private dialog = inject(MatDialog);

  // Para resolver la columna "categoria" del CSV por nombre (igual que hace
  // el formulario) — ver abrirImportarCsv().
  private catalogos = inject(CatalogosService);
  private categoriasApi = this.catalogos.obtener('CATEGORIA_MEDICAMENTO');

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminados": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activos');
  cargandoEliminados = this.medicamentosService.cargandoEliminados;
  errorEliminados = this.medicamentosService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.medicamentosService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.medicamentosService.errorCarga() : this.errorEliminados()));

  // ============================================================
  // Historial general de Medicamentos
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => {
      this.medicamentosService.cargar();
      this.inventarioService.cargar();
    });
  }

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    // Se pide la primera vez que se entra a la pestaña, no en cada clic.
    if (!this.medicamentosService.listarEliminados().length) {
      this.medicamentosService.cargarEliminados();
    }
  }

  medicamentos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.medicamentosService.listar() : this.medicamentosService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((m) =>
      [m.nombre, m.principioActivo, m.presentacion].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  });

  // Stock de inventario todavía ligado a este medicamento (para avisar antes
  // de dar de baja). Un medicamento puede tener más de un item de inventario
  // (distintas presentaciones/proveedores), así que se suma todo.
  private stockVinculado(idMedicamento: number): { total: number; items: string[] } {
    const items = this.inventarioService
      .listar()
      .filter((i) => i.idMedicamento === idMedicamento && i.stockActual > 0);
    return { total: items.reduce((suma, i) => suma + i.stockActual, 0), items: items.map((i) => i.nombre) };
  }

  async eliminar(id: number, nombre: string): Promise<void> {
    const { total, items } = this.stockVinculado(id);
    const mensaje =
      total > 0
        ? `"${nombre}" todavía tiene ${total} unidades en inventario (${items.join(', ')}).\n\n` +
          `Si lo das de baja, seguirá apareciendo en ese inventario pero ya no se podrá recetar ni agregar a nuevos items.\n\n` +
          `¿Seguro que deseas darlo de baja de todos modos?`
        : `¿Dar de baja el medicamento "${nombre}"?`;

    if (!(await this.confirmacion.confirmar(mensaje))) {
      return;
    }
    this.errorAccion.set('');
    this.medicamentosService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // El backend expone "idUsuarioCreacion"/"idUsuarioModificacion" en el
  // medicamento, pero todavía no los llena con el usuario real que hizo la
  // acción (ver SOLICITUD_ENDPOINTS_ELIMINADOS.md punto 5): hasta que eso se
  // arregle del lado del backend, esto va a mostrar "—" casi siempre.
  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  async reactivar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Reactivar el medicamento "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.medicamentosService.reactivar(id).subscribe({
      next: () => this.notificaciones.exito('Reactivado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // ============================================================
  // IMPORTAR CSV
  // ============================================================

  private readonly columnasCsv: ColumnaCsv[] = [
    { clave: 'nombre', etiqueta: 'Nombre del medicamento', requerido: true, ejemplo: 'Paracetamol 500mg' },
    { clave: 'principio_activo', etiqueta: 'Principio activo (opcional)', requerido: false, ejemplo: 'Paracetamol' },
    { clave: 'presentacion', etiqueta: 'Presentación (opcional)', requerido: false, ejemplo: 'Tableta' },
    { clave: 'concentracion', etiqueta: 'Concentración (opcional)', requerido: false, ejemplo: '500mg' },
    { clave: 'categoria', etiqueta: 'Categoría (opcional, nombre tal como está en Catálogos)', requerido: false, ejemplo: 'Analgésico' },
    { clave: 'requiere_receta', etiqueta: 'Requiere receta: Sí / No', requerido: false, ejemplo: 'No' },
    { clave: 'precio_venta_publico', etiqueta: 'Precio de venta al público (Q)', requerido: true, ejemplo: '15.00' },
  ];

  private validarFilaCsv(fila: Record<string, string>): { errores: string[]; datos: MedicamentoInput | null } {
    const errores: string[] = [];
    const nombre = (fila['nombre'] ?? '').trim();
    if (!nombre) errores.push('Falta el nombre');

    let idCategoriaMedicamento: number | null = null;
    const categoriaTexto = (fila['categoria'] ?? '').trim();
    if (categoriaTexto) {
      const encontrada = this.categoriasApi().find(
        (c) => c.codigo.toLowerCase() === categoriaTexto.toLowerCase() || c.nombre.toLowerCase() === categoriaTexto.toLowerCase(),
      );
      if (!encontrada) {
        errores.push(`La categoría "${categoriaTexto}" no existe (revisa Mantenimiento → Catálogos)`);
      } else {
        idCategoriaMedicamento = encontrada.id;
      }
    }

    const requiereRecetaTexto = (fila['requiere_receta'] ?? '').trim().toLowerCase();
    let requiereReceta = false;
    if (['si', 'sí', 'true', '1', 'x'].includes(requiereRecetaTexto)) {
      requiereReceta = true;
    } else if (requiereRecetaTexto && !['no', 'false', '0'].includes(requiereRecetaTexto)) {
      errores.push(`"requiere_receta" debe ser Sí o No (vino "${fila['requiere_receta']}")`);
    }

    const precioTexto = (fila['precio_venta_publico'] ?? '').trim().replace(',', '.');
    const precio = Number(precioTexto);
    if (!precioTexto || isNaN(precio) || precio < 0) {
      errores.push('El precio de venta al público debe ser un número válido (≥ 0)');
    }

    if (errores.length > 0) return { errores, datos: null };

    return {
      errores: [],
      datos: {
        nombre,
        principioActivo: (fila['principio_activo'] ?? '').trim() || null,
        presentacion: (fila['presentacion'] ?? '').trim() || null,
        concentracion: (fila['concentracion'] ?? '').trim() || null,
        idCategoriaMedicamento,
        requiereReceta,
        precioVentaPublico: precio,
      },
    };
  }

  abrirImportarCsv(): void {
    this.dialog
      .open<ImportarCsvDialog<MedicamentoInput>, ImportarCsvDialogData<MedicamentoInput>>(ImportarCsvDialog, {
        autoFocus: false,
        data: {
          titulo: 'Importar medicamentos desde CSV',
          icono: 'medication',
          nombreEntidadPlural: 'medicamentos',
          nombreArchivoPlantilla: 'plantilla_medicamentos.csv',
          columnas: this.columnasCsv,
          ayuda:
            'La columna "categoria" acepta el nombre tal como aparece en Mantenimiento → Catálogos (ej. "Analgésico"); déjala vacía si no aplica.',
          validarFila: (fila) => this.validarFilaCsv(fila),
          resumenFila: (datos) => `${datos.nombre} — Q${datos.precioVentaPublico.toFixed(2)}`,
          crear: (datos) => this.medicamentosService.crear(datos),
        },
      })
      .afterClosed()
      .subscribe((recargar) => {
        if (recargar) this.medicamentosService.cargar();
      });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.medicamentosService.RetornarBitacoraGeneral('medicamentos').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora medicamentos:', err.status);
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
    if (tabla === 'medicamentos') return 'Medicamento';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'medicamentos') return 'medication';
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
