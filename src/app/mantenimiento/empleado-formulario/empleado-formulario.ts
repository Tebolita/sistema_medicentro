import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, Empleado, EmpleadoInput, EmpleadosService } from '../../service/empleados.service';
import { PuestosService } from '../../service/puestos.service';
import { EspecialidadesService } from '../../service/especialidades.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { GENEROS, TIPOS_DOCUMENTO, ESTADOS_EMPLEADO } from '../empleados-catalogos';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

@Component({
  selector: 'app-empleado-formulario',
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
  templateUrl: './empleado-formulario.html',
  styleUrl: './empleado-formulario.css',
})
export class EmpleadoFormulario {
  private fb = inject(FormBuilder);
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empleadosService = inject(EmpleadosService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  puestosService = inject(PuestosService);
  puestos = this.puestosService.listar;
  especialidadesService = inject(EspecialidadesService);
  especialidades = this.especialidadesService.listar;

  // Igual que en otros formularios: valores reales del catálogo si existen
  // en la base, si no, la lista de ejemplo.
  private catalogos = inject(CatalogosService);
  private generosApi = this.catalogos.obtener('GENERO');
  generos = computed(() => {
    const api = this.generosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : GENEROS;
  });
  private tiposDocumentoApi = this.catalogos.obtener('TIPO_DOCUMENTO');
  tiposDocumento = computed(() => {
    const api = this.tiposDocumentoApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_DOCUMENTO;
  });
  private estadosApi = this.catalogos.obtener('ESTADO_EMPLEADO');
  estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_EMPLEADO;
  });

  idEmpleado = signal(0);
  esNuevo = computed(() => this.idEmpleado() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Empleado | null>(null);

  form = this.fb.nonNullable.group({
    primerNombre: ['', Validators.required],
    segundoNombre: [''],
    primerApellido: ['', Validators.required],
    segundoApellido: [''],
    fechaNacimiento: [''], // input type="date" (yyyy-MM-dd)
    idGenero: this.fb.control<number | null>(null),
    idTipoDocumento: this.fb.control<number | null>(null),
    numeroDocumento: [''],
    idPuesto: this.fb.control<number | null>(null, Validators.required),
    idEspecialidad: this.fb.control<number | null>(null),
    colegiado: [''],
    fechaIngreso: ['', Validators.required],
    fechaEgreso: [''],
    idEstadoEmpleado: this.fb.control<number | null>(null, Validators.required),
    telefono: [''],
    correo: ['', Validators.email],
    direccion: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.empleadosService.obtenerPorId(Number(idParam)).subscribe({
        next: (e) => this.cargar(e),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(e: Empleado): void {
    this.idEmpleado.set(e.idEmpleado);
    this.registro.set(e);
    this.form.patchValue({
      primerNombre: e.primerNombre,
      segundoNombre: e.segundoNombre ?? '',
      primerApellido: e.primerApellido,
      segundoApellido: e.segundoApellido ?? '',
      fechaNacimiento: e.fechaNacimiento?.slice(0, 10) ?? '',
      idGenero: e.idGenero,
      idTipoDocumento: e.idTipoDocumento,
      numeroDocumento: e.numeroDocumento ?? '',
      idPuesto: e.idPuesto,
      idEspecialidad: e.idEspecialidad,
      colegiado: e.colegiado ?? '',
      fechaIngreso: e.fechaIngreso.slice(0, 10),
      fechaEgreso: e.fechaEgreso?.slice(0, 10) ?? '',
      idEstadoEmpleado: e.idEstadoEmpleado,
      telefono: e.telefono ?? '',
      correo: e.correo ?? '',
      direccion: e.direccion ?? '',
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: EmpleadoInput = {
      primerNombre: v.primerNombre.trim(),
      segundoNombre: v.segundoNombre.trim() || null,
      primerApellido: v.primerApellido.trim(),
      segundoApellido: v.segundoApellido.trim() || null,
      fechaNacimiento: v.fechaNacimiento || null,
      idGenero: v.idGenero,
      idTipoDocumento: v.idTipoDocumento,
      numeroDocumento: v.numeroDocumento.trim() || null,
      idPuesto: v.idPuesto!,
      idEspecialidad: v.idEspecialidad,
      colegiado: v.colegiado.trim() || null,
      fechaIngreso: v.fechaIngreso,
      fechaEgreso: v.fechaEgreso || null,
      idEstadoEmpleado: v.idEstadoEmpleado!,
      telefono: v.telefono.trim() || null,
      correo: v.correo.trim() || null,
      direccion: v.direccion.trim() || null,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNuevo()
      ? this.empleadosService.crear(input)
      : this.empleadosService.actualizar(this.idEmpleado(), input);
    peticion.subscribe({
      next: () => {
        this.notificaciones.exito(this.esNuevo() ? 'Creado correctamente' : 'Actualizado correctamente');
        this.router.navigate(['/home/mantenimiento/empleados']);
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

  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);

  abrirHistorial(): void {
    const id = this.idEmpleado();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.empleadosService.RetornarBitacoraPorRegistro('empleados', id).subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter((b) => this.camposCambiados(b).length > 0));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
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
    const u = this.usuariosService.obtener(idUsuario);
    return u?.nombreUsuario ?? `Usuario ${idUsuario}`;
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

      const idRegistroReal = this.idEmpleado();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdEmpleado' && idRegistroReal != null) {
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
        if (x.campo.toLowerCase().includes('id empleado')) return -1;
        if (y.campo.toLowerCase().includes('id empleado')) return 1;
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
