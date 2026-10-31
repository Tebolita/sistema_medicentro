import { FichaConsultaExternaAdulto } from '../../models/ficha-consulta-externa-adulto.model';
import { FichaClinicaGeneral } from '../../models/ficha-clinica-general.model';
import { OrdenMedicaConsulta } from '../../models/orden-medica-consulta.model';
import { NotaEvolucionConsulta } from '../../models/nota-evolucion-consulta.model';
import { NotaEnfermeriaConsulta } from '../../models/nota-enfermeria-consulta.model';
import { ControlSignosConsulta } from '../../models/control-signos-consulta.model';
import { CostoPacienteConsulta } from '../../models/costo-paciente-consulta.model';
import { Paciente, PacienteAlergia, PacienteAntecedente } from '../../models/paciente.model';
import { VacunaAplicada } from '../../models/vacuna-aplicada.model';
import { CatalogoValor } from '../../service/catalogos.service';

// Builders puros del HTML de cada documento imprimible ligado a una cita
// (consulta externa) — extraídos de consulta-atencion.ts para poder
// reutilizarlos también desde el popup "Resumen del expediente"
// (expedientes-lista), que puede combinar varias citas en una sola hoja
// para los 5 tipos que son lista (no para las 2 fichas, que son 1:1 por
// cita). No dependen de ninguna instancia de componente: reciben los datos
// y los helpers de etiquetas ya resueltos.

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function nd(v: number | string | null | undefined, sufijo = ''): string {
  return v === null || v === undefined || v === '' ? '—' : `${esc(String(v))}${sufijo}`;
}

export function nombreCompletoPaciente(paciente: Paciente): string {
  return [paciente.primerNombre, paciente.segundoNombre, paciente.primerApellido, paciente.segundoApellido]
    .filter(Boolean)
    .join(' ');
}

export function edadPaciente(fechaNacimiento: string): number {
  const [y, m, d] = fechaNacimiento.slice(0, 10).split('-').map(Number);
  const nacimiento = new Date(y, m - 1, d);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad--;
  return edad;
}

export interface AntecedentesTexto {
  familiar: string | null;
  personal: string | null;
  quirurgico: string | null;
  toxico: string | null;
}

// Antecedentes del paciente que coincidan con ese código (FAMILIAR/PERSONAL/
// QUIRURGICO/TOXICO de TIPO_ANTECEDENTE), unidos en una sola línea.
export function textoAntecedentesPorTipo(
  antecedentes: PacienteAntecedente[],
  tiposAntecedente: CatalogoValor[],
  codigo: string,
): string | null {
  const idTipo = tiposAntecedente.find((t) => t.codigo === codigo)?.id;
  if (idTipo === undefined) return null;
  const descripciones = antecedentes.filter((a) => a.idTipoAntecedente === idTipo).map((a) => a.descripcion);
  return descripciones.length ? descripciones.join('; ') : null;
}

export function textoAntecedentes(
  antecedentes: PacienteAntecedente[],
  tiposAntecedente: CatalogoValor[],
): AntecedentesTexto {
  return {
    familiar: textoAntecedentesPorTipo(antecedentes, tiposAntecedente, 'FAMILIAR'),
    personal: textoAntecedentesPorTipo(antecedentes, tiposAntecedente, 'PERSONAL'),
    quirurgico: textoAntecedentesPorTipo(antecedentes, tiposAntecedente, 'QUIRURGICO'),
    toxico: textoAntecedentesPorTipo(antecedentes, tiposAntecedente, 'TOXICO'),
  };
}

// Alergias del paciente, cada una como "descripción (tipo, severidad)".
export function textoAlergiasPaciente(
  alergias: PacienteAlergia[],
  tiposAlergia: CatalogoValor[],
  severidades: CatalogoValor[],
): string | null {
  const lista = alergias.map((a) => {
    const tipo = tiposAlergia.find((t) => t.id === a.idTipoAlergia)?.nombre ?? '';
    const severidad = severidades.find((s) => s.id === a.idSeveridad)?.nombre ?? '';
    const detalle = [tipo, severidad].filter(Boolean).join(', ');
    return detalle ? `${a.descripcion} (${detalle})` : a.descripcion;
  });
  return lista.length ? lista.join('; ') : null;
}

