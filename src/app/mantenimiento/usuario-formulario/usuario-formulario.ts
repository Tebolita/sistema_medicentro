import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, Usuario, UsuarioRol, UsuariosService } from '../../service/usuarios.service';
import { EmpleadosService } from '../../service/empleados.service';
import { RolesService } from '../../service/roles.service';
import { CatalogosService } from '../../service/catalogos.service';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { cambiosBitacora, idEnBitacora } from '../../shared/bitacora-cambios';
import { forkJoin } from 'rxjs';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

const ESTADOS_USUARIO_EJEMPLO = [
  { id: 1, label: 'Activo' },
  { id: 2, label: 'Bloqueado' },
  { id: 3, label: 'Inactivo' },
];

@Component({
  selector: 'app-usuario-formulario',
  imports: [
    NgClass,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    AuditoriaInfo,
  ],
  templateUrl: './usuario-formulario.html',
  styleUrl: './usuario-formulario.css',
})
export class UsuarioFormulario {
  private fb = inject(FormBuilder);
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usuariosService = inject(UsuariosService);
  private rolesService = inject(RolesService);
  private notificaciones = inject(NotificacionesService);

  empleadosService = inject(EmpleadosService);
  empleados = this.empleadosService.listar;
  roles = this.rolesService.listar;

