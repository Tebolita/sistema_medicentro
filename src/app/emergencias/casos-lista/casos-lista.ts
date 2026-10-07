import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  BitacoraItem,
  CasoEmergencia,
  CasosEmergenciaService,
  MedicoOpcion,
  OpcionCatalogo,
  UsuarioOpcion,
} from '../casos-emergencia.service';
import { PacientesService } from '../../pacientes/pacientes.service';
import { MENU_SECTIONS } from '../../shared/menu-data';

@Component({
  selector: 'app-casos-lista',
  imports: [
    FormsModule,
    NgClass,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './casos-lista.html',
  styleUrl: './casos-lista.css',
})
export class CasosLista {
  private casosService = inject(CasosEmergenciaService);
  private pacientesService = inject(PacientesService);

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);

  // Signals con los catálogos traídos del backend
  medicosSignal = signal<MedicoOpcion[]>([]);
  nivelesSignal = signal<OpcionCatalogo[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  // ============================================================
  // Historial general de Emergencias · Casos
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  opcionesEmergencias = (
    MENU_SECTIONS.find((s) => s.slug === 'emergencias')?.items ?? []
  ).filter((item) => item.route !== '/home/emergencias');

  constructor() {
    // Cargar médicos del backend
    this.casosService.RetornarMedicos().subscribe({
      next: (m) => this.medicosSignal.set(m),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasosLista] Error médicos:', err.status),
    });

    // Cargar niveles de triaje del backend
    this.casosService.RetornarNivelesTriage().subscribe({
      next: (n) => this.nivelesSignal.set(n),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasosLista] Error niveles:', err.status),
    });

    // Cargar estados del backend
    this.casosService.RetornarEstadosCaso().subscribe({
      next: (e) => this.estadosSignal.set(e),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasosLista] Error estados:', err.status),
    });

    // Cargar usuarios (para el nombre en la bitácora)
    this.casosService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasosLista] Error usuarios:', err.status),
    });
  }

  // Ordenado por urgencia real del triaje (según el orden del catálogo)
  casos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    let lista = this.casosService.listar();
    if (term) {
      lista = lista.filter((c) =>
        [this.nombrePaciente(c), c.motivo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }
    const niveles = this.nivelesSignal();
    return [...lista].sort((a, b) => {
      const ia = niveles.findIndex((n) => n.id === a.idNivelTriage);
      const ib = niveles.findIndex((n) => n.id === b.idNivelTriage);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
  });

  nombrePaciente(c: CasoEmergencia): string {
    if (c.idPaciente == null) {
      return c.nombrePaciente || 'Paciente no identificado';
    }
    const p = this.pacientesService.directorio().find((pac) => pac.idPaciente === c.idPaciente);
    if (!p) {
      return 'Paciente no encontrado';
    }
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido]
      .filter(Boolean)
      .join(' ');
  }

  iniciales(c: CasoEmergencia): string {
    const partes = this.nombrePaciente(c).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  medicoLabel(idMedico: number | null): string {
    if (idMedico == null) return 'Sin asignar';
    return this.medicosSignal().find((m) => m.id === idMedico)?.nombre ?? 'Sin asignar';
  }

  triageLabel(idNivelTriage: number): string {
    return this.nivelesSignal().find((n) => n.id === idNivelTriage)?.label ?? '—';
  }

  triageClase(idNivelTriage: number): string {
    const idx = this.nivelesSignal().findIndex((n) => n.id === idNivelTriage);
    return `triage-${idx >= 0 ? idx + 1 : 0}`;
  }

  estadoLabel(idEstadoCaso: number): string {
    return this.estadosSignal().find((e) => e.id === idEstadoCaso)?.label ?? '—';
  }

  estadoClase(idEstadoCaso: number): string {
    const label = this.estadoLabel(idEstadoCaso).toLowerCase();
    if (label.includes('atendido')) return 'estado-atendido';
    if (label.includes('referid') || label.includes('traslad')) return 'estado-referido';
    if (label.includes('atención') || label.includes('atencion')) return 'estado-en-atencion';
    return 'estado-esperando';
  }

 // ✅ DESPUÉS (bien):
formatHora(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar el caso de "${paciente}"?`)) {
      return;
    }
    this.casosService.eliminar(id);
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.casosService.RetornarBitacoraGeneral('casos_emergencia').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora casos:', err.status);
        this.cargandoHistorial.set(false);
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
    if (tabla === 'casos_emergencia') return 'Caso de emergencia';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'casos_emergencia') return 'emergency';
    return 'description';
  }

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario ${idUsuario}`;
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