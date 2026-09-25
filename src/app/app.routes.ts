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
import { MedicamentosLista } from './farmacia/medicamentos-lista/medicamentos-lista';
import { MedicamentoFormulario } from './farmacia/medicamento-formulario/medicamento-formulario';
import { RecetasLista } from './farmacia/recetas-lista/recetas-lista';
import { RecetaFormulario } from './farmacia/receta-formulario/receta-formulario';
import { FacturasLista } from './facturacion/facturas-lista/facturas-lista';
import { FacturaFormulario } from './facturacion/factura-formulario/factura-formulario';
import { PagosLista } from './facturacion/pagos-lista/pagos-lista';
import { PagoFormulario } from './facturacion/pago-formulario/pago-formulario';

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

        children: [
            {path: 'inicio',component: Inicio,},
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
            {path: 'farmacia/movimiento-nuevo',component: MovimientoFormulario,},
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
        ],
    }

];