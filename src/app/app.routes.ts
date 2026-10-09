import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Home } from './home/home';
import { Inicio } from './inicio/inicio';
import { Modulo } from './modulo/modulo';
import { PacientesLista } from './pacientes/pacientes-lista/pacientes-lista';
import { PacienteFormulario } from './pacientes/paciente-formulario/paciente-formulario';
import { ConsultasLista } from './consultas-externas/consultas-lista/consultas-lista';
import { ConsultaFormulario } from './consultas-externas/consulta-formulario/consulta-formulario';
import { LibroActas } from './libro-actas/libro-actas';
import { PolizasLista } from './polizas/polizas-lista/polizas-lista';
import { PolizaFormulario } from './polizas/poliza-formulario/poliza-formulario';
import { ExpedientesLista } from './expedientes/expedientes-lista/expedientes-lista';
import { ExpedienteFormulario } from './expedientes/expediente-formulario/expediente-formulario';
import { LaboratorioLista } from './laboratorio/laboratorio-lista/laboratorio-lista';
import { OrdenFormulario } from './laboratorio/orden-formulario/orden-formulario';
import { CasosLista } from './emergencias/casos-lista/casos-lista';
import { CasoFormulario } from './emergencias/caso-formulario/caso-formulario';
import { CompromisosLista } from './emergencias/compromisos-lista/compromisos-lista';
import { CompromisoFormulario } from './emergencias/compromiso-formulario/compromiso-formulario';
import { HospitalizacionesLista } from './hospitalizacion/hospitalizaciones-lista/hospitalizaciones-lista';
import { HospitalizacionFormulario } from './hospitalizacion/hospitalizacion-formulario/hospitalizacion-formulario';
import { OrdenMedicaFormulario } from './hospitalizacion/orden-medica-formulario/orden-medica-formulario';
import { InventarioLista } from './farmacia/inventario-lista/inventario-lista';
import { ItemFormulario } from './farmacia/item-formulario/item-formulario';
import { MovimientoFormulario } from './farmacia/movimiento-formulario/movimiento-formulario';
import { MovimientosLista } from './farmacia/movimientos-lista/movimientos-lista';
import { MedicamentosLista } from './farmacia/medicamentos-lista/medicamentos-lista';
import { MedicamentoFormulario } from './farmacia/medicamento-formulario/medicamento-formulario';
import { RecetasLista } from './farmacia/recetas-lista/recetas-lista';
import { RecetaFormulario } from './farmacia/receta-formulario/receta-formulario';
import { FacturasLista } from './facturacion/facturas-lista/facturas-lista';
import { FacturaFormulario } from './facturacion/factura-formulario/factura-formulario';
import { PagosLista } from './facturacion/pagos-lista/pagos-lista';
import { PagoFormulario } from './facturacion/pago-formulario/pago-formulario';
import { CatalogosLista } from './mantenimiento/catalogos-lista/catalogos-lista';
import { ProveedoresLista } from './mantenimiento/proveedores-lista/proveedores-lista';
import { ProveedorFormulario } from './mantenimiento/proveedor-formulario/proveedor-formulario';
import { ConveniosLista } from './mantenimiento/convenios-lista/convenios-lista';
import { ConvenioFormulario } from './mantenimiento/convenio-formulario/convenio-formulario';
import { UsuariosLista } from './mantenimiento/usuarios-lista/usuarios-lista';
import { UsuarioFormulario } from './mantenimiento/usuario-formulario/usuario-formulario';
import { RolesLista } from './mantenimiento/roles-lista/roles-lista';
import { RolFormulario } from './mantenimiento/rol-formulario/rol-formulario';
import { PuestosLista } from './mantenimiento/puestos-lista/puestos-lista';
import { PuestoFormulario } from './mantenimiento/puesto-formulario/puesto-formulario';
import { EspecialidadesLista } from './mantenimiento/especialidades-lista/especialidades-lista';
import { EspecialidadFormulario } from './mantenimiento/especialidad-formulario/especialidad-formulario';
import { EmpleadosLista } from './mantenimiento/empleados-lista/empleados-lista';
import { EmpleadoFormulario } from './mantenimiento/empleado-formulario/empleado-formulario';
import { PermisosLista } from './mantenimiento/permisos-lista/permisos-lista';
import { PermisoFormulario } from './mantenimiento/permiso-formulario/permiso-formulario';
import { AseguradorasLista } from './mantenimiento/aseguradoras-lista/aseguradoras-lista';
import { AseguradoraFormulario } from './mantenimiento/aseguradora-formulario/aseguradora-formulario';
import { SalasLista } from './mantenimiento/salas-lista/salas-lista';
import { SalaFormulario } from './mantenimiento/sala-formulario/sala-formulario';
import { HabitacionesLista } from './mantenimiento/habitaciones-lista/habitaciones-lista';
import { HabitacionFormulario } from './mantenimiento/habitacion-formulario/habitacion-formulario';
import { TiposConsentimientoLista } from './mantenimiento/tipos-consentimiento-lista/tipos-consentimiento-lista';
import { TipoConsentimientoFormulario } from './mantenimiento/tipo-consentimiento-formulario/tipo-consentimiento-formulario';
import { TiposExamenLista } from './mantenimiento/tipos-examen-lista/tipos-examen-lista';
import { TipoExamenFormulario } from './mantenimiento/tipo-examen-formulario/tipo-examen-formulario';
import { MiCuenta } from './cuenta/mi-cuenta/mi-cuenta';
import { permisosGuard } from './service/permisos.guard';

