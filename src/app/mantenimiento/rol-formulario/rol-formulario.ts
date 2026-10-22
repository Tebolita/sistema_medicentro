import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, concat, forkJoin, of, switchMap, toArray } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, Rol, RolPermiso, RolesService } from '../../service/roles.service';
import { PermisosService } from '../../service/permisos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { PermisosMenuService } from '../../service/permisos-menu.service';
import { cambiosBitacora, idEnBitacora } from '../../shared/bitacora-cambios';
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
  private permisosMenu = inject(PermisosMenuService);
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

  // --- Permisos ---
  // permisosAsignados = lo que hay guardado en el backend; idsMarcados = lo
  // que el usuario marcó en pantalla. Los checkboxes solo cambian
  // idsMarcados: la diferencia se manda al backend al presionar Guardar.
  permisosAsignados = signal<RolPermiso[]>([]);
  idsAsignados = computed(() => new Set(this.permisosAsignados().map((p) => p.idPermiso)));
  idsMarcados = signal<Set<number>>(new Set());
  hayCambiosPermisos = computed(() => {
    const guardados = this.idsAsignados();
    const marcados = this.idsMarcados();
    return guardados.size !== marcados.size || [...marcados].some((id) => !guardados.has(id));
  });
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
        this.idsMarcados.set(new Set(permisos.map((p) => p.idPermiso)));
        this.cargandoPermisos.set(false);
      },
      error: (err: Error) => {
        this.errorPermisos.set(err.message);
        this.cargandoPermisos.set(false);
      },
    });
  }

  // Solo cambia la selección en pantalla; no llama al backend.
  alternarPermiso(idPermiso: number, marcado: boolean): void {
    this.errorPermisos.set('');
    this.idsMarcados.update((actual) => {
      const nuevo = new Set(actual);
      if (marcado) {
        nuevo.add(idPermiso);
      } else {
        nuevo.delete(idPermiso);
      }
      return nuevo;
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const eraNuevo = this.esNuevo();
    this.guardando.set(true);
    this.errorMsg.set('');
    this.errorPermisos.set('');
    const input = { nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null };
    // Si solo se tocaron permisos, no se manda el PUT del rol: dejaría en el
    // historial una entrada "Modificó" sin ningún campo cambiado.
    const peticion: Observable<Rol> = eraNuevo
      ? this.rolesService.crear(input)
      : this.form.pristine && this.registro()
        ? of(this.registro()!)
        : this.rolesService.actualizar(this.idRol(), input);
    peticion.pipe(switchMap((rol) => this.guardarPermisos(rol.idRol))).subscribe({
      next: () => {
        this.permisosMenu.refrescar();
        this.notificaciones.exito(eraNuevo ? 'Creado correctamente' : 'Actualizado correctamente');
        this.router.navigate(['/home/mantenimiento/roles']);
      },
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
        // Si el rol se creó pero falló algún permiso, queda en modo edición
        // con lo que realmente quedó guardado, para poder reintentar.
        if (this.idRol() !== 0) {
          this.cargarPermisos();
        }
      },
    });
  }

  // Manda al backend solo la diferencia entre lo guardado y lo marcado.
  // Va en serie (concat) para que, si una falla, se sepa cuál y no queden
  // peticiones a medias corriendo en paralelo.
  private guardarPermisos(idRol: number): Observable<unknown> {
    if (this.esNuevo()) {
      this.idRol.set(idRol);
    }
    const guardados = this.idsAsignados();
    const marcados = this.idsMarcados();
    const peticiones = [
      ...[...marcados].filter((id) => !guardados.has(id)).map((id) => this.rolesService.asignarPermiso(idRol, id)),
      ...[...guardados].filter((id) => !marcados.has(id)).map((id) => this.rolesService.quitarPermiso(idRol, id)),
    ];
    return peticiones.length ? concat(...peticiones).pipe(toArray()) : of(null);
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

    // Los permisos del rol se auditan en la tabla rol_permiso (con el id de
    // esa relación, no el del rol), así que se traen aparte y se filtran por
    // el IdRol que viene en los valores guardados.
    forkJoin([
      this.rolesService.RetornarBitacoraPorRegistro('roles', id),
      this.rolesService.RetornarBitacoraGeneral('rol_permiso'),
    ]).subscribe({
      next: ([itemsRol, itemsPermisos]) => {
        const deEsteRol = itemsPermisos.filter((b) => idEnBitacora(b, 'IdRol') === id);
        const todos = [...itemsRol, ...deEsteRol]
          .filter((b) => this.camposCambiados(b).length > 0)
          .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
        this.bitacoraSignal.set(todos);
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
    // Una fila de rol_permiso se muestra como "Permiso: <nombre> —
    // Sin asignar → Asignado" (o al revés), en vez de sus columnas crudas.
    if (item.tablaAfectada === 'rol_permiso') {
      return cambiosBitacora(item, { permiso: (id) => this.permisosService.obtener(id)?.nombre });
    }
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
