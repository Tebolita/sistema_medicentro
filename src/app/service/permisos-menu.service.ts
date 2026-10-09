import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { UsuariosService } from './usuarios.service';
import { RolesService } from './roles.service';
import { PermisosService } from './permisos.service';
import { CatalogosService } from './catalogos.service';
import { CODIGO_MODULO_A_SLUG } from '../shared/menu-data';

// Traduce los roles del usuario de la sesión actual a los slugs de
// MenuSection que puede ver, usando lo que YA existe en Mantenimiento ->
// Roles/Permisos (sin tocar el backend):
//   idUsuario actual (AuthService) -> roles activos (UsuariosService.listarRoles)
//     -> permisos del rol (RolesService.listarPermisos)
//     -> Permiso.idModulo (PermisosService.obtener)
//     -> código MODULO_SISTEMA (CatalogosService 'MODULO_SISTEMA')
//     -> slug de MenuSection (CODIGO_MODULO_A_SLUG)
//
// Se usa /usuarios/{id}/roles (que da idRol directo) en vez de los nombres
// de rol que vienen en la respuesta del login: así funciona también para
// sesiones que ya estaban iniciadas antes de este cambio, sin pedirle a
// nadie que vuelva a loguearse.
//
// Si el usuario no tiene NINGÚN permiso asignado todavía en ninguno de sus
// roles (dato aún sin configurar desde Mantenimiento), se decide mostrar el
// menú completo en vez de dejarlo vacío: así nadie queda bloqueado sin poder
// entrar a Mantenimiento a asignar permisos. En cuanto haya al menos un
// permiso asignado, el filtro empieza a aplicar de verdad.
@Injectable({ providedIn: 'root' })
export class PermisosMenuService {
  private authService = inject(AuthService);
  private usuariosService = inject(UsuariosService);
  private rolesService = inject(RolesService);
  private permisosService = inject(PermisosService);
  private catalogosService = inject(CatalogosService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  // null = todavía no se pudo calcular (o el usuario no tiene permisos
  // asignados en ningún rol) -> el menú se muestra completo.
  private idsPermisosUsuario = signal<number[] | null>(null);

  constructor() {
    if (!this.esNavegador) {
      return;
    }
    this.calcular();
  }

  // Vuelve a calcular todo desde cero con el usuario de la sesión actual.
  // login.ts la llama justo después de guardar el token/id_usuario: este
  // servicio es un singleton que puede haberse construido ANTES del login
  // (p. ej. al hidratar la página prerenderizada, sin sesión todavía), y esa
  // primera carga —con PermisosService/CatalogosService también vacíos por
  // falta de token— se queda pegada hasta un refresh si nadie la repite.
  refrescar(): void {
    if (!this.esNavegador) {
      return;
    }
    this.idsPermisosUsuario.set(null);
    this.permisosService.cargar();
    this.catalogosService.recargarTodos();
    this.calcular();
  }

  private calcular(): void {
    const idUsuario = this.authService.idUsuarioActual();
    if (!idUsuario) {
      return;
    }
    this.usuariosService
      .listarRoles(idUsuario)
      .pipe(catchError(() => of([])))
      .subscribe((rolesUsuario) => {
        const idsRol = rolesUsuario.filter((r) => r.activo).map((r) => r.idRol);
        if (idsRol.length === 0) {
          this.idsPermisosUsuario.set([]);
          return;
        }
        forkJoin(idsRol.map((id) => this.rolesService.listarPermisos(id).pipe(catchError(() => of([])))))
          .pipe(catchError(() => of([])))
          .subscribe((listas) => {
            const ids = [...new Set(listas.flat().map((p) => p.idPermiso))];
            this.idsPermisosUsuario.set(ids);
          });
      });
  }

  // Slugs de MenuSection permitidos, o null si se debe mostrar el menú
  // completo (sin permisos configurados todavía, o mientras se cargan).
  modulosPermitidos = computed<Set<string> | null>(() => {
    const ids = this.idsPermisosUsuario();
    if (ids === null || ids.length === 0) {
      return null;
    }
    const modulosCat = this.catalogosService.obtener('MODULO_SISTEMA')();
    if (modulosCat.length === 0) {
      return null;
    }
    const idModuloACodigo = new Map(modulosCat.map((v) => [v.id, v.codigo]));
    const slugs = new Set<string>();
    for (const idPermiso of ids) {
      const permiso = this.permisosService.obtener(idPermiso);
      if (!permiso) {
        continue;
      }
      const codigoModulo = idModuloACodigo.get(permiso.idModulo);
      const slug = codigoModulo ? CODIGO_MODULO_A_SLUG[codigoModulo] : undefined;
      if (slug) {
        slugs.add(slug);
      }
    }
    return slugs.size > 0 ? slugs : null;
  });
}
