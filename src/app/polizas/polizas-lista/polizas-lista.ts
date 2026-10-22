import { esSinPermiso } from '../../service/error.service';
import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, ElementRef, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { listaOpcional } from '../../shared/lista-opcional';
import { MENU_SECTIONS } from '../../shared/menu-data';

import { PolizaService, BitacoraItem } from '../../service/poliza.service';
import { AseguradoraService } from '../../service/aseguradora.service';
import { PacienteService } from '../../service/paciente.service';
import { CatalogoService } from '../../service/catalogo.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { PolizaSeguro, AseguradoraListado } from '../../models/seguro.model';
import { PacienteListado } from '../../models/paciente.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-polizas-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './polizas-lista.html',
  styleUrl: './polizas-lista.css',
})
export class PolizasLista {
  private polizaService = inject(PolizaService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private aseguradoraService = inject(AseguradoraService);
  private pacienteService = inject(PacienteService);
  private catalogoService = inject(CatalogoService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  // ============================================================
  // Historial general de Pólizas
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  // Pestaña activa: pólizas activas o dadas de baja.
  vista = signal<Vista>('activas');
  cargando = signal(false);
  errorCarga = signal('');

  // "Copago consulta / hospital" y "Gestión seguro Mi Cope" ya tienen su
  // propia ruta (lista y registro); acá solo queda "Validación Mediprocesos",
  // que enfoca el buscador en vez de repetir la misma vista general.
  opcionesSeguros = (MENU_SECTIONS.find((s) => s.slug === 'seguros-medicos')?.items ?? []).filter(
    (item) => item.route !== '/home/polizas' || item.queryParams,
  );

  // Datos reales desde la API.
  private lista = signal<PolizaSeguro[]>([]);
  private eliminadas = signal<PolizaSeguro[]>([]);
  private eliminadasCargadas = false;
  // Pacientes activos y eliminados: una póliza (sobre todo una eliminada)
  // puede pertenecer a un paciente dado de baja y aun así debe mostrar su nombre.
  private pacientesApi = signal<PacienteListado[]>([]);
  private aseguradoras = signal<AseguradoraListado[]>([]);
  private ramos = signal<CatalogoOpcion[]>([]);
  private estados = signal<CatalogoOpcion[]>([]);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
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
      polizas: this.polizaService.RetornarPolizas(),
      pacientes: this.pacienteService.RetornarPacientes(),
      pacientesEliminados: this.pacienteService.RetornarPacientesEliminados().pipe(listaOpcional()),
      aseguradoras: this.aseguradoraService.RetornarAseguradoras(),
      ramos: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.RAMO_SEGURO),
      estados: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.ESTADO_POLIZA),
    }).subscribe({
      next: (r) => {
        this.lista.set(r.polizas.datos ?? []);
        this.pacientesApi.set([...(r.pacientes.datos ?? []), ...(r.pacientesEliminados.datos ?? [])]);
        this.aseguradoras.set(r.aseguradoras.datos ?? []);
        this.ramos.set(r.ramos.datos ?? []);
        this.estados.set(r.estados.datos ?? []);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.errorCarga.set('No se pudieron cargar las pólizas: ' + err.message);
      },
    });
  }

  private cargarActivas(): void {
    this.polizaService.RetornarPolizas().subscribe({
      next: (resp) => this.lista.set(resp.datos ?? []),
      error: (err: Error) => this.errorCarga.set('No se pudieron cargar las pólizas: ' + err.message),
    });
  }

  private cargarEliminadas(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.polizaService.RetornarPolizasEliminadas().subscribe({
      next: (resp) => {
        this.eliminadas.set(resp.datos ?? []);
        this.eliminadasCargadas = true;
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        // Sin acceso a lo eliminado: se muestra el mensaje de "no hay registros".
        if (esSinPermiso(err)) {
          this.eliminadas.set([]);
          return;
        }
        this.errorCarga.set('No se pudieron cargar las pólizas eliminadas: ' + err.message);
      },
    });
  }

  verActivas(): void {
    // El error de la pestaña "Eliminadas" no aplica a las activas.
    this.errorCarga.set('');
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.eliminadasCargadas) {
      this.cargarEliminadas();
    }
  }

  polizas = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activas' ? this.lista() : this.eliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((p) =>
      [this.nombrePaciente(p.idPaciente), this.aseguradoraLabel(p.idAseguradora), p.numeroPoliza, p.codigoAutorizacion]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

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

  aseguradoraLabel(idAseguradora: number): string {
    return this.aseguradoras().find((a) => a.idAseguradora === idAseguradora)?.nombre ?? '—';
  }

  ramoLabel(idRamo: number): string {
    return this.ramos().find((r) => r.id === idRamo)?.nombre ?? '—';
  }

  estadoLabel(idEstadoPoliza: number): string {
    return this.estados().find((e) => e.id === idEstadoPoliza)?.nombre ?? '—';
  }

  // Se compara por código (VIGENTE/VENCIDA/SUSPENDIDA): los ids dependen de cada base.
  estadoClase(idEstadoPoliza: number): string {
    const codigo = this.estados().find((e) => e.id === idEstadoPoliza)?.codigo;
    if (codigo === 'VENCIDA') return 'estado-vencida';
    if (codigo === 'SUSPENDIDA') return 'estado-suspendida';
    return 'estado-vigente';
  }

  copagoTexto(porcentaje: number | null, monto: number | null): string {
    if (porcentaje != null) return `${porcentaje}% copago`;
    if (monto != null) return `Q${monto.toFixed(2)} copago`;
    return 'Sin copago definido';
  }

  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  formatFecha(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  eliminar(p: PolizaSeguro): void {
    const paciente = this.nombrePaciente(p.idPaciente);
    if (!confirm(`¿Eliminar la póliza ${p.numeroPoliza} de "${paciente}"?`)) {
      return;
    }
    this.polizaService.EliminarPoliza(p.idPoliza).subscribe({
      next: () => {
        this.lista.update((l) => l.filter((x) => x.idPoliza !== p.idPoliza));
        // Se vuelve a pedir la lista de eliminadas la próxima vez que se abra
        // la pestaña, para traer quién y cuándo la dio de baja.
        this.eliminadasCargadas = false;
        this.notificaciones.exito(`Póliza ${p.numeroPoliza} eliminada correctamente`);
      },
      error: (err: Error) => this.notificaciones.error('No se pudo eliminar la póliza: ' + err.message),
    });
  }

  reactivar(p: PolizaSeguro): void {
    const paciente = this.nombrePaciente(p.idPaciente);
    if (!confirm(`¿Reactivar la póliza ${p.numeroPoliza} de "${paciente}"?`)) {
      return;
    }
    this.polizaService.ReactivarPoliza(p.idPoliza).subscribe({
      next: () => {
        this.eliminadas.update((l) => l.filter((x) => x.idPoliza !== p.idPoliza));
        this.cargarActivas();
        this.notificaciones.exito(`Póliza ${p.numeroPoliza} reactivada correctamente`);
      },
      error: (err: Error) => this.notificaciones.error('No se pudo reactivar la póliza: ' + err.message),
    });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.polizaService.RetornarBitacoraGeneral('polizas_seguro').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora pólizas:', err);
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
    if (tabla === 'polizas_seguro') return 'Póliza';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'polizas_seguro') return 'policy';
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