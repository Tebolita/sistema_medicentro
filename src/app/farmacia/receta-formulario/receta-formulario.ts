import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RecetaDetalle } from '../../models';
import { BitacoraItem, RecetaCompleta, RecetaInput, RecetasService } from '../../service/recetas.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { ESTADOS_RECETA } from '../farmacia-catalogos';
import { PacientesService } from '../../service/pacientes.service';
import { MedicosService } from '../../service/medicos.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

@Component({
  selector: 'app-receta-formulario',
  imports: [
    NgClass,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './receta-formulario.html',
  styleUrl: './receta-formulario.css',
})
export class RecetaFormulario {
  private fb = inject(FormBuilder);
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recetasService = inject(RecetasService);
  private pacientesService = inject(PacientesService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  pacientes = this.pacientesService.directorio;
  private medicosService = inject(MedicosService);
  medicos = this.medicosService.listar;
  private medicamentosService = inject(MedicamentosService);
  medicamentos = this.medicamentosService.listar;

  // ESTADO_RECETA real si el catálogo existe en la base; si no, se usa la
  // lista de ejemplo (mismos ids 1/2/3 que ya asume el backend por defecto).
  private catalogos = inject(CatalogosService);
  private estadosRecetaApi = this.catalogos.obtener('ESTADO_RECETA');
  estadosReceta = computed(() => {
    const api = this.estadosRecetaApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_RECETA;
  });

  idReceta = signal(0);
  esNueva = computed(() => this.idReceta() === 0);

  cabecera = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedico: this.fb.control<number | null>(null, Validators.required),
    idEstadoReceta: [1, Validators.required],
  });

  detalles = this.fb.array<ReturnType<typeof this.crearDetalleGroup>>([]);

  guardando = signal(false);
  errorMsg = signal('');
  private fechaEmisionOriginal: string | null = null;

  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);

  constructor() {
    afterNextRender(() => this.medicamentosService.cargar());
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      // Edición: se trae la receta del backend (sirve también al recargar la página).
      this.recetasService.obtener(Number(idParam)).subscribe({
        next: (registro) => this.cargar(registro),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
      return;
    }
    this.agregarDetalle();
  }

  private crearDetalleGroup(d?: RecetaDetalle) {
    return this.fb.nonNullable.group({
      id: d?.idRecetaDetalle ?? 0,
      idMedicamento: this.fb.control<number | null>(d?.idMedicamento ?? null, Validators.required),
      dosis: [d?.dosis ?? '', Validators.required],
      frecuencia: [d?.frecuencia ?? '', Validators.required],
      // Indicaciones queda opcional (son notas libres extra); duración sí se
      // exige porque es un dato clínico mínimo (cuánto tiempo tomarlo).
      duracion: [d?.duracion ?? '', Validators.required],
      indicaciones: [d?.indicaciones ?? ''],
    });
  }

  agregarDetalle(): void {
    this.detalles.push(this.crearDetalleGroup());
  }

  quitarDetalle(index: number): void {
    this.detalles.removeAt(index);
  }

  private cargar(registro: RecetaCompleta): void {
    this.idReceta.set(registro.receta.idReceta);
    this.fechaEmisionOriginal = registro.receta.fechaEmision;
    this.cabecera.patchValue({
      idPaciente: registro.receta.idPaciente,
      idMedico: registro.receta.idMedico,
      idEstadoReceta: registro.receta.idEstadoReceta,
    });
    registro.detalles.forEach((d) => this.detalles.push(this.crearDetalleGroup(d)));
  }

  guardar(): void {
    this.cabecera.markAllAsTouched();
    this.detalles.markAllAsTouched();
    if (this.cabecera.invalid || this.detalles.invalid || this.detalles.length === 0) {
      return;
    }

    const cab = this.cabecera.getRawValue();
    const idReceta = this.idReceta();

    const receta: RecetaInput = {
      idTratamiento: null,
      idPaciente: cab.idPaciente!,
      idMedico: cab.idMedico!,
      fechaEmision: this.fechaEmisionOriginal ?? new Date().toISOString(),
      firmaDigitalHash: null,
      firmaDigitalUrl: null,
      idEstadoReceta: cab.idEstadoReceta,
      // idRecetaDetalle 0 = línea nueva; el backend da de baja las que no vengan.
      detalles: this.detalles.getRawValue().map((d) => ({
        idRecetaDetalle: d.id,
        idMedicamento: d.idMedicamento!,
        dosis: d.dosis,
        frecuencia: d.frecuencia,
        duracion: d.duracion || null,
        indicaciones: d.indicaciones || null,
      })),
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNueva()
      ? this.recetasService.crear(receta)
      : this.recetasService.actualizar(idReceta, receta);
    peticion.subscribe({
      next: () => {
        this.notificaciones.exito(this.esNueva() ? 'Creado correctamente' : 'Actualizado correctamente');
        this.router.navigate(['/home/farmacia/recetas']);
      },
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }

  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idReceta();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.recetasService.RetornarBitacoraPorRegistro('recetas', id).subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al cargar bitácora:', err.status);
        this.cargandoHistorial.set(false);
        this.notificaciones.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorial(): void {
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

  formatFechaHora(iso: string): string {
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

  camposCambiados(item: BitacoraItem): Array<{ campo: string; antes: string; despues: string }> {
    try {
      const antes = item.valoresAnteriores ? JSON.parse(item.valoresAnteriores) : {};
      const despues = item.valoresNuevos ? JSON.parse(item.valoresNuevos) : {};

      const camposIgnorados = new Set([
        'IdUsuarioModificacion',
        'FechaModificacion',
        'IdUsuarioCreacion',
      ]);

      const idRegistroReal = this.idReceta();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdReceta' && idRegistroReal != null) {
          a = idRegistroReal;
          d = idRegistroReal;
        }

        if (JSON.stringify(a) === JSON.stringify(d)) continue;

        cambios.push({
          campo: this.formatearNombreCampo(k),
          antes: this.formatearValor(a, k),
          despues: this.formatearValor(d, k),
        });
      }

      cambios.sort((x, y) => {
        if (x.campo.toLowerCase().includes('id receta')) return -1;
        if (y.campo.toLowerCase().includes('id receta')) return 1;
        return x.campo.localeCompare(y.campo);
      });

      return cambios;
    } catch {
      return [];
    }
  }

  private formatearNombreCampo(campo: string): string {
    return campo
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  private formatearValor(valor: any, nombreCampo: string = ''): string {
    if (valor === null || valor === undefined) return '—';

    if (this.esCampoFecha(nombreCampo) && typeof valor === 'string') {
      const fecha = new Date(valor);
      if (!isNaN(fecha.getTime())) {
        return fecha.toLocaleString('es-GT', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  }

  private esCampoFecha(nombreCampo: string): boolean {
    return /fecha|fechahora|creacion|modificacion/i.test(nombreCampo);
  }
}
