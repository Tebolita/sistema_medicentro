import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, Rol, RolPermiso, RolesService } from '../../service/roles.service';
import { PermisosService } from '../../service/permisos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

@Component({
  selector: 'app-rol-formulario',
  imports: [
    NgClass,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    AuditoriaInfo,
  ],
  templateUrl: './rol-formulario.html',
  styleUrl: './rol-formulario.css',
})
export class RolFormulario {
  private fb = inject(FormBuilder);
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rolesService = inject(RolesService);
  private permisosService = inject(PermisosService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  permisos = this.permisosService.listar;

  idRol = signal(0);
  esNuevo = computed(() => this.idRol() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Rol | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  // --- Permisos asignados (solo en edición) ---
  permisosAsignados = signal<RolPermiso[]>([]);
  idsAsignados = computed(() => new Set(this.permisosAsignados().map((p) => p.idPermiso)));
  cargandoPermisos = signal(false);
  errorPermisos = signal('');

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.rolesService.obtenerPorId(Number(idParam)).subscribe({
        next: (r) => this.cargar(r),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }

    afterNextRender(() => this.permisosService.cargar());
  }

  private cargar(r: Rol): void {
    this.idRol.set(r.idRol);
    this.registro.set(r);
    this.form.patchValue({ nombre: r.nombre, descripcion: r.descripcion ?? '' });
    this.cargarPermisos();
  }

  private cargarPermisos(): void {
    this.cargandoPermisos.set(true);
    this.errorPermisos.set('');
    this.rolesService.listarPermisos(this.idRol()).subscribe({
      next: (permisos) => {
        this.permisosAsignados.set(permisos);
        this.cargandoPermisos.set(false);
      },
      error: (err: Error) => {
        this.errorPermisos.set(err.message);
        this.cargandoPermisos.set(false);
      },
    });
  }

  alternarPermiso(idPermiso: number, marcado: boolean): void {
    this.errorPermisos.set('');
    const peticion = marcado
      ? this.rolesService.asignarPermiso(this.idRol(), idPermiso)
      : this.rolesService.quitarPermiso(this.idRol(), idPermiso);
    peticion.subscribe({
      next: () => {
        this.cargarPermisos();
        this.notificaciones.exito(marcado ? 'Permiso asignado correctamente' : 'Permiso quitado correctamente');
      },
      error: (err: Error) => this.errorPermisos.set(err.message),
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.errorMsg.set('');
    const input = { nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null };
    const peticion = this.esNuevo() ? this.rolesService.crear(input) : this.rolesService.actualizar(this.idRol(), input);
    peticion.subscribe({
      next: () => {
        this.notificaciones.exito(this.esNuevo() ? 'Creado correctamente' : 'Actualizado correctamente');
        this.router.navigate(['/home/mantenimiento/roles']);
      },
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
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
    const id = this.idRol();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.rolesService.RetornarBitacoraPorRegistro('roles', id).subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
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
    try {
      const antes = item.valoresAnteriores ? JSON.parse(item.valoresAnteriores) : {};
      const despues = item.valoresNuevos ? JSON.parse(item.valoresNuevos) : {};

      const camposIgnorados = new Set([
        'IdUsuarioModificacion',
        'FechaModificacion',
        'IdUsuarioCreacion',
      ]);

      const idRegistroReal = this.idRol();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdRol' && idRegistroReal != null) {
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
        if (x.campo.toLowerCase().includes('id rol')) return -1;
        if (y.campo.toLowerCase().includes('id rol')) return 1;
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
