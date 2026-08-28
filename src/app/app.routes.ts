import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Inicio } from './inicio/inicio';
import { Modulo } from './modulo/modulo';

export const routes: Routes = [
    {path: '', redirectTo: 'home/inicio', pathMatch: 'full'},
    {
        path: 'home',
        component: Home,
        canActivate: [],
        children: [
            {path: 'inicio',component: Inicio,},
            {path: 'modulo/:slug',component: Modulo,},
        ],
    }

];
