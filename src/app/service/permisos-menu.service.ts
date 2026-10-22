import { environment } from '../../environments/environment';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { AuthService } from './auth.service';
import { PermisosService } from './permisos.service';
import { CatalogosService } from './catalogos.service';
import { CODIGO_MODULO_A_SLUG, MENU_SECTIONS } from '../shared/menu-data';

// Respuesta de GET /api/mi-acceso (MiAccesoController en el backend).
interface MiAcceso {
  esAdmin: boolean;
  roles: string[];
  modulos: string[]; // códigos MODULO_SISTEMA: RECEPCION, FARMACIA...
}

// Decide qué secciones del menú (MenuSection.slug) puede ver el usuario de
// la sesión. El backend lo resuelve en /api/mi-acceso:
//   roles activos del usuario -> rol_permiso activos -> permisos.id_modulo
//   -> código MODULO_SISTEMA
// y acá se traduce cada código a su slug (CODIGO_MODULO_A_SLUG).
//
// Antes se armaba desde el front con /usuarios/{id}/roles, /roles/{id}/permisos
// y /permisos, pero esos endpoints son solo para ADMIN: a cualquier otro
// usuario le respondían 403 y el menú terminaba mostrándose completo.
//
// Reglas:
//   - ADMIN ve todas las secciones.
//   - Cualquier otro usuario ve SOLO los módulos de sus permisos; sin
//     permisos (o si la consulta falla) no ve ninguna sección, solo Inicio.
@Injectable({ providedIn: 'root' })
export class PermisosMenuService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private permisosService = inject(PermisosService);
  private catalogosService = inject(CatalogosService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = `${environment.apiUrl}/api/mi-acceso`;

  // Slugs de MenuSection permitidos, o null mientras todavía se cargan
  // (el menú no muestra secciones y permisosGuard espera a que termine).
  modulosPermitidos = signal<Set<string> | null>(null);

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
    this.modulosPermitidos.set(null);
    this.permisosService.cargar();
    this.catalogosService.recargarTodos();
    this.calcular();
  }

  private calcular(): void {
    // Sin sesión no hay nada que mostrar; se marca como "cargado" (vacío)
    // para que permisosGuard no se quede esperando. login.ts llama a
    // refrescar() al iniciar sesión y se vuelve a calcular.
    if (!this.authService.idUsuarioActual()) {
      this.modulosPermitidos.set(new Set());
      return;
    }
    this.http
      .get<ApiResponse<MiAcceso>>(this.apiUrl)
      .pipe(map((resp) => resp.datos))
      .subscribe({
        next: (acceso) => this.modulosPermitidos.set(this.aSlugs(acceso)),
        // Si no se pudo saber qué puede ver, no se muestra nada (solo
        // Inicio) en vez de abrirle todo el menú.
        error: () => this.modulosPermitidos.set(new Set()),
      });
  }

  private aSlugs(acceso: MiAcceso | null | undefined): Set<string> {
    if (!acceso) {
      return new Set();
    }
    if (acceso.esAdmin) {
      return new Set(MENU_SECTIONS.map((s) => s.slug));
    }
    return new Set(acceso.modulos.map((codigo) => CODIGO_MODULO_A_SLUG[codigo]).filter((slug): slug is string => !!slug));
  }
}
