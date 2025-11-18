<script>
  // JS-friendly import. If you're TS, you can use lang="ts".
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Settings, ChevronDown, ListCheckIcon, PackagePlus, Combine, LogOut, Briefcase } from "@lucide/svelte";
  import { p, isActive } from "../router/router";
  import { useSidebar } from "$lib/components/ui/sidebar/context.svelte.js";

  const sidebar = useSidebar();
</script>

<Sidebar.Root collapsible="icon" variant="sidebar">
  <Sidebar.Header class="px-2">
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Tooltip.Provider>
          <Tooltip.Root open={sidebar.state === "collapsed" ? undefined : false}>
            <Tooltip.Trigger asChild>
              <Sidebar.MenuButton>
                <Briefcase class="size-4 min-h-4 min-w-4 shrink-0" />
                <span>My Workspace</span>
                <ChevronDown class="ml-auto size-4 min-h-4 min-w-4 shrink-0" />
              </Sidebar.MenuButton>
            </Tooltip.Trigger>
            <Tooltip.Content side="right">My Workspace</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
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
          <Sidebar.MenuButton>
            <a
              href={p("/")}
              use:isActiveLink={{ className: "bg-accent text-accent-foreground" }}
              class="flex items-center gap-2"
            >
              <PackagePlus class="size-4" /> <span>Work Orders</span>
            </a>
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
        <Sidebar.MenuItem>
          <Sidebar.MenuButton>
            <a
              href={p("/queuefiles")}
              use:isActiveLink={{ className: "bg-accent text-accent-foreground" }}
              class="flex items-center gap-2"
            >
              <Combine class="size-4" /> <span>QUE Files</span>
            </a>
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    </Sidebar.Group>

    <!-- Group 2 (collapsible) -->
    <Sidebar.Group>
      <Sidebar.GroupLabel>Settings</Sidebar.GroupLabel>
      <Sidebar.Menu>
        <Sidebar.MenuItem>
          <Sidebar.MenuButton>
            <Settings class="size-4" />
            <span>Preferences</span>
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    </Sidebar.Group>
  </Sidebar.Content>

  <Sidebar.Footer class="px-2">
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton>Logout</Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Footer>

  <Sidebar.Rail />
  <!-- clickable rail to toggle -->
</Sidebar.Root>
