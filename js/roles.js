export const ROLE = {
  ADMINISTRATOR: "administrador",
  STUDENT: "estudiante",
  FACILITATOR: "facilitador",
  MONITOR: "monitor",
};

export const RECOGNIZED_ROLES = new Set(Object.values(ROLE));

export const ROLE_HOME = {
  [ROLE.STUDENT]: "/dashboard/inicio",
  [ROLE.ADMINISTRATOR]: "/admin/inicio",
  [ROLE.FACILITATOR]: "/area-pendiente",
  [ROLE.MONITOR]: "/area-pendiente",
};
