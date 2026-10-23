import { getAuthState, refreshAuthState, subscribeToAuthState } from "./authState.js";
import {
  renderAdminView,
  renderProfileView,
  renderStudentView,
} from "./views/dashboardViews.js";
import { mountAdminUsersView } from "./pages/adminUsers.js";
import { RECOGNIZED_ROLES, ROLE, ROLE_HOME } from "./roles.js";

const routes = {
  student: [
    ["/dashboard/inicio", "Inicio"],
    ["/dashboard/avance", "Avance"],
    ["/dashboard/portafolio", "Portafolio de evidencias"],
    ["/dashboard/retroalimentaciones", "Retroalimentaciones"],
  ],
  administrator: [
    ["/admin/inicio", "Inicio"],
    ["/admin/usuarios", "Usuarios"],
  ],
};

const outlet = document.querySelector("#dashboard-content");
const navigation = document.querySelector("#dashboard-navigation");
let lastRenderKey = "";

function currentPath() {
  return window.location.hash.slice(1) || "";
}

function setRoute(path, { replace = false } = {}) {
  if (replace) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${path}`,
    );
  } else {
    window.location.hash = path;
  }
}

function renderMessage(title, message, action) {
  navigation.replaceChildren();
  outlet.innerHTML = `
    <section class="dashboard-message" role="status">
      <h1>${title}</h1>
      <p>${message}</p>
      ${action || ""}
    </section>
  `;
}

function renderNavigation(items, activePath, label) {
  const nav = document.createElement("nav");
  nav.className = "dashboard-nav";
  nav.setAttribute("aria-label", label);

  for (const [path, text] of items) {
    const link = document.createElement("a");
    link.href = `dashboard.html#${path}`;
    link.textContent = text;
    if (path === activePath) {
      link.setAttribute("aria-current", "page");
    }
    nav.append(link);
  }
  navigation.replaceChildren(nav);
}

function renderProfileBackLink(role) {
  const path = ROLE_HOME[role];
  return path
    ? `<p class="dashboard__back"><a href="dashboard.html#${path}">Volver a mi espacio</a></p>`
    : `<p class="dashboard__back"><a href="index.html">Volver a la página principal</a></p>`;
}

function renderCurrentRoute(state) {
  const path = currentPath();
  const key = `${state.status}:${state.user?.id || ""}:${state.profile?.role || ""}:${path}`;
  if (key === lastRenderKey && state.status !== "loading") {
    return;
  }
  lastRenderKey = key;

  if (state.status === "loading") {
    renderMessage("Cargando tu espacio", "Estamos verificando tu sesión y perfil.");
    return;
  }

  if (state.status === "error") {
    renderMessage(
      "No pudimos verificar tu acceso",
      "No se concedió acceso porque no fue posible confirmar tu perfil. Inténtalo de nuevo o cierra sesión.",
      '<button class="button button--secondary" type="button" data-retry>Reintentar</button>',
    );
    outlet.querySelector("[data-retry]")?.addEventListener("click", async () => {
      lastRenderKey = "";
      await refreshAuthState();
    });
    return;
  }

  if (state.status !== "authenticated" || !state.session) {
    window.location.replace("login.html");
    return;
  }

  if (state.profile.account_status !== "activo") {
    renderMessage(
      "Cuenta no activa",
      "Tu cuenta no está activa. No se concedió acceso; contacta con soporte.",
      '<a href="index.html">Volver a la página principal</a>',
    );
    return;
  }

  const role = state.profile.role;
  if (!RECOGNIZED_ROLES.has(role)) {
    renderMessage(
      "Rol no reconocido",
      "No se concedió acceso porque el rol de esta cuenta no está reconocido. Contacta con soporte.",
    );
    return;
  }

  if (path === "/perfil") {
    navigation.replaceChildren();
    outlet.innerHTML = `${renderProfileView(state)}${renderProfileBackLink(role)}`;
    return;
  }

  if (role === ROLE.FACILITATOR || role === ROLE.MONITOR) {
    renderMessage("Espacio pendiente", "El dashboard para este rol todavía no está disponible.");
    return;
  }

  const studentPath = routes.student.some(([route]) => route === path);
  const adminPath = routes.administrator.some(([route]) => route === path);
  if (role === ROLE.STUDENT && adminPath) {
    setRoute(ROLE_HOME[role], { replace: true });
    lastRenderKey = "";
    renderCurrentRoute(state);
    return;
  }
  if (role === ROLE.ADMINISTRATOR && studentPath) {
    setRoute(ROLE_HOME[role], { replace: true });
    lastRenderKey = "";
    renderCurrentRoute(state);
    return;
  }

  if (role === ROLE.STUDENT && (studentPath || !path)) {
    const target = path || ROLE_HOME[role];
    if (!path) {
      setRoute(target, { replace: true });
    }
    renderNavigation(routes.student, target, "Navegación del estudiante");
    outlet.innerHTML = renderStudentView(target, state);
    return;
  }

  if (role === ROLE.ADMINISTRATOR && (adminPath || !path)) {
    const target = path || ROLE_HOME[role];
    if (!path) {
      setRoute(target, { replace: true });
    }
    renderNavigation(routes.administrator, target, "Navegación administrativa");
    if (target === "/admin/usuarios") {
      mountAdminUsersView(outlet, state.user.id);
    } else {
      outlet.innerHTML = renderAdminView(target, state);
    }
    return;
  }

  renderMessage(
    "Página no encontrada",
    "La ruta solicitada no existe o no está disponible para tu cuenta.",
    `<a href="dashboard.html#${ROLE_HOME[role]}">Ir a mi espacio</a>`,
  );
}

window.addEventListener("hashchange", () => {
  lastRenderKey = "";
  renderCurrentRoute(getAuthState());
  const heading = outlet.querySelector("h1");
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
});

subscribeToAuthState((state) => {
  lastRenderKey = "";
  renderCurrentRoute(state);
});
