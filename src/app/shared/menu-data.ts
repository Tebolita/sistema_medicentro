export interface MenuItem {
  icon: string;
  label: string;
  route?: string;
  queryParams?: Record<string, string>;
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
];
