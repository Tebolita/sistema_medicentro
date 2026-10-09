export interface MenuItem {
  icon: string;
  label: string;
  route?: string;
  queryParams?: Record<string, string>;
  // Agrupa los items dentro de la pantalla de overview del módulo (ver
  // Modulo/modulo.ts) y dentro de Catálogos (ver mantenimiento-catalogos.ts).
  // Hoy solo lo usa "mantenimiento", para separar sus pantallas por el
  // módulo al que pertenecen. Los items sin grupo se muestran sueltos.
  //
  // Para que agregar algo nuevo "se vea bien" sin tener que acordarse de
  // escribir el nombre exacto de otro módulo (y arriesgarse a un typo que
  // cree un grupo duplicado), esto va el slug real de un MenuSection de
  // arriba (p. ej. 'farmacia') — el nombre a mostrar se resuelve con
  // nombreGrupo(), tomando el título real de ese módulo. Si no hay un
  // módulo real al que amarrarlo (p. ej. "Seguridad", que no es un módulo
  // del menú), se puede poner el nombre tal cual: nombreGrupo() lo deja
  // igual si no encuentra ese slug.
  grupo?: string;
}

export interface MenuSection {
  slug: string;
  title: string;
  icon: string;
  description: string;
  color: string;
  route?: string; // módulo real ya construido; si no está, cae al overview genérico /home/modulo/:slug
  items: MenuItem[];
}

