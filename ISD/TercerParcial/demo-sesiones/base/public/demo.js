// La página solo hace fetch a la API. El navegador manda la cookie solo (misma página, mismo servidor).
const $ = (id) => document.getElementById(id);

// ETAPA 1 · Llamar a la API.
// Centralizo el fetch en una función para no repetir el manejo de errores y del JSON.
// fetch NO lanza error con 401/403, por eso regreso el status para decidir yo qué hacer.
// El Content-Type solo se manda cuando hay cuerpo, porque express.json() lo necesita para leerlo.
// No uso credentials: 'include' porque la página y la API están en el mismo origen.
async function llamar(metodo, url, cuerpo) {
  const opciones = { method: metodo };
  if (cuerpo !== undefined) {
    opciones.headers = { 'Content-Type': 'application/json' };
    opciones.body = JSON.stringify(cuerpo);
  }
  const respuesta = await fetch(url, opciones);
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (e) {
    datos = null; // si no era JSON, no quiero que se rompa la página
  }
  return { status: respuesta.status, datos };
}

// ETAPA 2 · Bitácora.
// Uso prepend para que lo más nuevo quede arriba, y textContent (no innerHTML)
// porque el JSON puede traer texto de alguien más y innerHTML permitiría inyectar
// scripts (XSS) que podrían robar la cookie si no fuera httpOnly.
function anotar(metodo, url, status, datos) {
  let clase = 'error';
  if (status >= 200 && status < 300) clase = 'ok';
  else if (status === 401) clase = 'e401';
  else if (status === 403) clase = 'e403';

  const li = document.createElement('li');

  const codigo = document.createElement('span');
  codigo.className = 'codigo ' + clase;
  codigo.textContent = status;

  const linea = document.createElement('span');
  linea.textContent = ' ' + metodo + ' ' + url;

  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(datos, null, 2);

  li.append(codigo, linea, pre);
  $('bitacora').prepend(li);
}

// ETAPA 3 · Estado.
// Le pregunto al servidor quién soy; el navegador manda la cookie sin que yo haga nada.
// #cookie-js sale vacío con httpOnly porque JavaScript no puede leer esa cookie.
async function pintarEstado() {
  const { status, datos } = await llamar('GET', '/api/sesion');
  const estado = $('estado');
  if (status === 200) {
    estado.textContent = datos.usuario.nombre + ' (' + datos.usuario.rol + ') · sesión ' +
      datos.sesion + ' · vence en ' + datos.expiraEnSegundos + ' s';
    estado.className = 'estado con-sesion';
  } else {
    estado.textContent = 'Sin sesión (el servidor responde 401)';
    estado.className = 'estado sin-sesion';
  }
  $('cookie-js').textContent = document.cookie || '(vacío)';
}

// ETAPA 4 · Tabla de sesiones del servidor.
// Vacío el tbody antes de llenarlo para que no se dupliquen las filas al actualizar.
// Uso textContent en las celdas por seguridad, y toLocaleString para la hora local.
async function pintarTabla() {
  const { datos } = await llamar('GET', '/api/diagnostico/sesiones');
  const cuerpo = $('tabla-sesiones');
  cuerpo.replaceChildren();

  if (!datos) return;

  $('donde').textContent = datos.almacen === 'mysql'
    ? 'En MySQL, tabla sessions: sobreviven si el servidor se reinicia'
    : 'En la memoria del servidor: se pierden si el servidor se reinicia';

  if (!datos.sesiones || datos.sesiones.length === 0) {
    const fila = document.createElement('tr');
    const celda = document.createElement('td');
    celda.colSpan = 4;
    celda.textContent = '(sin sesiones)';
    fila.append(celda);
    cuerpo.append(fila);
    return;
  }

  for (const s of datos.sesiones) {
    const fila = document.createElement('tr');
    if (s.esLaTuya) fila.className = 'tuya';

    const vence = s.expira ? new Date(s.expira).toLocaleString() : '—';
    const valores = [
      s.sesion + (s.esLaTuya ? ' (la tuya)' : ''),
      s.usuario,
      s.visitas,
      vence,
    ];
    for (const valor of valores) {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.append(celda);
    }
    cuerpo.append(fila);
  }
}

// Después de cada acción refresco las dos cosas para que la página nunca quede desactualizada.
async function refrescarTodo() {
  await pintarEstado();
  await pintarTabla();
}

// ETAPA 5 · Eventos.
$('btn-refrescar').addEventListener('click', refrescarTodo);
$('btn-sesiones').addEventListener('click', pintarTabla);

// preventDefault evita que el formulario recargue la página al enviarse.
$('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const { status, datos } = await llamar('POST', '/api/login', {
    usuario: $('usuario').value,
    contrasena: $('contrasena').value,
  });
  anotar('POST', '/api/login', status, datos);
  await refrescarTodo();
});

// Un solo recorrido para todos los botones, leyendo método y ruta del HTML (dataset),
// así no escribo un addEventListener por botón.
document.querySelectorAll('button[data-url]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    const metodo = boton.dataset.metodo;
    const url = boton.dataset.url;
    const { status, datos } = await llamar(metodo, url);
    anotar(metodo, url, status, datos);
    await refrescarTodo();
  });
});

// Al cambiar de usuario pongo su contraseña de ejemplo (<usuario>12345).
$('usuario').addEventListener('change', () => {
  $('contrasena').value = $('usuario').value + '12345';
});

// ETAPA 6 · Al cargar la página.
// No necesito DOMContentLoaded porque el <script> está al final del <body>,
// cuando los elementos ya existen.
(async () => {
  const { datos } = await llamar('GET', '/api/config');
  $('config').textContent = JSON.stringify(datos, null, 2);
  await refrescarTodo();
})();