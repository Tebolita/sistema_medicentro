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
import { BitacoraItem, ConveniosService } from '../../service/convenios.service';
import { AseguradorasService } from '../../service/aseguradoras.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

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

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja el convenio "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.conveniosService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
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
