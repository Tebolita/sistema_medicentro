import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import {
  BitacoraItem,
  CompromisoPago,
  CompromisosPagoService,
  MedicoOpcion,
  OpcionCatalogo,
  UsuarioOpcion,
} from '../compromisos-pago.service';
import { TIPO_CONSENTIMIENTO_COMPROMISO_PAGO } from '../emergencias-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

/**
 * Toma un Date del datepicker y le añade la HORA ACTUAL.
 * Devuelve algo como "2026-10-06T17:52:30".
 */
function toIsoDateTime(value: Date | string | null): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  const ahora = new Date();
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  const hh = String(ahora.getHours()).padStart(2, '0');
  const mm = String(ahora.getMinutes()).padStart(2, '0');
  const ss = String(ahora.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
}

function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

@Component({
  selector: 'app-compromiso-formulario',
  imports: [
    NgClass,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './compromiso-formulario.html',
  styleUrl: './compromiso-formulario.css',
})
export class CompromisoFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private compromisosService = inject(CompromisosPagoService);
  private pacientesService = inject(PacientesService);

  pacientes = this.pacientesService.directorio;

  medicosSignal = signal<MedicoOpcion[]>([]);
  parentescosSignal = signal<OpcionCatalogo[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  idConsentimiento = signal(0);
  esNuevo = computed(() => this.idConsentimiento() === 0);

  guardando = signal(false);
  errorGuardar = signal<string | null>(null);

  // ============================================================
  // Historial de auditoría
  // ============================================================
  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedicoResponsable: this.fb.control<number | null>(null, Validators.required),
    nombreResponsable: ['', Validators.required],
    idParentescoResponsable: this.fb.control<number | null>(null, Validators.required),
    telefonoResponsable: ['', Validators.required],
    fechaFirma: this.fb.control<Date | null>(null),
    idEstadoConsentimiento: this.fb.control<number | null>(null, Validators.required),
  });

  constructor() {
    this.compromisosService.RetornarMedicos().subscribe({
      next: (m) => {
        console.log('✅ [CompromisoFormulario] Médicos cargados:', m.length);
        this.medicosSignal.set(m);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisoFormulario] Error médicos:', err.status),
    });

    this.compromisosService.RetornarParentescos().subscribe({
      next: (p) => {
        console.log('✅ [CompromisoFormulario] Parentescos cargados:', p.length);
        this.parentescosSignal.set(p);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisoFormulario] Error parentescos:', err.status),
    });

    this.compromisosService.RetornarEstadosConsentimiento().subscribe({
      next: (e) => {
        console.log('✅ [CompromisoFormulario] Estados cargados:', e.length);
        this.estadosSignal.set(e);
        if (this.esNuevo() && e.length > 0 && !this.form.controls.idEstadoConsentimiento.value) {
          const pendiente =
            e.find((x) => x.label.toLowerCase().includes('pendiente')) ?? e[0];
          this.form.patchValue({ idEstadoConsentimiento: pendiente.id });
        }
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisoFormulario] Error estados:', err.status),
    });

    // Cargar usuarios (para el nombre en la bitácora)
    this.compromisosService.RetornarUsuarios().subscribe({
      next: (u) => {
        console.log('✅ [CompromisoFormulario] Usuarios cargados:', u.length);
        this.usuariosSignal.set(u);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisoFormulario] Error usuarios:', err.status),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      const id = Number(idParam);
      const registro = this.compromisosService.obtener(id);
      if (registro) {
        this.cargar(registro);
      } else {
        this.compromisosService.obtenerDesdeApi(id).subscribe({
          next: (reg) => this.cargar(reg),
          error: (err: HttpErrorResponse) =>
            console.error('No se pudo cargar el compromiso', err),
        });
      }
    } else {
      const idPacienteParam = this.route.snapshot.queryParamMap.get('paciente');
      if (idPacienteParam) {
        this.form.patchValue({ idPaciente: Number(idPacienteParam) });
      }
    }
  }

  private cargar(registro: CompromisoPago): void {
    this.idConsentimiento.set(registro.consentimiento.idConsentimiento);
    this.form.patchValue({
      idPaciente: registro.consentimiento.idPaciente,
      idMedicoResponsable: registro.consentimiento.idMedicoResponsable,
      nombreResponsable: registro.nombreResponsable,
      idParentescoResponsable: registro.idParentescoResponsable,
      telefonoResponsable: registro.telefonoResponsable,
      fechaFirma: registro.consentimiento.fechaFirma
        ? parseIsoDateLocal(registro.consentimiento.fechaFirma)
        : null,
      idEstadoConsentimiento: registro.consentimiento.idEstadoConsentimiento,
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    const idConsentimiento = this.idConsentimiento();

    const registro: CompromisoPago = {
      consentimiento: {
        idConsentimiento,
        idPaciente: v.idPaciente!,
        idTipoConsentimiento: TIPO_CONSENTIMIENTO_COMPROMISO_PAGO,
        idTratamiento: null,
        idMedicoResponsable: v.idMedicoResponsable!,
        idTestigo: null,
        fechaFirma: toIsoDateTime(v.fechaFirma),
        firmaDigitalHash: null,
        firmaDigitalUrl: null,
        idEstadoConsentimiento: v.idEstadoConsentimiento!,
        activo: true,
        fechaCreacion: this.esNuevo()
          ? new Date().toISOString()
          : (this.compromisosService.obtener(idConsentimiento)?.consentimiento.fechaCreacion
              ?? new Date().toISOString()),
        fechaModificacion: this.esNuevo() ? null : new Date().toISOString(),
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      nombreResponsable: v.nombreResponsable,
      idParentescoResponsable: v.idParentescoResponsable!,
      telefonoResponsable: v.telefonoResponsable,
    };

    this.guardando.set(true);
    this.errorGuardar.set(null);

    this.compromisosService.guardar(registro).subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigate(['/home/emergencias/compromisos']);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorGuardar.set(
          err.status === 401
            ? 'Tu sesión expiró. Cierra sesión y vuelve a iniciarla.'
            : 'No se pudo guardar el compromiso. Revisa la consola.',
        );
        console.error('Error al guardar compromiso:', err);
      },
    });
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idConsentimiento();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.compromisosService
      .RetornarBitacoraPorRegistro('consentimientos_informados', id)
      .subscribe({
        next: (items) => {
          this.bitacoraSignal.set(items);
          this.cargandoHistorial.set(false);
        },
        error: (err: HttpErrorResponse) => {
          console.error('❌ Error al cargar bitácora:', err.status);
          this.cargandoHistorial.set(false);
        },
      });
  }

  cerrarHistorial(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  /** Traduce el id_tipo_accion a texto legible. */
  accionLabel(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'Creó';
    if (idTipoAccion === 80) return 'Modificó';
    if (idTipoAccion === 81) return 'Eliminó';
    return 'Cambió';
  }

  /** Clase CSS según el tipo de acción. */
  accionClase(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'accion-crear';
    if (idTipoAccion === 80) return 'accion-modificar';
    if (idTipoAccion === 81) return 'accion-eliminar';
    return 'accion-default';
  }

  /** Icono Material según el tipo de acción. */
  accionIcono(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'add_circle';
    if (idTipoAccion === 80) return 'edit';
    if (idTipoAccion === 81) return 'delete';
    return 'history';
  }

  /** Traduce el id de usuario a nombre. */
  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario ${idUsuario}`;
  }

    formatFechaHora(iso: string): string {
    if (!iso) return '—';
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';  // ← AGREGAR ESTA LÍNEA
    const fecha = new Date(isoConZona);                        // ← CAMBIAR esto
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** Devuelve la lista de campos que cambiaron entre valoresAnteriores y valoresNuevos. */
  camposCambiados(item: BitacoraItem): Array<{ campo: string; antes: string; despues: string }> {
    try {
      const antes = item.valoresAnteriores ? JSON.parse(item.valoresAnteriores) : {};
      const despues = item.valoresNuevos ? JSON.parse(item.valoresNuevos) : {};

      const camposIgnorados = new Set([
        'IdUsuarioModificacion',
        'FechaModificacion',
        'IdUsuarioCreacion',
      ]);

      const idRegistroReal = this.idConsentimiento();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        // Parche: el backend guarda mal el IdConsentimiento. Usamos el ID real.
        if (k === 'IdConsentimiento' && idRegistroReal != null) {
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

      // Ordenar para que el ID quede primero
      cambios.sort((x, y) => {
        if (x.campo.toLowerCase().includes('id consentimiento')) return -1;
        if (y.campo.toLowerCase().includes('id consentimiento')) return 1;
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
      const fecha = new Date(valor);  // ← SIN la Z (correcto, ya está en local)
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