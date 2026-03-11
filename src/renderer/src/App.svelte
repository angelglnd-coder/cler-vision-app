<script>
  import { onDestroy } from "svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "../src/components/AppSidebar.svelte";
  import EnvironmentBadge from "../src/components/EnvironmentBadge.svelte";
  import Login from "../src/pages/Login.svelte";
  import { Router } from "sv-router";
  import "../src/router/router";
  import { authActor } from "../src/stores/authStore.js";

  let state = $state(authActor.getSnapshot());

  // Subscribe synchronously so the callback is active before the fromPromise
  // microtask fires and transitions checkingSession → unauthenticated.
  const _sub = authActor.subscribe((s) => { state = s; });
  onDestroy(() => _sub.unsubscribe());

  // Show main layout while authenticated or during brief transient states
  // (refreshing / loggingOut) to avoid a flash back to the login screen.
  let isChecking = $derived(state.matches("checkingSession"));
  let showApp    = $derived(
    state.matches("authenticated") ||
    state.matches("refreshing")    ||
    state.matches("loggingOut")
  );
</script>

<EnvironmentBadge />

{#if isChecking}
  <div class="flex h-screen items-center justify-center text-sm text-muted-foreground">
    Loading…
  </div>

{:else if showApp}
  <Sidebar.Provider>
    <AppSidebar />
    <main class="flex h-screen flex-col overflow-hidden">
      <div class="p-2">
        <Sidebar.Trigger />
        <!-- toggles the sidebar -->
      </div>

      <section class="min-h-0 flex-1 overflow-hidden p-4">
        <Router />
      </section>
    </main>
  </Sidebar.Provider>

{:else}
  <Login />
{/if}
