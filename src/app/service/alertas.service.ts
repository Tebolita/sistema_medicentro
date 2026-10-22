import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { MENU_SECTIONS } from '../shared/menu-data';
import { Alerta, FabricaAlertas, ProveedorAlertas } from '../alertas/alerta.model';
import { alertasRecepcion } from '../alertas/alertas-recepcion';
import { alertasSegurosMedicos } from '../alertas/alertas-seguros-medicos';
import { alertasExpedientesClinicos } from '../alertas/alertas-expedientes-clinicos';
import { alertasLaboratorioDiagnostico } from '../alertas/alertas-laboratorio-diagnostico';
import { alertasEmergencias } from '../alertas/alertas-emergencias';
import { alertasHospitalizacion } from '../alertas/alertas-hospitalizacion';
import { alertasFarmacia } from '../alertas/alertas-farmacia';
import { alertasFacturacion } from '../alertas/alertas-facturacion';

// Una entrada por categoría del menú (slug de MENU_SECTIONS). Para agregar
// alertas a otra categoría solo hay que implementar su archivo.
const FABRICAS: Record<string, FabricaAlertas> = {
  recepcion: alertasRecepcion,
  'seguros-medicos': alertasSegurosMedicos,
  'expedientes-clinicos': alertasExpedientesClinicos,
  'laboratorio-diagnostico': alertasLaboratorioDiagnostico,
  emergencias: alertasEmergencias,
  hospitalizacion: alertasHospitalizacion,
  farmacia: alertasFarmacia,
  'facturacion-cobros': alertasFacturacion,
};

// Alertas de la campana del encabezado, según el módulo donde se esté.
@Injectable({ providedIn: 'root' })
export class AlertasService {
  private router = inject(Router);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  private proveedores: Record<string, ProveedorAlertas> = Object.fromEntries(
    Object.entries(FABRICAS).map(([slug, fabrica]) => [slug, fabrica()]),
  );

  private url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  // Categoría del menú a la que pertenece la ruta actual (prefijo más largo).
  moduloActual = computed(() => {
    const ruta = this.url().split('?')[0];
    return (
      MENU_SECTIONS.filter((s) => s.route && (ruta === s.route || ruta.startsWith(s.route + '/'))).sort(
        (a, b) => b.route!.length - a.route!.length,
      )[0] ?? null
    );
  });

  alertas = computed<Alerta[]>(() => {
    const slug = this.moduloActual()?.slug;
    // No todos los módulos con "route" necesitan alertas propias (p. ej.
    // Reportes) — sin el ?. esto tronaba en cualquier módulo nuevo que no
    // tuviera todavía su entrada en FABRICAS.
    return slug ? (this.proveedores[slug]?.alertas() ?? []) : [];
  });

  private cargados = new Set<string>();

  constructor() {
    // Al entrar a un módulo se cargan (una vez) los datos que sus alertas necesitan.
    effect(() => {
      const slug = this.moduloActual()?.slug;
      if (!slug || !this.esNavegador || this.cargados.has(slug)) {
        return;
      }
      this.cargados.add(slug);
      this.proveedores[slug]?.cargar();
    });
  }
}
