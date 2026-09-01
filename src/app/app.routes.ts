import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Inicio } from './inicio/inicio';
import { Modulo } from './modulo/modulo';
import { PacientesLista } from './pacientes/pacientes-lista/pacientes-lista';
import { PacienteFormulario } from './pacientes/paciente-formulario/paciente-formulario';
import { ConsultasLista } from './consultas-externas/consultas-lista/consultas-lista';
import { ConsultaFormulario } from './consultas-externas/consulta-formulario/consulta-formulario';
import { LibroActas } from './libro-actas/libro-actas';

export const routes: Routes = [
    {path: '', redirectTo: 'home/inicio', pathMatch: 'full'},
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
        ],
    }

];
