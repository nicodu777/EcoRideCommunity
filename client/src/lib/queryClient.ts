/**
 * Client HTTP de l'application (fetch + React Query).
 *
 * Sécurité : chaque requête vers l'API ajoute automatiquement l'en-tête
 *   Authorization: Bearer <ID token Firebase>
 * Le serveur vérifie la signature de ce token pour savoir QUI appelle.
 * On n'envoie plus jamais l'identifiant de l'utilisateur dans le corps
 * de la requête ou dans un en-tête modifiable comme x-user-id.
 */
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";

/** Erreur HTTP lisible : le message renvoyé par l'API est affiché tel quel. */
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      /* corps vide ou non JSON */
    }
    throw new ApiError(res.status, message);
  }
}

/** Token Firebase de l'utilisateur connecté (renouvelé automatiquement par le SDK). */
async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(await authHeaders()),
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  await throwIfResNotOk(res);
  return res;
}

/** Variante qui renvoie directement le JSON (null pour une réponse 204). */
export async function apiJson<T>(method: string, url: string, data?: unknown): Promise<T> {
  const res = await apiRequest(method, url, data);
  return res.status === 204 ? (null as T) : res.json();
}

/**
 * Requêtes de l'espace employé : elles utilisent le JWT employé stocké en
 * sessionStorage (effacé à la fermeture de l'onglet), pas le token Firebase.
 */
export const EMPLOYEE_TOKEN_KEY = "employee_token";

export async function employeeRequest<T>(method: string, url: string, data?: unknown): Promise<T> {
  const token = sessionStorage.getItem(EMPLOYEE_TOKEN_KEY);
  const res = await fetch(url, {
    method,
    headers: {
      ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  await throwIfResNotOk(res);
  return res.status === 204 ? (null as T) : res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, { headers: await authHeaders() });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