export const MENU_SECTIONS: MenuSection[] = [
  {
    slug: 'recepcion',
    title: 'Recepción',
    icon: 'how_to_reg',
    description:
      'Registro de pacientes, bitácora de atención (libro de actas) y búsqueda de expedientes físicos al ingreso a consulta.',
    color: '#0d6a8f',
    route: '/home/pacientes',
    items: [
      { icon: 'person_add', label: 'Registro de pacientes', route: '/home/pacientes/nuevo' },
      { icon: 'menu_book', label: 'Libro de actas', route: '/home/libro-actas' },
      {
        icon: 'manage_search',
        label: 'Búsqueda de expediente',
        route: '/home/pacientes',
        queryParams: { foco: 'buscar' },
      },
      { icon: 'assignment_ind', label: 'Consulta externa', route: '/home/consultas' }, // primera / re-consulta
    ],
  },
  {
    slug: 'seguros-medicos',
    title: 'Seguros Médicos',
    icon: 'health_and_safety',
    description:
      'Validación de aseguradoras (Mediprocesos, Mi Cope) y cálculo de copagos de consulta u hospitalización antes de atender al paciente.',
    color: '#6a1b9a',
    route: '/home/polizas',
    items: [
      {
        icon: 'verified_user',
        label: 'Validación Mediprocesos',
        route: '/home/polizas',
        queryParams: { foco: 'buscar' },
      }, // RPN, Roblered, ASSA
      { icon: 'request_quote', label: 'Copago consulta / hospital', route: '/home/polizas' },
      { icon: 'support_agent', label: 'Gestión seguro Mi Cope', route: '/home/polizas/nueva' },
    ],
  },
  {
    slug: 'expedientes-clinicos',
    title: 'Expedientes Clínicos',
    icon: 'folder_shared',
    description:
      'Fichas clínicas, órdenes médicas y hojas de evolución que conforman el expediente completo del paciente.',
    color: '#2e7d32',
    route: '/home/expedientes',
    items: [
      {
        icon: 'child_care',
        label: 'Ficha de consulta pediátrica',
        route: '/home/expedientes/nuevo',
        queryParams: { tipo: '1' },
      },
      {
        icon: 'description',
        label: 'Ficha de consulta externa',
        route: '/home/expedientes/nuevo',
        queryParams: { tipo: '2' },
      },
      {
        icon: 'folder_open',
        label: 'Expediente de paciente ingresado',
        route: '/home/expedientes',
        queryParams: { tipo: '3' },
      },
      {
        icon: 'monitor_heart',
        label: 'Evolución y signos vitales',
        route: '/home/expedientes/nuevo',
        queryParams: { tipo: '4' },
      },
    ],
  },
  {
    slug: 'laboratorio-diagnostico',
    title: 'Laboratorio y Diagnóstico',
    icon: 'biotech',
    description:
      'Órdenes y resultados de laboratorio, electrocardiogramas, rayos X y ultrasonidos solicitados durante la consulta.',
    color: '#ef6c00',
    route: '/home/laboratorio',
    items: [
      {
        icon: 'science',
        label: 'Orden de exámenes de laboratorio',
        route: '/home/laboratorio/nueva',
        queryParams: { categoria: '1' },
      },
      {
        icon: 'monitor_heart',
        label: 'Electrocardiograma',
        route: '/home/laboratorio/nueva',
        queryParams: { examen: '4' },
      },
      {
        icon: 'image',
        label: 'Rayos X',
        route: '/home/laboratorio/nueva',
        queryParams: { examen: '5' },
      },
      {
        icon: 'pregnant_woman',
        label: 'Ultrasonido',
        route: '/home/laboratorio/nueva',
        queryParams: { examen: '6' },
      },
    ],
  },
  {
    slug: 'emergencias',
    title: 'Emergencias',
    icon: 'emergency',
    description:
      'Atención prioritaria a situaciones críticas y gestión del compromiso de pago con el familiar responsable.',
    color: '#c62828',
    route: '/home/emergencias',
    items: [
      { icon: 'priority_high', label: 'Atención prioritaria', route: '/home/emergencias' },
      { icon: 'handshake', label: 'Hoja de compromiso de pago', route: '/home/emergencias/compromisos' },
    ],
  },
  {
    slug: 'hospitalizacion',
    title: 'Hospitalización',
    icon: 'bed',
    description:
      'Ingreso hospitalario, órdenes médicas, control de medicamentos y costos durante la estancia del paciente.',
    color: '#455a64',
    route: '/home/hospitalizacion',
    items: [
      { icon: 'login', label: 'Ingreso hospitalario', route: '/home/hospitalizacion/nuevo' },
      {
        icon: 'assignment',
        label: 'Órdenes médicas',
        route: '/home/hospitalizacion/orden-nueva',
        queryParams: { tipo: '1' },
      },
      {
        icon: 'medication',
        label: 'Control de medicamentos',
        route: '/home/hospitalizacion/orden-nueva',
        queryParams: { tipo: '3' },
      },
      {
        icon: 'masks',
        label: 'Hoja de anestesia',
        route: '/home/hospitalizacion/orden-nueva',
        queryParams: { tipo: '4' },
      },
      {
        icon: 'payments',
        label: 'Costo del paciente',
        route: '/home/hospitalizacion',
        queryParams: { foco: 'buscar' },
      },
    ],
  },
  {
    slug: 'farmacia',
    title: 'Farmacia',
    icon: 'local_pharmacy',
    description:
      'Venta de medicamentos, recetario interno, recetas de aseguradoras e inventario de la farmacia de la clínica.',
    color: '#00838f',
    route: '/home/farmacia',
    items: [
      {
        icon: 'sell',
        label: 'Venta de medicamentos',
        route: '/home/farmacia/movimiento-nuevo',
        queryParams: { tipo: 'venta' },
      },
      { icon: 'receipt_long', label: 'Recetas internas', route: '/home/farmacia/recetas' },
      {
        icon: 'sync_alt',
        label: 'Recetas Mediprocesos (sistema)',
        route: '/home/farmacia/recetas',
        queryParams: { foco: 'buscar' },
      },
      { icon: 'medication', label: 'Catálogo de medicamentos', route: '/home/farmacia/medicamentos' },
      { icon: 'swap_vert', label: 'Movimientos de medicamentos', route: '/home/farmacia/movimientos' },
      {
        icon: 'inventory_2',
        label: 'Inventario de farmacia',
        route: '/home/farmacia',
        queryParams: { foco: 'buscar' },
      },
    ],
  },
  {
    slug: 'facturacion-cobros',
    title: 'Facturación y Cobros',
    icon: 'point_of_sale',
    description:
      'Facturación SAT y Digefact, formas de pago y recibos de cobro a pacientes y aseguradoras.',
    color: '#5d4037',
    route: '/home/facturacion',
    items: [
      {
        icon: 'receipt',
        label: 'Facturación SAT',
        route: '/home/facturacion/nueva',
        queryParams: { tipo: 'sat' },
      },
      {
        icon: 'fact_check',
        label: 'Facturación Digefact',
        route: '/home/facturacion/nueva',
        queryParams: { tipo: 'digefact' },
      }, // copago seguro
      { icon: 'credit_card', label: 'Formas de pago', route: '/home/facturacion/pago-nuevo' }, // efectivo, transferencia, depósito, POS
      { icon: 'point_of_sale', label: 'Recibos de cobro', route: '/home/facturacion/pagos' },
    ],
  },
  {
    slug: 'mantenimiento',
    title: 'Mantenimiento',
    icon: 'build',
    description:
      'Catálogos y datos de apoyo que usan los demás módulos (estados, formas de pago, proveedores, convenios...). Sin ruta propia: cada opción indica a qué módulo pertenece.',
    color: '#455a64',
    // Sin "route": usa el overview genérico (/home/modulo/mantenimiento),
    // porque acá no hay una pantalla propia, solo enlaces a las 3 de abajo.
    items: [
      { icon: 'tune', label: 'Catálogos del sistema', route: '/home/mantenimiento/catalogos', grupo: 'General' },
      {
        icon: 'local_shipping',
        label: 'Proveedores',
        route: '/home/mantenimiento/proveedores',
        grupo: 'farmacia',
      },
      {
        icon: 'handshake',
        label: 'Convenios',
        route: '/home/mantenimiento/convenios',
        grupo: 'facturacion-cobros',
      },
      { icon: 'person', label: 'Usuarios', route: '/home/mantenimiento/usuarios', grupo: 'Seguridad' },
      { icon: 'badge', label: 'Roles', route: '/home/mantenimiento/roles', grupo: 'Seguridad' },
      { icon: 'key', label: 'Permisos', route: '/home/mantenimiento/permisos', grupo: 'Seguridad' },
      {
        icon: 'health_and_safety',
        label: 'Aseguradoras',
        route: '/home/mantenimiento/aseguradoras',
        grupo: 'seguros-medicos',
      },
      { icon: 'meeting_room', label: 'Salas', route: '/home/mantenimiento/salas', grupo: 'General' },
      {
        icon: 'bed',
        label: 'Habitaciones',
        route: '/home/mantenimiento/habitaciones',
        grupo: 'hospitalizacion',
      },
      {
        icon: 'description',
        label: 'Tipos de consentimiento',
        route: '/home/mantenimiento/tipos-consentimiento',
        grupo: 'emergencias',
      },
      {
        icon: 'biotech',
        label: 'Tipos de examen',
        route: '/home/mantenimiento/tipos-examen',
        grupo: 'laboratorio-diagnostico',
      },
      { icon: 'badge', label: 'Empleados', route: '/home/mantenimiento/empleados', grupo: 'Recursos Humanos' },
      { icon: 'work', label: 'Puestos', route: '/home/mantenimiento/puestos', grupo: 'Recursos Humanos' },
      {
        icon: 'medical_services',
        label: 'Especialidades',
        route: '/home/mantenimiento/especialidades',
        grupo: 'Recursos Humanos',
      },
    ],
  },
];

