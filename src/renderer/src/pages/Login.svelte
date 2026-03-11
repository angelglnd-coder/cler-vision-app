<script>
  import { onDestroy } from "svelte";
  import { authActor } from "../stores/authStore.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import Input  from "$lib/components/ui/input/input.svelte";

  let email    = $state("");
  let password = $state("");
  let state    = $state(authActor.getSnapshot());

  const _sub = authActor.subscribe((s) => { state = s; });
  onDestroy(() => _sub.unsubscribe());

  let isLoading = $derived(state.matches("loggingIn"));
  let errorMsg  = $derived(state.context.error);

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    authActor.send({ type: "LOGIN", email: email.trim(), password });
  }
</script>

<div class="flex h-screen items-center justify-center bg-background">
  <div class="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
    <div class="mb-6 text-center">
      <h1 class="text-2xl font-semibold">Sign in</h1>
      <p class="mt-1 text-sm text-muted-foreground">Cler Vision App</p>
    </div>

    {#if errorMsg}
      <div class="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {errorMsg}
      </div>
    {/if}

    <form onsubmit={handleSubmit} class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <label for="email" class="text-sm font-medium">Email</label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          bind:value={email}
          disabled={isLoading}
          required
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="password" class="text-sm font-medium">Password</label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          bind:value={password}
          disabled={isLoading}
          required
        />
      </div>

      <Button type="submit" class="w-full" disabled={isLoading}>
        {isLoading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  </div>
</div>
