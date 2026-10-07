import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  BitacoraItem,
  HospitalizacionesService,
  MedicoOpcion,
  OpcionCatalogo,
  UsuarioOpcion,
} from '../hospitalizaciones.service';
import { CamaOpcion } from '../hospitalizacion-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';
import { MENU_SECTIONS } from '../../shared/menu-data';

@Component({
  selector: 'app-hospitalizaciones-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './hospitalizaciones-lista.html',
  styleUrl: './hospitalizaciones-lista.css',
})
export class HospitalizacionesLista {
  private hospitalizacionesService = inject(HospitalizacionesService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  // Signals con catálogos del backend
  medicosSignal = signal<MedicoOpcion[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);
  camasSignal = signal<CamaOpcion[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  // ============================================================
  // Historial general de Hospitalización
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  filtroHistorial = signal<'todas' | 'hospitalizaciones' | 'ordenes'>('todas');

  bitacoraFiltrada = computed(() => {
    const filtro = this.filtroHistorial();
    const items = this.bitacoraSignal();
    if (filtro === 'todas') return items;
    if (filtro === 'hospitalizaciones') {
      return items.filter((i) => i.tablaAfectada === 'hospitalizaciones');
    }
    return items.filter((i) => i.tablaAfectada === 'ordenes_medicas_hospitalizacion');
  });

  opcionesHospitalizacion = MENU_SECTIONS.find((s) => s.slug === 'hospitalizacion')?.items ?? [];

  constructor() {
    // Cargar médicos
    this.hospitalizacionesService.RetornarMedicos().subscribe({
      next: (m) => this.medicosSignal.set(m),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionesLista] Error médicos:', err.status),
    });

    // Cargar estados
    this.hospitalizacionesService.RetornarEstadosHospitalizacion().subscribe({
      next: (e) => this.estadosSignal.set(e),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionesLista] Error estados:', err.status),
    });

    // Cargar camas
    this.hospitalizacionesService.RetornarCamas().subscribe({
      next: (c) => this.camasSignal.set(c),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionesLista] Error camas:', err.status),
    });

    // Cargar usuarios (para mostrar el nombre en la bitácora)
    this.hospitalizacionesService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionesLista] Error usuarios:', err.status),
    });

    // Query param "foco"
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });
  }

  hospitalizaciones = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.hospitalizacionesService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((r) =>
      [
        this.nombrePaciente(r.hospitalizacion.idPaciente),
        this.medicoLabel(r.hospitalizacion.idMedicoResponsable),
        r.hospitalizacion.motivoIngreso,
      ]
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
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido]
      .filter(Boolean)
      .join(' ');
  }

  iniciales(idPaciente: number): string {
    const partes = this.nombrePaciente(idPaciente).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  medicoLabel(idMedico: number | null): string {
    if (idMedico == null) return '—';
    return this.medicosSignal().find((m) => m.id === idMedico)?.nombre ?? '—';
  }

  camaLabel(idCama: number | null): string {
    if (idCama == null) return '—';
    return this.camasSignal().find((c) => c.id === idCama)?.label ?? '—';
  }

  estadoLabel(idEstadoHospitalizacion: number | null): string {
    if (idEstadoHospitalizacion == null) return '—';
    return this.estadosSignal().find((e) => e.id === idEstadoHospitalizacion)?.label ?? '—';
  }

  estadoClase(idEstadoHospitalizacion: number | null): string {
    const label = this.estadoLabel(idEstadoHospitalizacion).toLowerCase();
    if (label.includes('alta')) return 'estado-alta';
    if (label.includes('traslad')) return 'estado-trasladada';
    return 'estado-activa';
  }

  formatFecha(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';
    return new Date(isoConZona).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar el registro de hospitalización de "${paciente}"?`)) {
      return;
    }
    this.hospitalizacionesService.eliminar(id);
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);
    this.filtroHistorial.set('todas');

    // Cargar las 2 tablas en paralelo
    let itemsHospitalizaciones: BitacoraItem[] = [];
    let itemsOrdenes: BitacoraItem[] = [];
    let pendientes = 2;

    const finalizar = () => {
      pendientes--;
      if (pendientes <= 0) {
        const todos = [...itemsHospitalizaciones, ...itemsOrdenes].sort((a, b) =>
          b.fechaHora.localeCompare(a.fechaHora),
        );
        this.bitacoraSignal.set(todos);
        this.cargandoHistorial.set(false);
      }
    };

    this.hospitalizacionesService.RetornarBitacoraGeneral('hospitalizaciones').subscribe({
      next: (items) => {
        itemsHospitalizaciones = items;
        finalizar();
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora hospitalizaciones:', err.status);
        finalizar();
      },
    });

    this.hospitalizacionesService
      .RetornarBitacoraGeneral('ordenes_medicas_hospitalizacion')
      .subscribe({
        next: (items) => {
          itemsOrdenes = items;
          finalizar();
        },
        error: (err: HttpErrorResponse) => {
          console.error('❌ Error bitácora órdenes:', err.status);
          finalizar();
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
    if (tabla === 'hospitalizaciones') return 'Ingreso hospitalario';
    if (tabla === 'ordenes_medicas_hospitalizacion') return 'Orden médica';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'hospitalizaciones') return 'bed';
    if (tabla === 'ordenes_medicas_hospitalizacion') return 'assignment';
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