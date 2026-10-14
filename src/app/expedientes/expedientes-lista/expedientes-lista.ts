import { Component, ElementRef, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';

import { ExpedienteService } from '../../service/expediente.service';
import { PacienteService } from '../../service/paciente.service';
import { EmpleadoService } from '../../service/empleado.service';
import { CatalogoService } from '../../service/catalogo.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { HistorialClinico } from '../../models/tratamiento.model';
import { PacienteListado } from '../../models/paciente.model';
import { Medico } from '../../models/medico.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

// Forma que espera el HTML: { id, label }.
interface OpcionCatalogo {
  id: number;
  label: string;
}

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-expedientes-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './expedientes-lista.html',
  styleUrl: './expedientes-lista.css',
})
export class ExpedientesLista {
  private expedienteService = inject(ExpedienteService);
  private pacienteService = inject(PacienteService);
  private empleadoService = inject(EmpleadoService);
  private catalogoService = inject(CatalogoService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  // Pestaña activa: registros activos o dados de baja.
  vista = signal<Vista>('activos');
  cargando = signal(false);
  errorCarga = signal('');

  // Datos reales desde la API (ya no hay datos de ejemplo).
  private lista = signal<HistorialClinico[]>([]);
  private eliminados = signal<HistorialClinico[]>([]);
  private eliminadosCargados = false;
  // Pacientes activos y eliminados, para mostrar el nombre aunque el paciente
  // haya sido dado de baja.
  private pacientesApi = signal<PacienteListado[]>([]);
  private medicos = signal<Medico[]>([]);
  private tiposApi = signal<CatalogoOpcion[]>([]);

  // Filtro de tipo de registro que llega desde el menú (?tipo=FICHA_PEDIATRICA,
  // etc.). Se recibe el CÓDIGO del catálogo y se traduce al id real de la base.
  private codigoTipoFiltro = signal<string | null>(null);
  tipoFiltro = computed<number | null>(() => {
    const codigo = this.codigoTipoFiltro();
    if (!codigo) return null;
    return this.tiposApi().find((t) => t.codigo === codigo)?.id ?? null;
  });
  private filtroQuitado = signal(false);

  get tiposRegistro(): OpcionCatalogo[] {
    return this.tiposApi().map((t) => ({ id: t.id, label: t.nombre }));
  }

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.codigoTipoFiltro.set(params.get('tipo'));
      this.filtroQuitado.set(false);

      if (params.get('foco') === 'buscar') {
        this.resaltarBusqueda.set(true);
        queueMicrotask(() => this.searchInput()?.nativeElement.focus());
        setTimeout(() => this.resaltarBusqueda.set(false), 1600);
      }
    });

    // En el servidor (SSR) no hay sesión ni token: solo se consulta desde el navegador.
    if (isPlatformBrowser(this.platformId)) {
      this.cargar();
    }
  }

  private cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    forkJoin({
      expedientes: this.expedienteService.RetornarExpedientes(),
      pacientes: this.pacienteService.RetornarPacientes(),
      pacientesEliminados: this.pacienteService.RetornarPacientesEliminados(),
      medicos: this.empleadoService.RetornarMedicos(),
      tipos: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.TIPO_REGISTRO_CLINICO),
    }).subscribe({
      next: (r) => {
        this.lista.set(r.expedientes.datos ?? []);
        this.pacientesApi.set([...(r.pacientes.datos ?? []), ...(r.pacientesEliminados.datos ?? [])]);
        this.medicos.set(r.medicos.datos ?? []);
        this.tiposApi.set(r.tipos.datos ?? []);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.errorCarga.set('No se pudieron cargar los expedientes: ' + err.message);
      },
    });
  }

  private cargarActivos(): void {
    this.expedienteService.RetornarExpedientes().subscribe({
      next: (resp) => this.lista.set(resp.datos ?? []),
      error: (err: Error) => this.errorCarga.set('No se pudieron cargar los expedientes: ' + err.message),
    });
  }

  private cargarEliminados(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.expedienteService.RetornarExpedientesEliminados().subscribe({
      next: (resp) => {
        this.eliminados.set(resp.datos ?? []);
        this.eliminadosCargados = true;
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.errorCarga.set('No se pudieron cargar los registros eliminados: ' + err.message);
      },
    });
  }

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    if (!this.eliminadosCargados) {
      this.cargarEliminados();
    }
  }

  expedientes = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const tipo = this.filtroQuitado() ? null : this.tipoFiltro();
    let lista = this.vista() === 'activos' ? this.lista() : this.eliminados();
    if (tipo != null) {
      lista = lista.filter((h) => h.idTipoRegistro === tipo);
    }
    if (!term) {
      return lista;
    }
    return lista.filter((h) =>
      [this.nombrePaciente(h.idPaciente), h.motivoConsulta, h.diagnostico, h.notas]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  tipoFiltroLabel(): string {
    return this.tiposApi().find((t) => t.id === this.tipoFiltro())?.nombre ?? '';
  }

  limpiarFiltroTipo(): void {
    this.filtroQuitado.set(true);
    this.codigoTipoFiltro.set(null);
  }

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesApi().find((pac) => pac.idPaciente === idPaciente);
    if (!p) {
      return 'Paciente no encontrado';
    }
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
  }

  iniciales(idPaciente: number): string {
    const partes = this.nombrePaciente(idPaciente).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  medicoLabel(idMedico: number): string {
    return this.medicos().find((m) => m.idEmpleado === idMedico)?.nombreCompleto ?? '—';
  }

  tipoLabel(idTipoRegistro: number): string {
    return this.tiposApi().find((t) => t.id === idTipoRegistro)?.nombre ?? '—';
  }

  resumen(h: { motivoConsulta: string | null; diagnostico: string | null; notas: string | null }): string {
    return h.diagnostico || h.motivoConsulta || h.notas || 'Sin detalle registrado';
  }

  formatFecha(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  eliminar(h: HistorialClinico): void {
    const paciente = this.nombrePaciente(h.idPaciente);
    if (!confirm(`¿Eliminar el registro clínico de "${paciente}"?`)) {
      return;
    }
    this.expedienteService.EliminarExpediente(h.idHistorial).subscribe({
      next: () => {
        this.lista.update((l) => l.filter((x) => x.idHistorial !== h.idHistorial));
        // Se vuelve a pedir la lista de eliminados la próxima vez que se abra
        // la pestaña, para traer quién y cuándo lo dio de baja.
        this.eliminadosCargados = false;
        this.notificaciones.exito(`Registro clínico de "${paciente}" eliminado correctamente`);
      },
      error: (err: Error) => this.notificaciones.error('No se pudo eliminar el registro: ' + err.message),
    });
  }

  reactivar(h: HistorialClinico): void {
    const paciente = this.nombrePaciente(h.idPaciente);
    if (!confirm(`¿Reactivar el registro clínico de "${paciente}"?`)) {
      return;
    }
    this.expedienteService.ReactivarExpediente(h.idHistorial).subscribe({
      next: () => {
        this.eliminados.update((l) => l.filter((x) => x.idHistorial !== h.idHistorial));
        this.cargarActivos();
        this.notificaciones.exito(`Registro clínico de "${paciente}" reactivado correctamente`);
      },
      error: (err: Error) => this.notificaciones.error('No se pudo reactivar el registro: ' + err.message),
    });
  }
}