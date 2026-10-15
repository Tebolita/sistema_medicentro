import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, InteraccionesService } from '../../service/interacciones.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

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
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './interacciones-lista.html',
  styleUrl: './interacciones-lista.css',
})
export class InteraccionesLista {
  private interaccionesService = inject(InteraccionesService);
  private medicamentosService = inject(MedicamentosService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  private catalogos = inject(CatalogosService);
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

  eliminar(id: number, etiqueta: string): void {
    if (!confirm(`¿Dar de baja la interacción "${etiqueta}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.interaccionesService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, etiqueta: string): void {
    if (!confirm(`¿Reactivar la interacción "${etiqueta}"?`)) {
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
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.interaccionesService.RetornarBitacoraGeneral('interaccion_medicamentos').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
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
    if (idTipoAccion === 79) return 'Creó';
    if (idTipoAccion === 80) return 'Modificó';
    if (idTipoAccion === 81) return 'Eliminó';
    return 'Cambió';
  }

  accionClase(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'accion-crear';
    if (idTipoAccion === 80) return 'accion-modificar';
    if (idTipoAccion === 81) return 'accion-eliminar';
    return 'accion-default';
  }

  accionIcono(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'add_circle';
    if (idTipoAccion === 80) return 'edit';
    if (idTipoAccion === 81) return 'delete';
    return 'history';
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