// Vacunas registradas en una consulta, cada una como "nombre (dosis)".
export function textoVacunasAplicadas(vacunas: VacunaAplicada[], tiposVacuna: CatalogoValor[]): string | null {
  const lista = vacunas.map((v) => {
    const nombre = tiposVacuna.find((t) => t.id === v.idTipoVacuna)?.nombre ?? '—';
    return v.dosis ? `${nombre} (${v.dosis})` : nombre;
  });
  return lista.length ? lista.join('; ') : null;
}

// ==================== Ficha clínica — Consulta externa adulto ====================
export function construirHtmlFichaConsultaExternaAdulto(
  f: FichaConsultaExternaAdulto,
  paciente: Paciente,
  fechaConsulta: string,
  nombreMedico: string,
  antecedentes: AntecedentesTexto,
  alergiasTexto: string | null,
  vacunasTexto: string | null,
): string {
  const nombrePaciente = nombreCompletoPaciente(paciente);
  const fechaNacimiento = new Date(paciente.fechaNacimiento.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const seccion = (titulo: string, contenido: string) => `
  <div class="seccion-titulo">${esc(titulo)}</div>
  <div class="seccion-cuerpo">${contenido}</div>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Ficha clínica consulta externa adulto</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 24px 32px; font-size: 12.5px; }
  .encabezado { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1565c0; padding-bottom: 10px; margin-bottom: 4px; }
  .encabezado-logo { display: flex; align-items: center; gap: 10px; }
  .encabezado-logo img { height: 68px; width: auto; }
  .encabezado h1 { font-size: 17px; margin: 0; color: #1565c0; }
  .encabezado-contacto { text-align: right; font-size: 11px; color: #333; }
  .titulo-ficha { text-align: center; font-weight: 700; font-size: 13px; border: 1px solid #1565c0; padding: 4px; margin: 6px 0; }
  table.datos-generales { width: 100%; border-collapse: collapse; border: 1px solid #1565c0; margin-bottom: 4px; }
  table.datos-generales caption { text-align: center; font-weight: 700; background: rgba(21, 101, 192, 0.08); border-bottom: 1px solid #1565c0; padding: 3px; }
  table.datos-generales td { border-top: 1px solid #1565c0; padding: 4px 8px; }
  table.datos-generales .etiqueta { font-weight: 700; white-space: nowrap; }
  .seccion-titulo { text-align: center; font-weight: 700; background: rgba(21, 101, 192, 0.08); border: 1px solid #1565c0; border-bottom: none; padding: 3px; margin-top: 4px; }
  .seccion-cuerpo { border: 1px solid #1565c0; padding: 6px 8px; min-height: 18px; white-space: pre-line; }
  .vitales-cuerpo { border: 1px solid #1565c0; padding: 6px 8px; }
  .vitales-cuerpo div { margin-bottom: 2px; }
  .vitales-cuerpo b { display: inline-block; width: 70px; }
  .antecedentes-cuerpo { border: 1px solid #1565c0; padding: 6px 8px; }
  .antecedentes-cuerpo div { margin-bottom: 2px; }
  .antecedentes-cuerpo b { display: inline-block; width: 90px; }
  .firma { margin-top: 36px; text-align: center; }
  .firma-linea { border-top: 1px solid #1a1a1a; width: 280px; margin: 0 auto 4px; }
  .firma p { margin: 0; font-size: 12px; font-weight: 700; }
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

  <div class="titulo-ficha">FICHA CLÍNICA CONSULTA EXTERNA ADULTO</div>

  <table class="datos-generales">
    <caption>DATOS GENERALES</caption>
    <tr><td class="etiqueta">Fecha de consulta:</td><td>${nd(fechaConsulta)}</td></tr>
    <tr><td class="etiqueta">Número de carnet:</td><td>${nd(paciente.codigoExpediente)}</td><td class="etiqueta">DPI:</td><td>${nd(paciente.numeroDocumento)}</td></tr>
    <tr><td class="etiqueta">Nombres y apellidos:</td><td colspan="3">${nd(nombrePaciente)}</td></tr>
    <tr><td class="etiqueta">Fecha de nacimiento:</td><td>${nd(fechaNacimiento)}</td><td class="etiqueta">Edad:</td><td>${nd(edadPaciente(paciente.fechaNacimiento), ' años')}</td></tr>
  </table>

  <div class="seccion-titulo">HISTORIA CLÍNICA Y EXPLORACIÓN</div>
  <div class="seccion-cuerpo">${esc(f.motivoHistoriaActual)}</div>

  <div class="vitales-cuerpo">
    <div><b>W (peso):</b> ${nd(f.peso, ' kg')}</div>
    <div><b>T (talla):</b> ${nd(f.talla, ' cm')}</div>
    <div><b>PA:</b> ${nd(f.presionArterial)}</div>
    <div><b>FC:</b> ${nd(f.frecuenciaCardiaca, ' lpm')}</div>
    <div><b>FR:</b> ${nd(f.frecuenciaRespiratoria, ' rpm')}</div>
    <div><b>T°:</b> ${nd(f.temperatura, ' °C')}</div>
    <div><b>Examen físico (+):</b> ${f.examenFisico ? esc(f.examenFisico) : '—'}</div>
  </div>

  <div class="seccion-titulo">ANTECEDENTES DE IMPORTANCIA</div>
  <div class="antecedentes-cuerpo">
    <div><b>FAM:</b> ${nd(antecedentes.familiar)}</div>
    <div><b>MED:</b> ${nd(antecedentes.personal)}</div>
    <div><b>QX:</b> ${nd(antecedentes.quirurgico)}</div>
    <div><b>TOX:</b> ${nd(antecedentes.toxico)}</div>
    <div><b>ALERGIAS:</b> ${nd(alergiasTexto)}</div>
    <div><b>VACUNAS:</b> ${nd(vacunasTexto)}</div>
  </div>
${seccion('PLAN DIAGNÓSTICO', f.planDiagnostico ? esc(f.planDiagnostico) : '—')}
${seccion('PLAN TERAPEUTICO/ RP', f.planTerapeutico ? esc(f.planTerapeutico) : '—')}
${seccion('ESTUDIOS COMPLEMENTARIOS', f.estudiosComplementarios ? esc(f.estudiosComplementarios) : '—')}

  <div class="firma">
    <div class="firma-linea"></div>
    <p>${esc(nombreMedico)}</p>
    <p style="font-weight:400;">Médico tratante</p>
  </div>
</body>
</html>`;
}

// ==================== Ficha clínica general (papel rosa) ====================
export function construirHtmlFichaClinicaGeneral(
  f: FichaClinicaGeneral,
  paciente: Paciente,
  fechaConsulta: string,
  nombreMedico: string,
  estadoCivil: string | null,
  antecedentes: AntecedentesTexto,
  alergiasTexto: string | null,
): string {
  const nombrePaciente = nombreCompletoPaciente(paciente);
  const ultimaRegla = f.ultimaRegla
    ? new Date(f.ultimaRegla.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  const seccion = (titulo: string, contenido: string) => `
  <div class="seccion-titulo">${esc(titulo)}</div>
  <div class="seccion-cuerpo">${contenido}</div>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Ficha clínica</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 24px 32px; font-size: 12.5px; }
  .encabezado { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1565c0; padding-bottom: 10px; margin-bottom: 4px; }
  .encabezado-logo { display: flex; align-items: center; gap: 10px; }
  .encabezado-logo img { height: 68px; width: auto; }
  .encabezado h1 { font-size: 17px; margin: 0; color: #1565c0; }
  .encabezado-contacto { text-align: right; font-size: 11px; color: #333; }
  .titulo-ficha { text-align: center; font-weight: 700; font-size: 13px; border: 1px solid #1565c0; padding: 4px; margin: 6px 0; }
  table.datos-generales { width: 100%; border-collapse: collapse; border: 1px solid #1565c0; margin-bottom: 4px; }
  table.datos-generales caption { text-align: center; font-weight: 700; background: rgba(21, 101, 192, 0.08); border-bottom: 1px solid #1565c0; padding: 3px; }
  table.datos-generales td { border-top: 1px solid #1565c0; padding: 4px 8px; }
  table.datos-generales .etiqueta { font-weight: 700; white-space: nowrap; }
  .seccion-titulo { text-align: center; font-weight: 700; background: rgba(21, 101, 192, 0.08); border: 1px solid #1565c0; border-bottom: none; padding: 3px; margin-top: 4px; }
  .seccion-cuerpo { border: 1px solid #1565c0; padding: 6px 8px; min-height: 18px; white-space: pre-line; }
  .vitales-cuerpo { border: 1px solid #1565c0; padding: 6px 8px; }
  .vitales-cuerpo div { margin-bottom: 2px; }
  .vitales-cuerpo b { display: inline-block; width: 110px; }
  .antecedentes-cuerpo { border: 1px solid #1565c0; padding: 6px 8px; }
  .antecedentes-cuerpo div { margin-bottom: 2px; }
  .antecedentes-cuerpo b { display: inline-block; width: 90px; }
  .firma { margin-top: 36px; text-align: center; }
  .firma-linea { border-top: 1px solid #1a1a1a; width: 280px; margin: 0 auto 4px; }
  .firma p { margin: 0; font-size: 12px; font-weight: 700; }
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

  <div class="titulo-ficha">FICHA CLÍNICA</div>

  <table class="datos-generales">
    <caption>DATOS GENERALES</caption>
    <tr><td class="etiqueta">Fecha:</td><td>${nd(fechaConsulta)}</td></tr>
    <tr><td class="etiqueta">Nombre:</td><td colspan="3">${nd(nombrePaciente)}</td><td class="etiqueta">Edad:</td><td>${nd(edadPaciente(paciente.fechaNacimiento), ' años')}</td></tr>
    <tr><td class="etiqueta">Dirección:</td><td colspan="3">${nd(paciente.direccion)}</td></tr>
    <tr><td class="etiqueta">Estado civil:</td><td>${nd(estadoCivil)}</td><td class="etiqueta">Religión:</td><td>${nd(paciente.religion)}</td></tr>
    <tr><td class="etiqueta">Ocupación:</td><td colspan="3">${nd(paciente.ocupacion)}</td></tr>
  </table>

  <div class="seccion-titulo">M. DE C.</div>
  <div class="seccion-cuerpo">${esc(f.motivoConsulta)}</div>

  <div class="seccion-titulo">HX. DE LA ENF.</div>
  <div class="seccion-cuerpo">${f.historiaEnfermedad ? esc(f.historiaEnfermedad) : '—'}</div>

  <div class="seccion-titulo">ANTECEDENTES</div>
  <div class="antecedentes-cuerpo">
    <div><b>Familiares:</b> ${nd(antecedentes.familiar)}</div>
    <div><b>Médicos:</b> ${nd(antecedentes.personal)}</div>
    <div><b>Qx y Tx:</b> ${nd(antecedentes.quirurgico)}</div>
    <div><b>Alérgicos:</b> ${nd(alergiasTexto)}</div>
    <div><b>Hábitos:</b> ${nd(antecedentes.toxico)}</div>
    <div><b>Prenatales:</b> ${nd(f.prenatales)}</div>
    <div><b>Vacunación:</b> ${nd(f.vacunacion)}</div>
    <div><b>G-O Menarquía:</b> ${nd(f.menarquia)} · <b style="width:auto;">Ciclo:</b> ${nd(f.ciclo)} · <b style="width:auto;">Dolor:</b> ${nd(f.dolor)} · <b style="width:auto;">Última R.:</b> ${nd(ultimaRegla)}</div>
  </div>
${seccion('R.X SISTEMAS', f.revisionSistemas ? esc(f.revisionSistemas) : '—')}

  <div class="seccion-titulo">EXAMEN FÍSICO</div>
  <div class="vitales-cuerpo">
    <div><b>Estado general:</b> ${nd(f.estadoGeneral)}</div>
    <div><b>Presión arterial:</b> ${nd(f.presionArterial)}</div>
    <div><b>Pulso:</b> ${nd(f.pulso, ' lpm')}</div>
    <div><b>Respiración:</b> ${nd(f.respiracion, ' rpm')}</div>
    <div><b>Temperatura:</b> ${nd(f.temperatura, ' °C')}</div>
    <div><b>Piel / Faneras:</b> ${nd(f.pielFaneras)}</div>
    <div><b>Cabeza / Cuello:</b> ${nd(f.cabezaCuello)}</div>
    <div><b>Cardio-pulmonar:</b> ${nd(f.cardioPulmonar)}</div>
    <div><b>Abdomen:</b> ${nd(f.abdomen)}</div>
    <div><b>Dorso y raquis:</b> ${nd(f.dorsoRaquis)}</div>
    <div><b>Extremidades:</b> ${nd(f.extremidades)}</div>
    <div><b>Neurológico:</b> ${nd(f.neurologico)}</div>
    <div><b>Otros:</b> ${nd(f.otros)}</div>
  </div>

  <div class="firma">
    <div class="firma-linea"></div>
    <p>${esc(nombreMedico)}</p>
    <p style="font-weight:400;">Médico tratante</p>
  </div>
</body>
</html>`;
}

// ==================== Órdenes médicas de consulta (mergeable) ====================
export function construirHtmlOrdenesMedicasConsulta(
  ordenes: OrdenMedicaConsulta[],
  nombrePaciente: string,
  tipoOrdenLabel: (id: number) => string,
  medicoLabel: (id: number) => string,
): string {
  const ordenadas = [...ordenes].sort((a, b) => a.fechaOrden.localeCompare(b.fechaOrden));
  const filas = ordenadas
    .map((o) => {
      const fecha = new Date(o.fechaOrden).toLocaleString('es-GT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      return `
      <tr>
        <td class="col-fecha">${esc(fecha)} - ${esc(medicoLabel(o.idMedico))}</td>
        <td>${esc(tipoOrdenLabel(o.idTipoOrden))} - ${esc(o.indicaciones)}</td>
      </tr>`;
    })
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

// ==================== Hoja de evolución de consulta (mergeable) ====================
export function construirHtmlEvolucionConsulta(
  notas: NotaEvolucionConsulta[],
  nombrePaciente: string,
  medicoLabel: (id: number) => string,
  fechaConsultaLabel: string | null,
): string {
  const ordenadas = [...notas].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  const filas = ordenadas
    .map((n) => {
      const fecha = new Date(n.fechaHora).toLocaleString('es-GT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
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
    ${fechaConsultaLabel ? `<div><b>Fecha de consulta:</b> ${esc(fechaConsultaLabel)}</div>` : ''}
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

// ==================== Enfermería de consulta (mergeable) ====================
export function construirHtmlEnfermeriaConsulta(
  notas: NotaEnfermeriaConsulta[],
  nombrePaciente: string,
  empleadoLabel: (id: number) => string,
  fechaConsultaLabel: string | null,
): string {
  const ordenadas = [...notas].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  const filas = ordenadas
    .map((n) => {
      const fecha = new Date(n.fechaHora).toLocaleString('es-GT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      return `
      <tr>
        <td class="col-fecha">${esc(fecha)}</td>
        <td>${esc(n.nota)} — ${esc(empleadoLabel(n.idEmpleado))}</td>
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
    ${fechaConsultaLabel ? `<div><b>Fecha de consulta:</b> ${esc(fechaConsultaLabel)}</div>` : ''}
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

// ==================== Control de signos de consulta (mergeable) ====================
export function construirHtmlControlSignosConsulta(
  controles: ControlSignosConsulta[],
  nombrePaciente: string,
  edad: number | null,
): string {
  const ordenados = [...controles].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  const filas = ordenados
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

// ==================== Costo paciente de consulta (mergeable) ====================
export function construirHtmlCostoPacienteConsulta(
  costos: CostoPacienteConsulta[],
  nombrePaciente: string,
  edad: number | null,
): string {
  const q = (v: number) => `Q${v.toFixed(2)}`;
  const ordenados = [...costos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const total = ordenados.reduce((acc, c) => acc + c.cantidad * c.valorUnitario, 0);

  const filas = ordenados
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