// Código del valor de catálogo MODULO_SISTEMA (scripts/sembrar_catalogos.sql)
// -> slug de la MenuSection equivalente. Permiso.idModulo apunta a un valor
// de ese catálogo; esto es lo que permite traducir "el usuario tiene un
// permiso del módulo FARMACIA" a "puede ver la sección 'farmacia' del menú"
// sin tener que tocar el backend (ver PermisosMenuService).
export const CODIGO_MODULO_A_SLUG: Record<string, string> = {
  RECEPCION: 'recepcion',
  SEGUROS_MEDICOS: 'seguros-medicos',
  EXPEDIENTES_CLINICOS: 'expedientes-clinicos',
  LABORATORIO: 'laboratorio-diagnostico',
  EMERGENCIAS: 'emergencias',
  HOSPITALIZACION: 'hospitalizacion',
  FARMACIA: 'farmacia',
  FACTURACION_COBROS: 'facturacion-cobros',
  MANTENIMIENTO: 'mantenimiento',
};

// Primer segmento de ruta (después de "/home/") -> slug de la MenuSection
// dueña de esa ruta. Se calcula solo (no a mano) recorriendo section.route y
// las rutas de todos sus items, para que nunca se desincronice si se agrega
// o cambia una ruta acá arriba. Lo usa permisosGuard para saber a qué
// módulo pertenece una URL, aunque el usuario la escriba directo.
export const RUTA_A_MODULO: Record<string, string> = (() => {
  const mapa: Record<string, string> = {};
  for (const section of MENU_SECTIONS) {
    const rutas = [section.route, ...section.items.map((i) => i.route)].filter((r): r is string => !!r);
    for (const ruta of rutas) {
      const segmento = ruta.replace(/^\/home\//, '').split('/')[0];
      if (segmento && !(segmento in mapa)) {
        mapa[segmento] = section.slug;
      }
    }
  }
  return mapa;
})();

// Nombre a mostrar para un "grupo" de MenuItem o de catálogo (ver el
// comentario en MenuItem.grupo): si coincide con el slug de un módulo real,
// usa su título (así nunca se desincroniza si ese título cambia); si no
// coincide con ninguno, se asume que ya es el nombre a mostrar tal cual
// (p. ej. "General", "Seguridad", que no son módulos del menú).
export function nombreGrupo(grupo: string): string {
  return MENU_SECTIONS.find((s) => s.slug === grupo)?.title ?? grupo;
}

export interface GrupoDeItems {
  nombre: string | null;
  items: MenuItem[];
}

// Agrupa una lista de MenuItem por su "grupo" (MenuItem.grupo), preservando
// el orden en que aparece cada grupo por primera vez. Los que no tienen
// grupo caen juntos en un bucket con nombre null (se muestran sin
// encabezado). La usan tanto el menú lateral (menu.ts) como el overview de
// un módulo (modulo.ts) y Catálogos (catalogos-lista.ts), para que agrupar
// se vea y se comporte igual en todos lados.
export function agruparItems(items: MenuItem[]): GrupoDeItems[] {
  const orden: (string | null)[] = [];
  const porGrupo = new Map<string | null, MenuItem[]>();
  for (const item of items) {
    const clave = item.grupo ?? null;
    if (!porGrupo.has(clave)) {
      orden.push(clave);
      porGrupo.set(clave, []);
    }
    porGrupo.get(clave)!.push(item);
  }
  return orden.map((clave) => ({ nombre: clave ? nombreGrupo(clave) : null, items: porGrupo.get(clave)! }));
}
