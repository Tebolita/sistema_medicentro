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
import { BitacoraItem, Interaccion, InteraccionInput, InteraccionesService } from '../../service/interacciones.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

// Mismos códigos/ids de ejemplo que ya usa Pacientes para 'SEVERIDAD'
// (pacientes-catalogos.ts) — de respaldo mientras ese catálogo no haya
// corrido todavía contra la base (ya se agregó a sembrar_catalogos.sql).
const SEVERIDADES_EJEMPLO = [
  { id: 1, label: 'Leve' },
  { id: 2, label: 'Moderada' },
  { id: 3, label: 'Severa' },
];

@Component({
  selector: 'app-interaccion-formulario',
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
  templateUrl: './interaccion-formulario.html',
  styleUrl: './interaccion-formulario.css',
})
export class InteraccionFormulario {
  private fb = inject(FormBuilder);
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private interaccionesService = inject(InteraccionesService);
  private medicamentosService = inject(MedicamentosService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  medicamentos = this.medicamentosService.listar;

  private catalogos = inject(CatalogosService);
  private severidadApi = this.catalogos.obtener('SEVERIDAD');
  severidades = computed(() => {
    const api = this.severidadApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : SEVERIDADES_EJEMPLO;
  });

  idInteraccion = signal(0);
  esNueva = computed(() => this.idInteraccion() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Interaccion | null>(null);

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================
  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);

  form = this.fb.nonNullable.group({
    idMedicamento1: this.fb.control<number | null>(null, Validators.required),
    idMedicamento2: this.fb.control<number | null>(null, Validators.required),
    idNivelSeveridad: this.fb.control<number | null>(null, Validators.required),
    descripcion: ['', Validators.required],
  });

  constructor() {
    afterNextRender(() => this.medicamentosService.cargar());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.interaccionesService.obtenerPorId(Number(idParam)).subscribe({
        next: (i) => this.cargar(i),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(i: Interaccion): void {
    this.idInteraccion.set(i.idInteraccion);
    this.registro.set(i);
    this.form.patchValue({
      idMedicamento1: i.idMedicamento1,
      idMedicamento2: i.idMedicamento2,
      idNivelSeveridad: i.idNivelSeveridad,
      descripcion: i.descripcion,
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    if (v.idMedicamento1 === v.idMedicamento2) {
      this.errorMsg.set('Un medicamento no puede interactuar consigo mismo.');
      return;
    }
    const input: InteraccionInput = {
      idMedicamento1: v.idMedicamento1!,
      idMedicamento2: v.idMedicamento2!,
      idNivelSeveridad: v.idNivelSeveridad!,
      descripcion: v.descripcion.trim(),
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNueva()
      ? this.interaccionesService.crear(input)
      : this.interaccionesService.actualizar(this.idInteraccion(), input);
    peticion.subscribe({
      next: () => {
        this.notificaciones.exito(this.esNueva() ? 'Creado correctamente' : 'Actualizado correctamente');
        this.router.navigate(['/home/mantenimiento/interacciones']);
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
    const id = this.idInteraccion();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.interaccionesService.RetornarBitacoraPorRegistro('interaccion_medicamentos', id).subscribe({
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

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    return this.usuariosService.obtener(idUsuario)?.nombreUsuario ?? `Usuario ${idUsuario}`;
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

      const idRegistroReal = this.idInteraccion();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdInteraccion' && idRegistroReal != null) {
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
        if (x.campo.toLowerCase().includes('id interaccion')) return -1;
        if (y.campo.toLowerCase().includes('id interaccion')) return 1;
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
