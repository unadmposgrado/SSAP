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

  const links = headerLinks[container.dataset.page] ?? headerLinks.home;
  for (const link of links) {
    const anchor = document.createElement("a");
    anchor.className = `button button--${link.style}`;
    anchor.href = link.href;
    anchor.textContent = link.label;
    nav.append(anchor);
  }
  header.append(nav);

  container.classList.add("site-header");
  container.append(header);
  container.dataset.mounted = "true";
}

for (const container of document.querySelectorAll("#site-header")) {
  mountHeader(container);
}