  private catalogos = inject(CatalogosService);
  private confirmacion = inject(ConfirmacionService);
  private estadosApi = this.catalogos.obtener('ESTADO_USUARIO');
  estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_USUARIO_EJEMPLO;
  });

  idUsuario = signal(0);
  esNuevo = computed(() => this.idUsuario() === 0);

  // idEmpleado -> nombre de la OTRA cuenta activa que ya lo tiene. Un
  // empleado solo puede tener un usuario (su código sirve para iniciar
  // sesión); el backend también lo valida.
  empleadosOcupados = computed(() => {
    const mapa = new Map<number, string>();
    for (const u of this.usuariosService.listar()) {
      if (u.idEmpleado != null && u.idUsuario !== this.idUsuario()) {
        mapa.set(u.idEmpleado, u.nombreUsuario);
      }
    }
    return mapa;
  });
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Usuario | null>(null);

  form = this.fb.nonNullable.group({
    nombreUsuario: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    // Solo aplica al crear; el backend no deja cambiar la contraseña desde
    // el formulario de edición general (es una acción aparte, "reset").
    contrasena: [''],
    idEmpleado: this.fb.control<number | null>(null),
    idEstadoUsuario: this.fb.control<number | null>(null, Validators.required),
    requiereCambioPassword: [true],
  });

  // --- Roles asignados (solo en edición) ---
  rolesAsignados = signal<UsuarioRol[]>([]);
  cargandoRoles = signal(false);
  errorRoles = signal('');
  rolParaAsignar = signal<number | null>(null);

  rolesDisponibles = computed(() => {
    const asignados = new Set(this.rolesAsignados().map((r) => r.idRol));
    return this.roles().filter((r) => !asignados.has(r.idRol));
  });

  // --- Resetear contraseña (solo en edición; es el admin reseteando la de
  // otro usuario, no el propio usuario cambiando la suya — eso es "Mi
  // cuenta"). El backend no pide ni verifica la contraseña actual. ---
  resetForm = this.fb.nonNullable.group({
    contrasenaNueva: ['', [Validators.required, Validators.minLength(6)]],
    repetirContrasenaNueva: ['', Validators.required],
    requiereCambioPassword: [true],
  });
  guardandoReset = signal(false);
  errorReset = signal('');

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    this.resetForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.validarCoincidenciaReset());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      this.form.controls.contrasena.clearValidators();
      // Edición: se trae del backend (sirve también al recargar la página).
      this.usuariosService.obtenerPorId(Number(idParam)).subscribe({
        next: (u) => this.cargar(u),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    } else {
      this.form.controls.contrasena.setValidators([Validators.required, Validators.minLength(6)]);
    }
    this.form.controls.contrasena.updateValueAndValidity();

    afterNextRender(() => {
      this.empleadosService.cargar();
      this.usuariosService.cargar();
      // RolesService ya es reactivo (rolesDisponibles se recalcula solo
      // cuando cambia su lista), pero si este singleton se cargó UNA vez al
      // arrancar la app (p. ej. para el menú) y luego se crean roles nuevos,
      // acá se refresca para no depender de que esa carga inicial siga
      // vigente — mismo patrón que en convenios-lista/aseguradoras.
      this.rolesService.cargar();
    });
  }

  private cargar(u: Usuario): void {
    this.idUsuario.set(u.idUsuario);
    this.registro.set(u);
    this.form.patchValue({
      nombreUsuario: u.nombreUsuario,
      correo: u.correo,
      idEmpleado: u.idEmpleado,
      idEstadoUsuario: u.idEstadoUsuario,
      requiereCambioPassword: u.requiereCambioPassword,
    });
    this.cargarRoles();
  }

  private cargarRoles(): void {
    this.cargandoRoles.set(true);
    this.errorRoles.set('');
    this.usuariosService.listarRoles(this.idUsuario()).subscribe({
      next: (roles) => {
        this.rolesAsignados.set(roles.filter((r) => r.activo));
        this.cargandoRoles.set(false);
      },
      error: (err: Error) => {
        this.errorRoles.set(err.message);
        this.cargandoRoles.set(false);
      },
    });
  }

  asignarRol(): void {
    const idRol = this.rolParaAsignar();
    if (!idRol) {
      return;
    }
    this.errorRoles.set('');
    this.usuariosService.asignarRol(this.idUsuario(), idRol).subscribe({
      next: () => {
        this.rolParaAsignar.set(null);
        this.cargarRoles();
        this.notificaciones.exito('Rol asignado correctamente');
      },
      error: (err: Error) => this.errorRoles.set(err.message),
    });
  }

  async quitarRol(idRol: number, nombreRol: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Quitar el rol "${nombreRol}" a este usuario?`))) {
      return;
    }
    this.errorRoles.set('');
    this.usuariosService.quitarRol(this.idUsuario(), idRol).subscribe({
      next: () => {
        this.cargarRoles();
        this.notificaciones.exito('Rol quitado correctamente');
      },
      error: (err: Error) => this.errorRoles.set(err.message),
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();

    const ocupadoPor = v.idEmpleado != null ? this.empleadosOcupados().get(v.idEmpleado) : undefined;
    if (ocupadoPor) {
      this.errorMsg.set(`El empleado seleccionado ya está asignado al usuario "${ocupadoPor}".`);
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set('');

    const peticion = this.esNuevo()
      ? this.usuariosService.crear({
          nombreUsuario: v.nombreUsuario.trim(),
          correo: v.correo.trim(),
          contrasena: v.contrasena,
          idEmpleado: v.idEmpleado,
          idEstadoUsuario: v.idEstadoUsuario!,
          requiereCambioPassword: v.requiereCambioPassword,
        })
      : this.usuariosService.actualizar(this.idUsuario(), {
          nombreUsuario: v.nombreUsuario.trim(),
          correo: v.correo.trim(),
          idEmpleado: v.idEmpleado,
          idEstadoUsuario: v.idEstadoUsuario!,
          requiereCambioPassword: v.requiereCambioPassword,
        });

    peticion.subscribe({
      next: () => {
        this.notificaciones.exito(this.esNuevo() ? 'Creado correctamente' : 'Actualizado correctamente');
        this.router.navigate(['/home/mantenimiento/usuarios']);
      },
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }

  private validarCoincidenciaReset(): void {
    const { contrasenaNueva, repetirContrasenaNueva } = this.resetForm.getRawValue();
    const control = this.resetForm.controls.repetirContrasenaNueva;
    const noCoinciden = !!repetirContrasenaNueva && contrasenaNueva !== repetirContrasenaNueva;

    const { noCoinciden: _ignorado, ...otrosErrores } = control.errors ?? {};
    control.setErrors(noCoinciden ? { ...otrosErrores, noCoinciden: true } : Object.keys(otrosErrores).length ? otrosErrores : null);
  }

  async resetearContrasena(): Promise<void> {
    this.validarCoincidenciaReset();
    this.resetForm.markAllAsTouched();
    if (this.resetForm.invalid) {
      return;
    }
    const v = this.resetForm.getRawValue();
    if (!(await this.confirmacion.confirmar('¿Resetear la contraseña de este usuario? La contraseña anterior deja de funcionar de inmediato.'))) {
      return;
    }

    this.guardandoReset.set(true);
    this.errorReset.set('');
    this.usuariosService.cambiarContrasena(this.idUsuario(), v.contrasenaNueva, v.requiereCambioPassword).subscribe({
      next: () => {
        this.guardandoReset.set(false);
        this.resetForm.reset({ contrasenaNueva: '', repetirContrasenaNueva: '', requiereCambioPassword: true });
        this.notificaciones.exito('Contraseña reseteada correctamente');
      },
      error: (err: Error) => {
        this.errorReset.set(err.message);
        this.guardandoReset.set(false);
      },
    });
  }

  usuarioLabel(id: number | null): string {
    if (!id) return 'Sistema';
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idUsuario();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    // Los roles del usuario se auditan en usuario_rol (con el id de esa
    // relación), así que se traen aparte y se filtran por IdUsuario.
    forkJoin([
      this.usuariosService.RetornarBitacoraPorRegistro('usuarios', id),
      this.usuariosService.RetornarBitacoraGeneral('usuario_rol'),
    ]).subscribe({
      next: ([itemsUsuario, itemsRoles]) => {
        const items = [...itemsUsuario, ...itemsRoles.filter((b) => idEnBitacora(b, 'IdUsuario') === id)].sort((a, b) =>
          b.fechaHora.localeCompare(a.fechaHora),
        );
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
    if (item.tablaAfectada === 'usuario_rol') {
      return cambiosBitacora(item, {
        rol: (id) => this.rolesService.obtener(id)?.nombre,
        usuario: (id) => this.usuariosService.obtener(id)?.nombreUsuario,
      });
    }
    try {
      const antes = item.valoresAnteriores ? JSON.parse(item.valoresAnteriores) : {};
      const despues = item.valoresNuevos ? JSON.parse(item.valoresNuevos) : {};

      // ⚠️ Nunca mostrar el hash de la contraseña en el historial.
      const camposIgnorados = new Set([
        'IdUsuarioModificacion',
        'FechaModificacion',
        'IdUsuarioCreacion',
        'Contrasena',
        'ContrasenaHash',
        'Password',
      ]);

      const idRegistroReal = this.idUsuario();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdUsuario' && idRegistroReal != null) {
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
        if (x.campo.toLowerCase().includes('id usuario')) return -1;
        if (y.campo.toLowerCase().includes('id usuario')) return 1;
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
