import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  BitacoraItem,
  DIAS_SEMANA,
  Disponibilidad,
  DisponibilidadInput,
  DisponibilidadesService,
  UsuarioOpcion,
} from '../../service/disponibilidades.service';
import { MedicosService } from '../../service/medicos.service';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

@Component({
  selector: 'app-disponibilidad-formulario',
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
    AuditoriaInfo,
  ],
  templateUrl: './disponibilidad-formulario.html',
  styleUrl: './disponibilidad-formulario.css',
})
export class DisponibilidadFormulario {
  private fb = inject(FormBuilder);
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private disponibilidadesService = inject(DisponibilidadesService);
  private medicosService = inject(MedicosService);
  private notificaciones = inject(NotificacionesService);

  medicos = this.medicosService.listar;
  dias = DIAS_SEMANA;

  idDisponibilidad = signal(0);
  esNueva = computed(() => this.idDisponibilidad() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Disponibilidad | null>(null);

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================
  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  form = this.fb.nonNullable.group({
    idMedico: this.fb.control<number | null>(null, Validators.required),
    idDiaSemana: this.fb.control<number | null>(null, Validators.required),
    horaInicio: ['', Validators.required], // input type="time" (HH:mm)
    horaFin: ['', Validators.required],
  });

  constructor() {
    afterNextRender(() => this.medicosService.cargar());

    this.disponibilidadesService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err) => {
        console.error('❌ [DisponibilidadFormulario] Error usuarios:', err);
      },
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.disponibilidadesService.obtenerPorId(Number(idParam)).subscribe({
        next: (d) => this.cargar(d),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(d: Disponibilidad): void {
    this.idDisponibilidad.set(d.idDisponibilidad);
    this.registro.set(d);
    this.form.patchValue({
      idMedico: d.idMedico,
      idDiaSemana: d.idDiaSemana,
      horaInicio: d.horaInicio.slice(0, 5),
      horaFin: d.horaFin.slice(0, 5),
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    if (v.horaFin <= v.horaInicio) {
      this.errorMsg.set('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    const input: DisponibilidadInput = {
      idMedico: v.idMedico!,
      idDiaSemana: v.idDiaSemana!,
      horaInicio: `${v.horaInicio}:00`,
      horaFin: `${v.horaFin}:00`,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNueva()
      ? this.disponibilidadesService.crear(input)
      : this.disponibilidadesService.actualizar(this.idDisponibilidad(), input);
    peticion.subscribe({
      next: () => {
        this.notificaciones.exito(this.esNueva() ? 'Creado correctamente' : 'Actualizado correctamente');
        this.router.navigate(['/home/mantenimiento/disponibilidad-medicos']);
      },
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idDisponibilidad();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.disponibilidadesService
      .RetornarBitacoraPorRegistro('disponibilidad_medico', id)
      .subscribe({
        next: (items) => {
          this.bitacoraSignal.set(items);
          this.cargandoHistorial.set(false);
        },
        error: (err) => {
          console.error('❌ Error al cargar bitácora:', err);
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

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario ${idUsuario}`;
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

      const idRegistroReal = this.idDisponibilidad();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdDisponibilidad' && idRegistroReal != null) {
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
        if (x.campo.toLowerCase().includes('id disponibilidad')) return -1;
        if (y.campo.toLowerCase().includes('id disponibilidad')) return 1;
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
