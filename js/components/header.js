import { signOut } from "../auth.js";
import { subscribeToAuthState } from "../authState.js";

const headerLinks = {
  home: [
    { label: "Regístrate", href: "registro.html", style: "primary" },
    { label: "Inicia sesión", href: "login.html", style: "secondary" },
  ],
  register: [
    { label: "Página principal", href: "index.html", style: "secondary" },
    { label: "Inicia sesión", href: "login.html", style: "primary" },
  ],
  login: [
    { label: "Página principal", href: "index.html", style: "secondary" },
    { label: "Regístrate", href: "registro.html", style: "primary" },
  ],
};

function createAccountMenu() {
  const wrapper = document.createElement("div");
  wrapper.className = "account-menu";

  const trigger = document.createElement("button");
  trigger.className = "account-menu__trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-label", "Abrir menú de perfil");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "account-menu-panel");
  trigger.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <circle cx="12" cy="8" r="3.5"></circle>
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"></path>
    </svg>
  `;

  const panel = document.createElement("div");
  panel.className = "account-menu__panel";
  panel.id = "account-menu-panel";
  panel.hidden = true;

  const profileLink = document.createElement("a");
  profileLink.href = "dashboard.html#/perfil";
  profileLink.textContent = "Mi perfil";

  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.textContent = "Cerrar sesión";

  const status = document.createElement("p");
  status.className = "account-menu__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  panel.append(profileLink, logoutButton, status);
  wrapper.append(trigger, panel);

  function closeMenu({ restoreFocus = false } = {}) {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) {
      trigger.focus();
    }
  }

  trigger.addEventListener("click", () => {
    const isOpening = panel.hidden;
    panel.hidden = !isOpening;
    trigger.setAttribute("aria-expanded", String(isOpening));
    if (isOpening) {
      profileLink.focus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!wrapper.contains(event.target)) {
      closeMenu();
    }
  });

  profileLink.addEventListener("click", () => closeMenu());
  logoutButton.addEventListener("click", async () => {
    status.textContent = "Cerrando sesión…";
    logoutButton.disabled = true;
    try {
      await signOut();
      closeMenu();
      window.location.assign("index.html");
    } catch (error) {
      console.error("[SSAP header] No fue posible cerrar la sesión.", error);
      status.textContent = "No se pudo cerrar la sesión. Inténtalo de nuevo.";
      logoutButton.disabled = false;
    }
  });

  return wrapper;
}

function mountHeader(container) {
  if (container.dataset.mounted === "true") {
    return;
  }

  const header = document.createElement("header");
  const image = document.createElement("img");
  image.src = "https://www.unadmexico.mx/images/banners/bannerSuperior_2024_v01.webp";
  image.alt = "Universidad Abierta y a Distancia de México";
  header.append(image);

  const nav = document.createElement("nav");
  nav.className = "site-nav";
  nav.setAttribute("aria-label", "Navegación principal");
  header.append(nav);
  container.classList.add("site-header");
  container.append(header);
  container.dataset.mounted = "true";

  const accountMenu = createAccountMenu();
  subscribeToAuthState((state) => {
    nav.replaceChildren();
    if (state.session) {
      nav.append(accountMenu);
      return;
    }

    const links = headerLinks[container.dataset.page] ?? headerLinks.home;
    for (const link of links) {
      const anchor = document.createElement("a");
      anchor.className = `button button--${link.style}`;
      anchor.href = link.href;
      anchor.textContent = link.label;
      nav.append(anchor);
    }
  });
}

for (const container of document.querySelectorAll("#site-header")) {
  mountHeader(container);
}
