import { HospitalizacionCompleta } from '../service/hospitalizaciones.service';

// Builders puros del HTML de cada documento imprimible de Hospitalización —
// extraídos de hospitalizacion-formulario.ts para poder reutilizarlos
// también desde consulta-atencion.ts (Imprimir directo, sin salir de la
// pantalla de atención de la consulta). No dependen de ninguna instancia de
// componente: reciben los datos y los helpers de etiquetas ya resueltos.

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function nd(v: string | number | null | undefined): string {
  return v === null || v === undefined || v === '' ? '—' : esc(String(v));
}

// Lanza una ventana nueva con el HTML ya armado y abre el diálogo de
// impresión del navegador.
export function abrirVentanaImpresion(html: string): void {
  const ventana = window.open('', '_blank', 'width=800,height=600');
  if (!ventana) return;
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  ventana.print();
}

// Reproduce el papel físico "ÓRDENES MÉDICAS" del Sanatorio Medicentro.
export function construirHtmlOrdenes(
  reg: HospitalizacionCompleta,
  nombrePaciente: string,
  medicoLabel: (id: number | null) => string,
  tipoOrdenLabel: (id: number | null) => string,
  formatFecha: (o: unknown) => string,
): string {
  const filas = reg.ordenes
    .map(
      (o) => `
      <tr>
        <td class="col-fecha">${esc(formatFecha(o))} - ${esc(medicoLabel(o.idMedico))}</td>
        <td>${esc(tipoOrdenLabel(o.idTipoOrden))} - ${esc(o.descripcion)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Órdenes médicas</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 24px 32px; font-size: 12.5px; }
  .encabezado { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1565c0; padding-bottom: 10px; margin-bottom: 4px; }
  .encabezado-logo { display: flex; align-items: center; gap: 10px; }
  .encabezado-logo img { height: 68px; width: auto; }
  .encabezado h1 { font-size: 17px; margin: 0; color: #1565c0; }
  .encabezado-contacto { text-align: right; font-size: 11px; color: #333; }
  .titulo-ficha { text-align: center; font-weight: 700; font-size: 13px; border: 1px solid #1565c0; padding: 4px; margin: 6px 0; }
  .nombre-paciente { font-weight: 700; padding: 6px 0 10px; font-size: 13px; }
  table.ordenes { width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #1565c0; }
  table.ordenes th { background: rgba(21, 101, 192, 0.08); border: 1px solid #1565c0; padding: 5px 8px; font-size: 11.5px; text-transform: uppercase; }
  table.ordenes td { border: 1px solid #1565c0; padding: 6px 8px; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
  .col-fecha { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 700; width: 160px; max-width: 160px; }
</style>
</head>
<body>
  <div class="encabezado">
    <div class="encabezado-logo">
      <img src="${window.location.origin}/sanatorio_medicentro8.png" alt="Sanatorio Medicentro" />
      <h1>Sanatorio Medicentro</h1>
    </div>
    <div class="encabezado-contacto">
      7ª. Ave. 2-28 Zona 1 Barberena Santa Rosa<br />
      Tels.: 7887-1348 – 52159179<br />
      Emergencias las 24 Hrs.
    </div>
  </div>

  <div class="titulo-ficha">ÓRDENES MÉDICAS</div>

  <div class="nombre-paciente">Nombre del Paciente: ${esc(nombrePaciente)}</div>

  <table class="ordenes">
    <thead>
      <tr>
        <th>Fecha - Hora - Médico</th>
        <th>Indicaciones</th>
      </tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="2" style="text-align:center;color:#666;">Sin órdenes registradas</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
}

// Reproduce el papel físico "ENFERMERIA" del Sanatorio Medicentro.
export function construirHtmlEnfermeria(
  reg: HospitalizacionCompleta,
  nombrePaciente: string,
  medicoLabel: (id: number | null) => string,
): string {
  const fechaIngreso = new Date(reg.hospitalizacion.fechaIngreso).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const filas = reg.notasEnfermeria
    .map((n) => {
      const fecha = new Date(n.fechaHora).toLocaleString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `
      <tr>
        <td class="col-fecha">${esc(fecha)}</td>
        <td>${esc(n.nota)} — ${esc(medicoLabel(n.idEmpleado))}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Enfermería</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 24px 32px; font-size: 12.5px; }
  .encabezado { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1565c0; padding-bottom: 10px; margin-bottom: 4px; }
  .encabezado-logo { display: flex; align-items: center; gap: 10px; }
  .encabezado-logo img { height: 68px; width: auto; }
  .encabezado h1 { font-size: 17px; margin: 0; color: #1565c0; }
  .encabezado-contacto { text-align: right; font-size: 11px; color: #333; }
  .titulo-ficha { text-align: center; font-weight: 700; font-size: 13px; border: 1px solid #1565c0; padding: 4px; margin: 6px 0; }
  .datos-paciente { padding: 6px 0 10px; font-size: 13px; }
  .datos-paciente div { margin-bottom: 2px; }
  .datos-paciente b { display: inline-block; width: 150px; }
  table.evolucion { width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #1565c0; }
  table.evolucion th { background: rgba(21, 101, 192, 0.08); border: 1px solid #1565c0; padding: 5px 8px; font-size: 11.5px; text-transform: uppercase; }
  table.evolucion td { border: 1px solid #1565c0; padding: 6px 8px; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
  .col-fecha { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 700; width: 160px; max-width: 160px; }
</style>
</head>
<body>
  <div class="encabezado">
    <div class="encabezado-logo">
      <img src="${window.location.origin}/sanatorio_medicentro8.png" alt="Sanatorio Medicentro" />
      <h1>Sanatorio Medicentro</h1>
    </div>
    <div class="encabezado-contacto">
      7ª. Ave. 2-28 Zona 1 Barberena Santa Rosa<br />
      Tels.: 7887-1348 – 52159179<br />
      Emergencias las 24 Hrs.
    </div>
  </div>

  <div class="titulo-ficha">ENFERMERIA</div>

  <div class="datos-paciente">
    <div><b>Nombre:</b> ${esc(nombrePaciente)}</div>
    <div><b>Fecha de ingreso:</b> ${esc(fechaIngreso)}</div>
  </div>

  <table class="evolucion">
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Evolución</th>
      </tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="2" style="text-align:center;color:#666;">Sin notas de enfermería registradas</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
}

// Reproduce el papel físico "HOJA DE EVOLUCIÓN" del Sanatorio Medicentro.
export function construirHtmlEvolucion(
  reg: HospitalizacionCompleta,
  nombrePaciente: string,
  medicoLabel: (id: number | null) => string,
): string {
  const fechaIngreso = new Date(reg.hospitalizacion.fechaIngreso).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const filas = reg.notasEvolucion
    .map((n) => {
      const fecha = new Date(n.fechaHora).toLocaleString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `
      <tr>
        <td class="col-fecha">${esc(fecha)}</td>
        <td>${esc(n.evolucion)} — ${esc(medicoLabel(n.idMedico))}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Hoja de evolución</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 24px 32px; font-size: 12.5px; }
  .encabezado { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1565c0; padding-bottom: 10px; margin-bottom: 4px; }
  .encabezado-logo { display: flex; align-items: center; gap: 10px; }
  .encabezado-logo img { height: 68px; width: auto; }
  .encabezado h1 { font-size: 17px; margin: 0; color: #1565c0; }
  .encabezado-contacto { text-align: right; font-size: 11px; color: #333; }
  .titulo-ficha { text-align: center; font-weight: 700; font-size: 13px; border: 1px solid #1565c0; padding: 4px; margin: 6px 0; }
  .datos-paciente { padding: 6px 0 10px; font-size: 13px; }
  .datos-paciente div { margin-bottom: 2px; }
  .datos-paciente b { display: inline-block; width: 150px; }
  table.evolucion { width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #1565c0; }
  table.evolucion th { background: rgba(21, 101, 192, 0.08); border: 1px solid #1565c0; padding: 5px 8px; font-size: 11.5px; text-transform: uppercase; }
  table.evolucion td { border: 1px solid #1565c0; padding: 6px 8px; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
  .col-fecha { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 700; width: 160px; max-width: 160px; }
</style>
</head>
<body>
  <div class="encabezado">
    <div class="encabezado-logo">
      <img src="${window.location.origin}/sanatorio_medicentro8.png" alt="Sanatorio Medicentro" />
      <h1>Sanatorio Medicentro</h1>
    </div>
    <div class="encabezado-contacto">
      7ª. Ave. 2-28 Zona 1 Barberena Santa Rosa<br />
      Tels.: 7887-1348 – 52159179<br />
      Emergencias las 24 Hrs.
    </div>
  </div>

  <div class="titulo-ficha">HOJA DE EVOLUCIÓN</div>

  <div class="datos-paciente">
    <div><b>Nombre:</b> ${esc(nombrePaciente)}</div>
    <div><b>Fecha de ingreso:</b> ${esc(fechaIngreso)}</div>
  </div>

  <table class="evolucion">
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Evolución</th>
      </tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="2" style="text-align:center;color:#666;">Sin notas de evolución registradas</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
}

// Reproduce el papel físico "HOJA DE CONTROL DE MEDICAMENTOS" — cuadrícula
// con una fila por medicamento y una columna por cada día del mes actual,
// marcando "X" los días en que se administró.
export function construirHtmlControlMedicamentos(
  reg: HospitalizacionCompleta,
  nombrePaciente: string,
  medicamentoLabel: (id: number) => string,
  formatHora: (hora: string) => string,
): string {
  const fechaIngreso = new Date(reg.hospitalizacion.fechaIngreso).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const diasDelMes = new Date(anio, mes + 1, 0).getDate();
  const encabezadosDias = Array.from({ length: diasDelMes }, (_, i) => `<th>${i + 1}</th>`).join('');

  const filas = reg.medicamentosProgramados
    .map((p) => {
      const diasAdministrados = new Set(
        p.administraciones
          .map((a) => new Date(a.fechaHora))
          .filter((f) => f.getFullYear() === anio && f.getMonth() === mes)
          .map((f) => f.getDate()),
      );
      const celdasDias = Array.from({ length: diasDelMes }, (_, i) => `<td>${diasAdministrados.has(i + 1) ? 'X' : ''}</td>`).join('');
      return `
      <tr>
        <td class="col-fecha-inicial">${esc(new Date(p.fechaInicial).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit' }))}</td>
        <td class="col-medicamento">${esc(medicamentoLabel(p.idMedicamento))}</td>
        <td class="col-hora">${esc(formatHora(p.hora))}</td>
        ${celdasDias}
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Hoja de control de medicamentos</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 18px 20px; font-size: 10.5px; }
  .encabezado { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1565c0; padding-bottom: 10px; margin-bottom: 4px; }
  .encabezado-logo { display: flex; align-items: center; gap: 10px; }
  .encabezado-logo img { height: 56px; width: auto; }
  .encabezado h1 { font-size: 15px; margin: 0; color: #1565c0; }
  .encabezado-contacto { text-align: right; font-size: 10px; color: #333; }
  .titulo-ficha { text-align: center; font-weight: 700; font-size: 12px; border: 1px solid #1565c0; padding: 4px; margin: 6px 0; }
  .datos-paciente { padding: 6px 0 10px; font-size: 11px; }
  .datos-paciente div { margin-bottom: 2px; }
  .datos-paciente b { display: inline-block; width: 130px; }
  table.control { width: 100%; border-collapse: collapse; border: 1px solid #1565c0; table-layout: fixed; }
  table.control th, table.control td { border: 1px solid #1565c0; padding: 3px 2px; text-align: center; font-size: 9px; overflow: hidden; }
  table.control th { background: rgba(21, 101, 192, 0.08); }
  .col-fecha-inicial, .col-hora { white-space: nowrap; }
  .col-medicamento { text-align: left; padding-left: 4px; overflow-wrap: anywhere; }
</style>
</head>
<body>
  <div class="encabezado">
    <div class="encabezado-logo">
      <img src="${window.location.origin}/sanatorio_medicentro8.png" alt="Sanatorio Medicentro" />
      <h1>Sanatorio Medicentro Barberena</h1>
    </div>
    <div class="encabezado-contacto">
      7ª. Ave. 2-28 Zona 1 Barberena Santa Rosa<br />
      Tels.: 7887-1348 – 52159179<br />
      Emergencias las 24 Hrs.
    </div>
  </div>

  <div class="titulo-ficha">HOJA DE CONTROL DE MEDICAMENTOS</div>

  <div class="datos-paciente">
    <div><b>Nombre del paciente:</b> ${esc(nombrePaciente)}</div>
    <div><b>Fecha de ingreso:</b> ${esc(fechaIngreso)}</div>
  </div>

  <table class="control">
    <colgroup>
      <col style="width:28px" />
      <col style="width:140px" />
      <col style="width:28px" />
      ${Array.from({ length: diasDelMes }, () => '<col style="width:18px" />').join('')}
    </colgroup>
    <thead>
      <tr>
        <th title="Fecha inicial">FI</th>
        <th title="Listado de medicamentos">LDM</th>
        <th title="Hora">HR</th>
        ${encabezadosDias}
      </tr>
    </thead>
    <tbody>
      ${filas || `<tr><td colspan="${3 + diasDelMes}" style="text-align:center;color:#666;">Sin medicamentos programados</td></tr>`}
    </tbody>
  </table>
</body>
</html>`;
}

// Reproduce el papel físico "CONTROL DE SIGNOS" del Sanatorio Medicentro.
export function construirHtmlControlSignos(reg: HospitalizacionCompleta, nombrePaciente: string, edad: number | null): string {
  const filas = reg.controlesSignos
    .map((c) => {
      const fecha = new Date(c.fechaHora);
      return `
      <tr>
        <td>${esc(fecha.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }))}</td>
        <td>${esc(fecha.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }))}</td>
        <td>${nd(c.presionArterial)}</td>
        <td>${nd(c.temperatura)}</td>
        <td>${nd(c.frecuenciaRespiratoria)}</td>
        <td class="col-observaciones">${nd(c.observaciones)}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Control de signos</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 24px 32px; font-size: 12.5px; }
  .encabezado { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1565c0; padding-bottom: 10px; margin-bottom: 4px; }
  .encabezado-logo { display: flex; align-items: center; gap: 10px; }
  .encabezado-logo img { height: 68px; width: auto; }
  .encabezado h1 { font-size: 17px; margin: 0; color: #1565c0; }
  .encabezado-contacto { text-align: right; font-size: 11px; color: #333; }
  .titulo-ficha { text-align: center; font-weight: 700; font-size: 13px; border: 1px solid #1565c0; padding: 4px; margin: 6px 0; }
  .datos-paciente { padding: 6px 0 10px; font-size: 13px; }
  .datos-paciente div { margin-bottom: 2px; }
  .datos-paciente b { display: inline-block; width: 90px; }
  table.signos { width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #1565c0; }
  table.signos th, table.signos td { border: 1px solid #1565c0; padding: 5px 6px; text-align: center; font-size: 11px; overflow: hidden; overflow-wrap: anywhere; }
  table.signos th { background: rgba(21, 101, 192, 0.08); text-transform: uppercase; font-size: 10.5px; }
  .col-observaciones { text-align: left; }
</style>
</head>
<body>
  <div class="encabezado">
    <div class="encabezado-logo">
      <img src="${window.location.origin}/sanatorio_medicentro8.png" alt="Sanatorio Medicentro" />
      <h1>Sanatorio Medicentro Barberena</h1>
    </div>
    <div class="encabezado-contacto">
      7ª. Ave. 2-28 Zona 1 Barberena Santa Rosa<br />
      Tels.: 7887-1348 – 52159179<br />
      Emergencias las 24 Hrs.
    </div>
  </div>

  <div class="titulo-ficha">CONTROL DE SIGNOS</div>

  <div class="datos-paciente">
    <div><b>Nombre:</b> ${esc(nombrePaciente)}</div>
    <div><b>Edad:</b> ${nd(edad !== null ? `${edad} años` : null)}</div>
  </div>

  <table class="signos">
    <colgroup>
      <col style="width:70px" />
      <col style="width:55px" />
      <col style="width:55px" />
      <col style="width:75px" />
      <col style="width:45px" />
      <col />
    </colgroup>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Hora</th>
        <th>P/A</th>
        <th>Temperatura</th>
        <th>F.R.</th>
        <th>Observaciones</th>
      </tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="6" style="text-align:center;color:#666;">Sin controles de signos registrados</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
}

// Reproduce el papel físico "COSTO PACIENTE" del Sanatorio Medicentro, con
// el total al final.
export function construirHtmlCostoPaciente(reg: HospitalizacionCompleta, nombrePaciente: string, edad: number | null): string {
  const q = (v: number) => `Q${v.toFixed(2)}`;
  const total = reg.costosPaciente.reduce((acc, c) => acc + c.cantidad * c.valorUnitario, 0);

  const filas = reg.costosPaciente
    .map((c) => {
      const fecha = new Date(c.fecha).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return `
      <tr>
        <td>${esc(fecha)}</td>
        <td class="col-desc">${esc(c.descripcion)}</td>
        <td>${c.cantidad}</td>
        <td>${q(c.cantidad * c.valorUnitario)}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Costo paciente</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 24px 32px; font-size: 12.5px; }
  .encabezado { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1565c0; padding-bottom: 10px; margin-bottom: 4px; }
  .encabezado-logo { display: flex; align-items: center; gap: 10px; }
  .encabezado-logo img { height: 68px; width: auto; }
  .encabezado h1 { font-size: 17px; margin: 0; color: #1565c0; }
  .encabezado-contacto { text-align: right; font-size: 11px; color: #333; }
  .titulo-ficha { text-align: center; font-weight: 700; font-size: 13px; border: 1px solid #1565c0; padding: 4px; margin: 6px 0; }
  .datos-paciente { padding: 6px 0 10px; font-size: 13px; }
  .datos-paciente div { margin-bottom: 2px; }
  .datos-paciente b { display: inline-block; width: 90px; }
  table.costos { width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #1565c0; }
  table.costos th, table.costos td { border: 1px solid #1565c0; padding: 5px 6px; text-align: center; font-size: 11px; overflow: hidden; overflow-wrap: anywhere; }
  table.costos th { background: rgba(21, 101, 192, 0.08); text-transform: uppercase; font-size: 10.5px; }
  .col-desc { text-align: left; }
  tfoot td { font-weight: 700; background: rgba(21, 101, 192, 0.08); }
</style>
</head>
<body>
  <div class="encabezado">
    <div class="encabezado-logo">
      <img src="${window.location.origin}/sanatorio_medicentro8.png" alt="Sanatorio Medicentro" />
      <h1>Sanatorio Medicentro Barberena</h1>
    </div>
    <div class="encabezado-contacto">
      7ª. Ave. 2-28 Zona 1 Barberena Santa Rosa<br />
      Tels.: 7887-1348 – 52159179<br />
      Emergencias las 24 Hrs.
    </div>
  </div>

  <div class="titulo-ficha">COSTO PACIENTE</div>

  <div class="datos-paciente">
    <div><b>Nombre:</b> ${esc(nombrePaciente)}</div>
    <div><b>Edad:</b> ${edad !== null ? esc(`${edad} años`) : '—'}</div>
  </div>

  <table class="costos">
    <colgroup>
      <col style="width:80px" />
      <col />
      <col style="width:70px" />
      <col style="width:90px" />
    </colgroup>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Medicamentos</th>
        <th>Cantidad</th>
        <th>Valor del medicamento adm.</th>
      </tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="4" style="text-align:center;color:#666;">Sin costos registrados</td></tr>'}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3">Total</td>
        <td>${q(total)}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
}
