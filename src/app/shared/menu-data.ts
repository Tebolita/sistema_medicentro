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
    items: [
      { icon: 'verified_user', label: 'Validación Mediprocesos' }, // RPN, Roblered, ASSA
      { icon: 'request_quote', label: 'Copago consulta / hospital' },
      { icon: 'support_agent', label: 'Gestión seguro Mi Cope' },
    ],
  },
  {
    slug: 'expedientes-clinicos',
    title: 'Expedientes Clínicos',
    icon: 'folder_shared',
    description:
      'Fichas clínicas, órdenes médicas y hojas de evolución que conforman el expediente completo del paciente.',
    color: '#2e7d32',
    items: [
      { icon: 'child_care', label: 'Ficha de consulta pediátrica' },
      { icon: 'description', label: 'Ficha de consulta externa' },
      { icon: 'folder_open', label: 'Expediente de paciente ingresado' },
      { icon: 'monitor_heart', label: 'Evolución y signos vitales' },
    ],
  },
  {
    slug: 'laboratorio-diagnostico',
    title: 'Laboratorio y Diagnóstico',
    icon: 'biotech',
    description:
      'Órdenes y resultados de laboratorio, electrocardiogramas, rayos X y ultrasonidos solicitados durante la consulta.',
    color: '#ef6c00',
    items: [
      { icon: 'science', label: 'Orden de exámenes de laboratorio' },
      { icon: 'monitor_heart', label: 'Electrocardiograma' },
      { icon: 'image', label: 'Rayos X' },
      { icon: 'pregnant_woman', label: 'Ultrasonido' },
    ],
  },
  {
    slug: 'emergencias',
    title: 'Emergencias',
    icon: 'emergency',
    description:
      'Atención prioritaria a situaciones críticas y gestión del compromiso de pago con el familiar responsable.',
    color: '#c62828',
    items: [
      { icon: 'priority_high', label: 'Atención prioritaria' },
      { icon: 'handshake', label: 'Hoja de compromiso de pago' },
    ],
  },
  {
    slug: 'hospitalizacion',
    title: 'Hospitalización',
    icon: 'bed',
    description:
      'Ingreso hospitalario, órdenes médicas, control de medicamentos y costos durante la estancia del paciente.',
    color: '#455a64',
    items: [
      { icon: 'login', label: 'Ingreso hospitalario' },
      { icon: 'assignment', label: 'Órdenes médicas' },
      { icon: 'medication', label: 'Control de medicamentos' },
      { icon: 'masks', label: 'Hoja de anestesia' },
      { icon: 'payments', label: 'Costo del paciente' },
    ],
  },
  {
    slug: 'farmacia',
    title: 'Farmacia',
    icon: 'local_pharmacy',
    description:
      'Venta de medicamentos, recetario interno, recetas de aseguradoras e inventario de la farmacia de la clínica.',
    color: '#00838f',
    items: [
      { icon: 'sell', label: 'Venta de medicamentos' },
      { icon: 'receipt_long', label: 'Recetas internas' },
      { icon: 'sync_alt', label: 'Recetas Mediprocesos (sistema)' },
      { icon: 'inventory_2', label: 'Inventario de farmacia' },
    ],
  },
  {
    slug: 'facturacion-cobros',
    title: 'Facturación y Cobros',
    icon: 'point_of_sale',
    description:
      'Facturación SAT y Digefact, formas de pago y recibos de cobro a pacientes y aseguradoras.',
    color: '#5d4037',
    items: [
      { icon: 'receipt', label: 'Facturación SAT' },
      { icon: 'fact_check', label: 'Facturación Digefact' }, // copago seguro
      { icon: 'credit_card', label: 'Formas de pago' }, // efectivo, transferencia, depósito, POS
      { icon: 'point_of_sale', label: 'Recibos de cobro' },
    ],
  },
];