export const routes: Routes = [

    // LOGIN
    {
        path: '',
        component: Login
    },

    // SISTEMA
    {
        path: 'home',

        component: Home,

        canActivate: [],
        canActivateChild: [permisosGuard],

        children: [
            {path: 'inicio',component: Inicio,},
            {path: 'cuenta',component: MiCuenta,},
            {path: 'modulo/:slug',component: Modulo,},
            {path: 'pacientes',component: PacientesLista,},
            {path: 'pacientes/nuevo',component: PacienteFormulario,},
            {path: 'pacientes/:id',component: PacienteFormulario,},
            {path: 'consultas',component: ConsultasLista,},
            {path: 'consultas/nueva',component: ConsultaFormulario,},
            {path: 'consultas/:id',component: ConsultaFormulario,},
            {path: 'libro-actas',component: LibroActas,},
            {path: 'polizas',component: PolizasLista,},
            {path: 'polizas/nueva',component: PolizaFormulario,},
            {path: 'polizas/:id',component: PolizaFormulario,},
            {path: 'expedientes',component: ExpedientesLista,},
            {path: 'expedientes/nuevo',component: ExpedienteFormulario,},
            {path: 'expedientes/:id',component: ExpedienteFormulario,},
            {path: 'laboratorio',component: LaboratorioLista,},
            {path: 'laboratorio/nueva',component: OrdenFormulario,},
            {path: 'laboratorio/:id',component: OrdenFormulario,},
            {path: 'emergencias',component: CasosLista,},
            {path: 'emergencias/nuevo',component: CasoFormulario,},
            {path: 'emergencias/compromisos',component: CompromisosLista,},
            {path: 'emergencias/compromisos/nuevo',component: CompromisoFormulario,},
            {path: 'emergencias/compromisos/:id',component: CompromisoFormulario,},
            {path: 'emergencias/:id',component: CasoFormulario,},
            {path: 'hospitalizacion',component: HospitalizacionesLista,},
            {path: 'hospitalizacion/nuevo',component: HospitalizacionFormulario,},
            {path: 'hospitalizacion/orden-nueva',component: OrdenMedicaFormulario,},
            {path: 'hospitalizacion/:id',component: HospitalizacionFormulario,},
            {path: 'farmacia',component: InventarioLista,},
            {path: 'farmacia/item-nuevo',component: ItemFormulario,},
            {path: 'farmacia/item/:id',component: ItemFormulario,},
            {path: 'farmacia/movimiento-nuevo',component: MovimientoFormulario,},
            {path: 'farmacia/movimientos',component: MovimientosLista,},
            {path: 'farmacia/medicamentos',component: MedicamentosLista,},
            {path: 'farmacia/medicamentos/nuevo',component: MedicamentoFormulario,},
            {path: 'farmacia/medicamentos/:id',component: MedicamentoFormulario,},
            {path: 'farmacia/recetas',component: RecetasLista,},
            {path: 'farmacia/recetas/nueva',component: RecetaFormulario,},
            {path: 'farmacia/recetas/:id',component: RecetaFormulario,},
            {path: 'facturacion',component: FacturasLista,},
            {path: 'facturacion/nueva',component: FacturaFormulario,},
            {path: 'facturacion/pagos',component: PagosLista,},
            {path: 'facturacion/pago-nuevo',component: PagoFormulario,},
            {path: 'facturacion/:id',component: FacturaFormulario,},
            {path: 'mantenimiento/catalogos',component: CatalogosLista,},
            {path: 'mantenimiento/proveedores',component: ProveedoresLista,},
            {path: 'mantenimiento/proveedores/nuevo',component: ProveedorFormulario,},
            {path: 'mantenimiento/proveedores/:id',component: ProveedorFormulario,},
            {path: 'mantenimiento/convenios',component: ConveniosLista,},
            {path: 'mantenimiento/convenios/nuevo',component: ConvenioFormulario,},
            {path: 'mantenimiento/convenios/:id',component: ConvenioFormulario,},
            {path: 'mantenimiento/usuarios',component: UsuariosLista,},
            {path: 'mantenimiento/usuarios/nuevo',component: UsuarioFormulario,},
            {path: 'mantenimiento/usuarios/:id',component: UsuarioFormulario,},
            {path: 'mantenimiento/roles',component: RolesLista,},
            {path: 'mantenimiento/roles/nuevo',component: RolFormulario,},
            {path: 'mantenimiento/roles/:id',component: RolFormulario,},
            {path: 'mantenimiento/puestos',component: PuestosLista,},
            {path: 'mantenimiento/puestos/nuevo',component: PuestoFormulario,},
            {path: 'mantenimiento/puestos/:id',component: PuestoFormulario,},
            {path: 'mantenimiento/especialidades',component: EspecialidadesLista,},
            {path: 'mantenimiento/especialidades/nueva',component: EspecialidadFormulario,},
            {path: 'mantenimiento/especialidades/:id',component: EspecialidadFormulario,},
            {path: 'mantenimiento/empleados',component: EmpleadosLista,},
            {path: 'mantenimiento/empleados/nuevo',component: EmpleadoFormulario,},
            {path: 'mantenimiento/empleados/:id',component: EmpleadoFormulario,},
            {path: 'mantenimiento/permisos',component: PermisosLista,},
            {path: 'mantenimiento/permisos/nuevo',component: PermisoFormulario,},
            {path: 'mantenimiento/permisos/:id',component: PermisoFormulario,},
            {path: 'mantenimiento/aseguradoras',component: AseguradorasLista,},
            {path: 'mantenimiento/aseguradoras/nueva',component: AseguradoraFormulario,},
            {path: 'mantenimiento/aseguradoras/:id',component: AseguradoraFormulario,},
            {path: 'mantenimiento/salas',component: SalasLista,},
            {path: 'mantenimiento/salas/nueva',component: SalaFormulario,},
            {path: 'mantenimiento/salas/:id',component: SalaFormulario,},
            {path: 'mantenimiento/habitaciones',component: HabitacionesLista,},
            {path: 'mantenimiento/habitaciones/nueva',component: HabitacionFormulario,},
            {path: 'mantenimiento/habitaciones/:id',component: HabitacionFormulario,},
            {path: 'mantenimiento/tipos-consentimiento',component: TiposConsentimientoLista,},
            {path: 'mantenimiento/tipos-consentimiento/nuevo',component: TipoConsentimientoFormulario,},
            {path: 'mantenimiento/tipos-consentimiento/:id',component: TipoConsentimientoFormulario,},
            {path: 'mantenimiento/tipos-examen',component: TiposExamenLista,},
            {path: 'mantenimiento/tipos-examen/nuevo',component: TipoExamenFormulario,},
            {path: 'mantenimiento/tipos-examen/:id',component: TipoExamenFormulario,},
        ],
    }

];