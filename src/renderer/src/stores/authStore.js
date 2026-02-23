import { createActor } from "xstate";
import { authMachine } from "../machines/authMachine.js";

/**
 * Singleton auth actor — started at module load time so checkingSession
 * (a synchronous localStorage read) completes before any Svelte component mounts.
 *
 * Import this in components, pages, and the axios config to share one machine instance.
 */
export const authActor = createActor(authMachine);
authActor.start();

/** Returns the current access token, or null if unauthenticated. */
export const getAccessToken = () => authActor.getSnapshot().context.accessToken;

/** Returns true when the machine is in the 'authenticated' state. */
export const isAuthenticated = () => authActor.getSnapshot().matches("authenticated");

/** Send an event to the auth machine from anywhere (components, interceptors, etc.). */
export const sendAuthEvent = (event) => authActor.send(event);
