import type { APIRoute } from 'astro';
import { emptyClientAuth, toClientAuth } from '../../shared.js';

// Client session endpoint. Returns the client-safe auth snapshot (no tokens)
// for the auth store to hydrate from. Populated by the auth middleware.
export const GET: APIRoute = (context) => {
  const auth = context.locals.auth;
  return Response.json(auth ? toClientAuth(auth) : emptyClientAuth());
};
