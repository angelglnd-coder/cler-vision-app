<script>
  // JS-friendly import. If you're TS, you can use lang="ts".
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import {
    Settings,
    ChevronDown,
    ListCheckIcon,
    PackagePlus,
    Combine,
    LogOut,
    Briefcase,
  } from "@lucide/svelte";
  import { p, isActive } from "../router/router";

  const appVersion = window.api.app.version;
</script>

<Sidebar.Root collapsible="icon" variant="sidebar">
  <Sidebar.Header class="px-2">
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton tooltipContent="My Workspace">
          <Briefcase class="size-4 min-h-4 min-w-4 shrink-0" />
          <span>My Workspace</span>
          <ChevronDown class="ml-auto size-4 min-h-4 min-w-4 shrink-0" />
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>

  <Sidebar.Content>
    <!-- Group 1 -->
    <Sidebar.Group>
      <Sidebar.GroupLabel>General</Sidebar.GroupLabel>
      <Sidebar.Menu>
        <!-- <Sidebar.MenuItem>
          <Sidebar.MenuButton>
            <a href={p('/')}
               use:isActiveLink={{ className: "bg-accent text-accent-foreground" }}
               class="flex items-center gap-2">
              <PackagePlus class="size-4" />  <span>Batch Orders</span>
            </a>
          </Sidebar.MenuButton>
        </Sidebar.MenuItem> -->
        <Sidebar.MenuItem>
          <Sidebar.MenuButton isActive={isActive("/")} tooltipContent="Work Orders">
            {#snippet child({ props })}
              <a href={p("/")} {...props}>
                <PackagePlus class="size-4 min-h-4 min-w-4 shrink-0" />
                <span>Work Orders</span>
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
        <Sidebar.MenuItem>
          <Sidebar.MenuButton isActive={isActive("/queuefiles")} tooltipContent="QUE Files">
            {#snippet child({ props })}
              <a href={p("/queuefiles")} {...props}>
                <Combine class="size-4 min-h-4 min-w-4 shrink-0" />
                <span>QUE Files</span>
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    </Sidebar.Group>

    <!-- Group 2 (collapsible) -->
    <Sidebar.Group>
      <Sidebar.GroupLabel>Settings</Sidebar.GroupLabel>
      <Sidebar.Menu>
        <Sidebar.MenuItem>
          <Sidebar.MenuButton isActive={isActive("/preferences")} tooltipContent="Preferences">
            {#snippet child({ props })}
              <a href={p("/preferences")} {...props}>
                <Settings class="size-4 min-h-4 min-w-4 shrink-0" />
                <span>Preferences</span>
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    </Sidebar.Group>
  </Sidebar.Content>

  <Sidebar.Footer class="px-2">
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton tooltipContent="Logout">
          <LogOut class="size-4 min-h-4 min-w-4 shrink-0" />
          <span>Logout</span>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
    <div
      class="text-muted-foreground mt-2 px-3 py-2 text-xs group-data-[collapsible=icon]:rotate-180 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:text-center group-data-[collapsible=icon]:[writing-mode:vertical-rl]"
    >
      <span>v{appVersion}</span>
    </div>
  </Sidebar.Footer>

  <Sidebar.Rail />
  <!-- clickable rail to toggle -->
</Sidebar.Root>
