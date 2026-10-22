import { getProfileByUserId } from "./auth.js";
import { getSupabaseClient } from "./supabaseClient.js";

const listeners = new Set();
let state = {
  status: "loading",
  session: null,
  user: null,
  profile: null,
  error: null,
};
let initialization;
let authSubscription;
let requestId = 0;

function publish(nextState) {
  state = nextState;
  for (const listener of listeners) {
    listener(state);
  }
}

async function acceptSession(session) {
  const currentRequest = ++requestId;
  if (!session?.user) {
    publish({
      status: "unauthenticated",
      session: null,
      user: null,
      profile: null,
      error: null,
    });
    return;
  }

  publish({
    status: "loading",
    session,
    user: session.user,
    profile: null,
    error: null,
  });

  try {
    const profile = await getProfileByUserId(session.user.id);
    if (currentRequest !== requestId) {
      return;
    }
    publish({
      status: profile ? "authenticated" : "error",
      session,
      user: session.user,
      profile,
      error: profile ? null : new Error("No se encontró un perfil para esta cuenta."),
    });
  } catch (error) {
    if (currentRequest !== requestId) {
      return;
    }
    publish({
      status: "error",
      session,
      user: session.user,
      profile: null,
      error,
    });
  }
}

function initializeAuthState() {
  if (initialization) {
    return initialization;
  }

  initialization = (async () => {
    try {
      const client = await getSupabaseClient();
      const { data, error } = await client.auth.getSession();
      if (error) {
        throw error;
      }

      void acceptSession(data.session);
      const { data: subscriptionData } = client.auth.onAuthStateChange((event, session) => {
        if (
          event === "INITIAL_SESSION"
          && state.session?.user?.id === session?.user?.id
        ) {
          return;
        }
        void acceptSession(session);
      });
      authSubscription = subscriptionData.subscription;
    } catch (error) {
      publish({
        status: "error",
        session: null,
        user: null,
        profile: null,
        error,
      });
    }
  })();

  return initialization;
}

export function subscribeToAuthState(listener) {
  listeners.add(listener);
  listener(state);
  void initializeAuthState();

  return () => {
    listeners.delete(listener);
  };
}

export async function refreshAuthState() {
  if (state.status === "error" && !state.session) {
    authSubscription?.unsubscribe();
    authSubscription = null;
    initialization = null;
    publish({
      status: "loading",
      session: null,
      user: null,
      profile: null,
      error: null,
    });
  }
  await initializeAuthState();
  if (state.session) {
    await acceptSession(state.session);
  }
  return state;
}

export function getAuthState() {
  return state;
}
