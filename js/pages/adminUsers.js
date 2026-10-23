import { getSupabaseClient } from "../supabaseClient.js";
import { ROLE } from "../roles.js";

const PAGE_SIZE = 10;
const ROLE_LABELS = {
  [ROLE.STUDENT]: "Estudiante",
  [ROLE.FACILITATOR]: "Facilitador",
  [ROLE.MONITOR]: "Monitor",
  [ROLE.ADMINISTRATOR]: "Administrador",
};

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function roleLabel(role) {
  return ROLE_LABELS[role] || role || "Sin rol";
}

function statusLabel(status) {
  if (status === "activo") {
    return "Activa";
  }
  if (status === "suspendido") {
    return "Suspendida";
  }
  return status || "Sin estado";
}

function formatDate(value) {
  if (!value) {
    return "No disponible";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(date);
}

function errorMessage(error, operation) {
  if (error?.code === "42501") {
    return operation === "list"
      ? "Supabase rechazó la consulta por permisos. Verifica que el token de sesión pertenezca a un administrador activo y que `authenticated` tenga permiso EXECUTE sobre `admin_list_ssap_users()`."
      : "Supabase rechazó el cambio por permisos. Verifica que el token de sesión pertenezca a un administrador activo y que `authenticated` tenga permiso EXECUTE sobre `change_ssap_user_role(uuid, text)`.";
  }
  if (error?.code === "PGRST202" || error?.code === "PGRST203") {
    return "La función administrativa no está disponible en la caché de API de Supabase. Verifica su despliegue y vuelve a intentarlo.";
  }
  if (error?.code === "PGRST301" || error?.status === 401) {
    return "Supabase no aceptó la sesión para esta operación. Vuelve a iniciar sesión y confirma que tu cuenta siga activa.";
  }
  if (
    error instanceof TypeError
    && /fetch|network|load failed/i.test(error.message)
  ) {
    return "No fue posible conectar con Supabase. Revisa tu conexión e inténtalo de nuevo.";
  }
  return operation === "list"
    ? "No se pudo procesar la respuesta del listado. Inténtalo de nuevo; si el problema persiste, revisa el error técnico en la consola del navegador."
    : "No se pudo guardar el cambio. El perfil no se actualizará en pantalla; inténtalo de nuevo y revisa el error técnico en la consola si persiste.";
}

function appendDetailRow(list, label, value) {
  list.append(
    createElement("dt", "", label),
    createElement("dd", "", value || "No disponible"),
  );
}

export function mountAdminUsersView(outlet, administratorId) {
  const root = createElement("section", "admin-users");
  root.setAttribute("aria-labelledby", "admin-users-title");

  const title = createElement("h1", "", "Gestión de usuarios");
  title.id = "admin-users-title";
  const lead = createElement(
    "p",
    "dashboard__lead",
    "Consulta las cuentas registradas y gestiona los roles permitidos por el backend.",
  );

  const limitations = createElement(
    "p",
    "admin-notice",
    "La edición de nombre/programa, los cambios de estado y la eliminación están deshabilitados hasta verificar las políticas RLS y las operaciones autorizadas para esos datos.",
  );
  limitations.setAttribute("role", "note");

  const summary = createElement("section", "admin-summary");
  summary.setAttribute("aria-label", "Resumen de usuarios");

  const toolbar = createElement("div", "admin-toolbar");
  const searchField = createElement("div", "admin-filter");
  const searchLabel = createElement("label", "", "Buscar por nombre o correo");
  const search = createElement("input", "admin-filter__input");
  search.type = "search";
  search.autocomplete = "off";
  search.id = "admin-user-search";
  searchLabel.htmlFor = search.id;
  search.placeholder = "Escribe un nombre o correo";
  searchField.append(searchLabel, search);

  const roleField = createElement("div", "admin-filter");
  const roleFilterLabel = createElement("label", "", "Filtrar por rol");
  const roleFilter = createElement("select", "admin-filter__input");
  roleFilter.id = "admin-user-role";
  roleFilterLabel.htmlFor = roleFilter.id;
  roleField.append(roleFilterLabel, roleFilter);

  const statusField = createElement("div", "admin-filter");
  const statusFilterLabel = createElement("label", "", "Filtrar por estado");
  const statusFilter = createElement("select", "admin-filter__input");
  statusFilter.id = "admin-user-status";
  statusFilterLabel.htmlFor = statusFilter.id;
  statusField.append(statusFilterLabel, statusFilter);

  const dateField = createElement("div", "admin-filter");
  const dateLabel = createElement("label", "", "Ordenar por registro");
  const dateSort = createElement("select", "admin-filter__input");
  dateSort.id = "admin-user-date-sort";
  dateLabel.htmlFor = dateSort.id;
  dateSort.append(
    createOption("desc", "Más recientes primero"),
    createOption("asc", "Más antiguos primero"),
  );
  dateField.append(dateLabel, dateSort);

  const refreshButton = createElement("button", "button button--secondary", "Actualizar");
  refreshButton.type = "button";
  refreshButton.addEventListener("click", () => {
    void loadUsers();
  });
  toolbar.append(searchField, roleField, statusField, dateField, refreshButton);

  const loadStatus = createElement("p", "admin-load-status");
  loadStatus.setAttribute("role", "status");
  loadStatus.setAttribute("aria-live", "polite");
  const error = createElement("p", "dashboard-error");
  error.setAttribute("role", "alert");
  error.hidden = true;

  const tableCard = createElement("section", "dashboard-card admin-table-card");
  tableCard.setAttribute("aria-label", "Listado de usuarios");
  const tableWrapper = createElement("div", "admin-table-wrapper");
  const table = createElement("table", "admin-table");
  const caption = createElement("caption", "visually-hidden", "Cuentas registradas en SSAP");
  const tableHead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const label of ["Nombre completo", "Correo electrónico", "Rol", "Estado", "Programa", "Registro", "Último acceso", "Acciones"]) {
    const cell = createElement("th", "", label);
    cell.scope = "col";
    headerRow.append(cell);
  }
  tableHead.append(headerRow);
  const tableBody = document.createElement("tbody");
  table.append(caption, tableHead, tableBody);
  tableWrapper.append(table);

  const emptyState = createElement("p", "empty-state admin-empty-state");
  emptyState.hidden = true;
  const pagination = createElement("nav", "admin-pagination");
  pagination.setAttribute("aria-label", "Paginación de usuarios");
  const paginationStatus = createElement("p", "admin-pagination__status");
  const previousButton = createElement("button", "button button--secondary", "Anterior");
  previousButton.type = "button";
  const nextButton = createElement("button", "button button--secondary", "Siguiente");
  nextButton.type = "button";
  pagination.append(previousButton, paginationStatus, nextButton);
  tableCard.append(tableWrapper, emptyState, pagination);

  const dialog = document.createElement("dialog");
  dialog.className = "admin-user-dialog";
  dialog.setAttribute("aria-labelledby", "admin-user-dialog-title");
  const dialogContent = createElement("div", "admin-user-dialog__content");
  const dialogHeader = createElement("div", "admin-user-dialog__header");
  const dialogTitle = createElement("h2", "", "Detalle de usuario");
  dialogTitle.id = "admin-user-dialog-title";
  const closeDialogButton = createElement("button", "admin-dialog-close", "Cerrar");
  closeDialogButton.type = "button";
  closeDialogButton.addEventListener("click", () => dialog.close());
  dialogHeader.append(dialogTitle, closeDialogButton);
  const detailList = createElement("dl", "profile-details admin-user-details");
  const roleForm = createElement("form", "admin-role-form");
  roleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveRole();
  });
  const roleFieldset = document.createElement("fieldset");
  roleFieldset.className = "admin-role-fieldset";
  const roleLegend = createElement("legend", "", "Cambio de rol");
  const roleFieldLabel = createElement("label", "", "Nuevo rol");
  const roleInput = createElement("select", "admin-filter__input");
  roleInput.id = "admin-user-edit-role";
  roleFieldLabel.htmlFor = roleInput.id;
  const roleMessage = createElement("p", "admin-role-message");
  roleMessage.setAttribute("role", "status");
  roleFieldset.append(roleLegend, roleFieldLabel, roleInput, roleMessage);
  const dialogActions = createElement("div", "admin-dialog-actions");
  const cancelButton = createElement("button", "button button--secondary", "Cancelar");
  cancelButton.type = "button";
  cancelButton.addEventListener("click", () => dialog.close());
  const saveButton = createElement("button", "button button--primary", "Guardar rol");
  saveButton.type = "submit";
  dialogActions.append(cancelButton, saveButton);
  roleForm.append(roleFieldset, dialogActions);
  dialogContent.append(dialogHeader, detailList, roleForm);
  dialog.append(dialogContent);

  root.append(title, lead, limitations, summary, toolbar, loadStatus, error, tableCard, dialog);
  outlet.replaceChildren(root);

  let users = [];
  let currentPage = 1;
  let hasLoaded = false;
  let selectedUser = null;
  let requestVersion = 0;

  function updateSummary() {
    summary.replaceChildren();
    const cards = [
      ["Total de usuarios", users.length],
      ["Estudiantes", users.filter((user) => user.role === ROLE.STUDENT).length],
      ["Facilitadores", users.filter((user) => user.role === ROLE.FACILITATOR).length],
      ["Monitores", users.filter((user) => user.role === ROLE.MONITOR).length],
      ["Administradores", users.filter((user) => user.role === ROLE.ADMINISTRATOR).length],
      ["Cuentas activas", users.filter((user) => user.account_status === "activo").length],
      ["Cuentas suspendidas", users.filter((user) => user.account_status === "suspendido").length],
      ["Otros estados", users.filter((user) => !["activo", "suspendido"].includes(user.account_status)).length],
      ["Otros roles", users.filter((user) => !Object.hasOwn(ROLE_LABELS, user.role)).length],
    ];

    for (const [label, count] of cards) {
      const card = createElement("article", "admin-summary-card");
      card.append(
        createElement("p", "admin-summary-card__label", label),
        createElement("p", "admin-summary-card__value", String(count)),
      );
      summary.append(card);
    }
  }

  function updateFilterOptions() {
    const selectedRole = roleFilter.value;
    roleFilter.replaceChildren(createOption("", "Todos los roles"));
    const roles = new Set([
      ...Object.keys(ROLE_LABELS),
      ...users.map((user) => user.role).filter(Boolean),
    ]);
    for (const role of [...roles].sort()) {
      roleFilter.append(createOption(role, roleLabel(role)));
    }
    roleFilter.value = roles.has(selectedRole) ? selectedRole : "";

    const selectedStatus = statusFilter.value;
    statusFilter.replaceChildren(createOption("", "Todos los estados"));
    const statuses = [...new Set(users.map((user) => user.account_status).filter(Boolean))].sort();
    for (const status of statuses) {
      statusFilter.append(createOption(status, statusLabel(status)));
    }
    statusFilter.value = statuses.includes(selectedStatus) ? selectedStatus : "";
  }

  function getFilteredUsers() {
    const query = search.value.trim().toLocaleLowerCase("es-MX");
    const filtered = users.filter((user) => {
      const matchesQuery = !query
        || `${user.full_name || ""} ${user.email || ""}`.toLocaleLowerCase("es-MX").includes(query);
      const matchesRole = !roleFilter.value || user.role === roleFilter.value;
      const matchesStatus = !statusFilter.value || user.account_status === statusFilter.value;
      return matchesQuery && matchesRole && matchesStatus;
    });

    const direction = dateSort.value === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const first = Date.parse(a.registered_at || "");
      const second = Date.parse(b.registered_at || "");
      if (Number.isNaN(first) && Number.isNaN(second)) {
        return 0;
      }
      if (Number.isNaN(first)) {
        return 1;
      }
      if (Number.isNaN(second)) {
        return -1;
      }
      return (first - second) * direction;
    });
  }

  function openUserDetail(user) {
    selectedUser = user;
    dialogTitle.textContent = user.full_name || "Usuario sin nombre";
    detailList.replaceChildren();
    appendDetailRow(detailList, "Nombre completo", user.full_name);
    appendDetailRow(detailList, "Correo electrónico", user.email);
    appendDetailRow(detailList, "Rol actual", roleLabel(user.role));
    appendDetailRow(detailList, "Estado", statusLabel(user.account_status));
    appendDetailRow(detailList, "Programa académico", user.program_name);
    appendDetailRow(detailList, "Fecha de registro", formatDate(user.registered_at));
    appendDetailRow(detailList, "Último acceso", formatDate(user.last_sign_in_at));

    roleInput.replaceChildren();
    if (user.role && !ROLE_LABELS[user.role]) {
      roleInput.append(createOption(user.role, roleLabel(user.role)));
    }
    for (const role of Object.keys(ROLE_LABELS)) {
      const option = createOption(role, roleLabel(role));
      if (user.role === ROLE.ADMINISTRATOR && role !== ROLE.ADMINISTRATOR) {
        option.disabled = true;
      }
      roleInput.append(option);
    }
    roleInput.value = user.role || "";
    roleMessage.textContent = user.role === ROLE.ADMINISTRATOR
      ? "La función existente no serializa cambios simultáneos de administradores. Para evitar dejar SSAP sin administrador, el rol de cuentas administradoras no se puede reducir desde esta interfaz."
      : "";
    saveButton.disabled = user.role === ROLE.ADMINISTRATOR;
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  function renderTable() {
    const filteredUsers = getFilteredUsers();
    const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pageCount);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageUsers = filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);
    tableBody.replaceChildren();

    for (const user of pageUsers) {
      const row = document.createElement("tr");
      const values = [
        user.full_name || "No disponible",
        user.email || "No disponible",
        roleLabel(user.role),
        statusLabel(user.account_status),
        user.program_name || "No asignado",
        formatDate(user.registered_at),
        formatDate(user.last_sign_in_at),
      ];
      for (const [index, value] of values.entries()) {
        const cell = document.createElement("td");
        if (index === 3) {
          cell.append(createElement(
            "span",
            `admin-status-badge ${user.account_status === "activo" ? "admin-status-badge--active" : "admin-status-badge--inactive"}`,
            value,
          ));
        } else {
          cell.textContent = value;
        }
        row.append(cell);
      }

      const actions = createElement("td", "admin-table__actions");
      const detailButton = createElement("button", "button button--secondary", "Consultar y cambiar rol");
      detailButton.type = "button";
      detailButton.addEventListener("click", () => openUserDetail(user));
      actions.append(detailButton);
      row.append(actions);
      tableBody.append(row);
    }

    emptyState.hidden = filteredUsers.length > 0 || !hasLoaded;
    emptyState.textContent = users.length === 0
      ? "No hay usuarios registrados para mostrar."
      : "No se encontraron usuarios con esos criterios.";
    tableWrapper.hidden = filteredUsers.length === 0;
    pagination.hidden = filteredUsers.length === 0;
    paginationStatus.textContent = filteredUsers.length
      ? `Mostrando ${startIndex + 1}–${Math.min(startIndex + PAGE_SIZE, filteredUsers.length)} de ${filteredUsers.length}`
      : "";
    previousButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= pageCount;
  }

  async function loadUsers() {
    const thisRequest = ++requestVersion;
    refreshButton.disabled = true;
    root.setAttribute("aria-busy", "true");
    error.hidden = true;
    loadStatus.textContent = "Cargando usuarios…";

    try {
      const client = await getSupabaseClient();
      const { data, error: requestError } = await client.rpc("admin_list_ssap_users");
      if (requestError) {
        throw requestError;
      }
      if (!Array.isArray(data)) {
        throw new Error("La función admin_list_ssap_users no devolvió una lista.");
      }
      if (thisRequest !== requestVersion) {
        return;
      }

      users = data;
      hasLoaded = true;
      currentPage = 1;
      updateFilterOptions();
      updateSummary();
      renderTable();
      loadStatus.textContent = `${users.length} ${users.length === 1 ? "usuario cargado" : "usuarios cargados"}.`;
    } catch (requestError) {
      if (thisRequest !== requestVersion) {
        return;
      }
      console.error("[SSAP admin] No fue posible consultar usuarios.", requestError);
      error.textContent = errorMessage(requestError, "list");
      error.hidden = false;
      loadStatus.textContent = "";
    } finally {
      if (thisRequest === requestVersion) {
        refreshButton.disabled = false;
        root.removeAttribute("aria-busy");
      }
    }
  }

  async function saveRole() {
    if (!selectedUser) {
      return;
    }
    const newRole = roleInput.value;
    if (!newRole || newRole === selectedUser.role) {
      return;
    }
    if (selectedUser.role === ROLE.ADMINISTRATOR && newRole !== ROLE.ADMINISTRATOR) {
      roleMessage.textContent = "No se puede reducir el rol de una cuenta administradora desde esta interfaz.";
      return;
    }
    if (selectedUser.id === administratorId && newRole !== ROLE.ADMINISTRATOR) {
      roleMessage.textContent = "No puedes retirar tu propio rol de administrador.";
      return;
    }

    const userName = selectedUser.full_name || selectedUser.email || "este usuario";
    if (!window.confirm(
      `Vas a cambiar el rol de ${userName} de “${roleLabel(selectedUser.role)}” a “${roleLabel(newRole)}”. ¿Deseas continuar?`,
    )) {
      return;
    }

    roleInput.disabled = true;
    saveButton.disabled = true;
    cancelButton.disabled = true;
    closeDialogButton.disabled = true;
    roleMessage.textContent = "Guardando cambio de rol…";

    try {
      const client = await getSupabaseClient();
      const { error: requestError } = await client.rpc("change_ssap_user_role", {
        p_user_id: selectedUser.id,
        p_new_role: newRole,
      });
      if (requestError) {
        throw requestError;
      }
      roleMessage.textContent = "El backend confirmó el cambio. Actualizando el listado…";
      dialog.close();
      await loadUsers();
    } catch (requestError) {
      console.error("[SSAP admin] No fue posible cambiar el rol.", requestError);
      roleMessage.textContent = errorMessage(requestError, "update");
    } finally {
      roleInput.disabled = false;
      saveButton.disabled = selectedUser?.role === ROLE.ADMINISTRATOR;
      cancelButton.disabled = false;
      closeDialogButton.disabled = false;
    }
  }

  for (const control of [search, roleFilter, statusFilter, dateSort]) {
    control.addEventListener("input", () => {
      currentPage = 1;
      renderTable();
    });
    control.addEventListener("change", () => {
      currentPage = 1;
      renderTable();
    });
  }
  previousButton.addEventListener("click", () => {
    currentPage -= 1;
    renderTable();
  });
  nextButton.addEventListener("click", () => {
    currentPage += 1;
    renderTable();
  });

  renderTable();
  void loadUsers();
}
