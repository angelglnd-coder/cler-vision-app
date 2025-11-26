<script>
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import Separator from '$lib/components/ui/separator/separator.svelte';

  let minimizeToTray = $state(false);
  let closeToTray = $state(false);
  let startMinimized = $state(false);
  let showNotifications = $state(true);
  let isSaving = $state(false);
  let saveSuccess = $state(false);

  onMount(async () => {
    try {
      const settings = await window.api.settings.get();
      minimizeToTray = settings.tray.minimizeToTray;
      closeToTray = settings.tray.closeToTray;
      startMinimized = settings.tray.startMinimized;
      showNotifications = settings.tray.showNotifications;
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  });

  async function saveSettings() {
    isSaving = true;
    saveSuccess = false;

    try {
      const result = await window.api.settings.update({
        tray: {
          minimizeToTray,
          closeToTray,
          startMinimized,
          showNotifications
        }
      });

      if (result.success) {
        saveSuccess = true;
        setTimeout(() => {
          saveSuccess = false;
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="container mx-auto max-w-2xl p-6">
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Preferences</h1>
      <p class="text-muted-foreground mt-2">
        Manage your application settings and preferences
      </p>
    </div>

    <Separator />

    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-semibold mb-4">System Tray</h2>
        <p class="text-sm text-muted-foreground mb-4">
          Configure how the application behaves with the Windows system tray
        </p>

        <div class="space-y-4">
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={minimizeToTray}
              class="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
            />
            <div class="flex-1">
              <div class="font-medium">Minimize to system tray</div>
              <div class="text-sm text-muted-foreground">
                When enabled, clicking the minimize button will hide the app to the system tray instead of the taskbar
              </div>
            </div>
          </label>

          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={closeToTray}
              class="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
            />
            <div class="flex-1">
              <div class="font-medium">Close to system tray</div>
              <div class="text-sm text-muted-foreground">
                When enabled, closing the window will keep the app running in the system tray instead of quitting
              </div>
            </div>
          </label>

          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={startMinimized}
              class="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
            />
            <div class="flex-1">
              <div class="font-medium">Start minimized to tray</div>
              <div class="text-sm text-muted-foreground">
                When enabled, the application will start hidden in the system tray
              </div>
            </div>
          </label>

          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={showNotifications}
              class="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
            />
            <div class="flex-1">
              <div class="font-medium">Show tray notifications</div>
              <div class="text-sm text-muted-foreground">
                Display balloon notifications when the app is minimized to the system tray
              </div>
            </div>
          </label>
        </div>
      </div>

      <Separator />

      <div class="flex items-center gap-4">
        <Button onclick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>

        {#if saveSuccess}
          <span class="text-sm text-green-600 dark:text-green-400">
            Settings saved successfully!
          </span>
        {/if}
      </div>

      {#if process.platform !== 'win32'}
        <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
          <p class="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> System tray functionality is only available on Windows.
            These settings will have no effect on your current platform.
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>
