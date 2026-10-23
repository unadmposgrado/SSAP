import { ROLE } from "../roles.js";

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

const studentPages = {
  "/dashboard/inicio": {
    title: "Inicio",
    description: "Tu espacio para dar seguimiento a la trayectoria académica.",
  },
  "/dashboard/avance": {
    title: "Avance académico",
    description: "Consulta aquí la información de seguimiento de tu trayectoria.",
  },
  "/dashboard/portafolio": {
    title: "Portafolio de evidencias",
    description: "Organiza y consulta aquí tus evidencias académicas.",
  },
  "/dashboard/retroalimentaciones": {
    title: "Retroalimentaciones",
    description: "Consulta aquí las orientaciones relacionadas con tu proceso formativo.",
  },
};

export function renderStudentView(path, state) {
  const page = studentPages[path];
  const name = state.profile.full_name || state.user.user_metadata?.full_name;
  const greeting = name
    ? `<p class="dashboard__greeting">Hola, ${escapeHTML(name)}.</p>`
    : "";

  if (path === "/dashboard/inicio") {
    return `
      ${greeting}
      <h1>${page.title}</h1>
      <p class="dashboard__lead">${page.description}</p>
      <section class="dashboard-card" aria-labelledby="progress-title">
        <h2 id="progress-title">Resumen de avance</h2>
        <p class="empty-state">Aún no hay información de avance disponible.</p>
      </section>
      <nav class="dashboard-shortcuts" aria-label="Accesos académicos">
        <a href="dashboard.html#/dashboard/avance">Consultar avance</a>
        <a href="dashboard.html#/dashboard/portafolio">Ver portafolio de evidencias</a>
        <a href="dashboard.html#/dashboard/retroalimentaciones">Ver retroalimentaciones</a>
      </nav>
    `;
  }

  const emptyMessages = {
    "/dashboard/avance": "Aún no hay información de avance disponible.",
    "/dashboard/portafolio": "Aún no tienes evidencias registradas.",
    "/dashboard/retroalimentaciones": "Aún no hay retroalimentaciones disponibles.",
  };

  return `
    <h1>${page.title}</h1>
    <p class="dashboard__lead">${page.description}</p>
    <section class="dashboard-card" aria-label="${page.title}">
      <p class="empty-state">${emptyMessages[path]}</p>
    </section>
  `;
}

export function renderAdminView(path, state) {
  const name = state.profile.full_name || state.user.user_metadata?.full_name;
  const greeting = name ? `Bienvenido/a, ${escapeHTML(name)}.` : "Bienvenido/a.";
  return `
    <h1>Panel de administración</h1>
    <p class="dashboard__lead">${greeting}</p>
    <section class="dashboard-card">
      <h2>Herramientas administrativas</h2>
      <p class="empty-state">Las herramientas de administración estarán disponibles próximamente.</p>
      <a class="button button--secondary" href="dashboard.html#/admin/usuarios">Ir a Usuarios</a>
    </section>
  `;
}

export function renderProfileView(state) {
  const name = state.profile.full_name || state.user.user_metadata?.full_name;
  const roleNames = {
    [ROLE.ADMINISTRATOR]: "Administrador",
    [ROLE.STUDENT]: "Estudiante",
    [ROLE.FACILITATOR]: "Facilitador",
    [ROLE.MONITOR]: "Monitor",
  };
  const rows = [
    name ? `<dt>Nombre</dt><dd>${escapeHTML(name)}</dd>` : "",
    state.user.email
      ? `<dt>Correo electrónico</dt><dd>${escapeHTML(state.user.email)}</dd>`
      : "",
    roleNames[state.profile.role]
      ? `<dt>Rol</dt><dd>${roleNames[state.profile.role]}</dd>`
      : "",
  ].filter(Boolean).join("");

  return `
    <h1>Mi perfil</h1>
    <p class="dashboard__lead">Información disponible de tu cuenta.</p>
    <section class="dashboard-card">
      <dl class="profile-details">${rows || "<dd>No hay datos de perfil disponibles.</dd>"}</dl>
    </section>
  `;
}
