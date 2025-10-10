<script>
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "../src/components/AppSidebar.svelte";
  import { Router } from 'sv-router';
  import "../src/router/router"
</script>

<Sidebar.Provider>
  <AppSidebar />
  <main class="min-h-screen">
    <div class="p-2">
      <Sidebar.Trigger /> <!-- toggles the sidebar -->
    </div>

    <section class="p-4">
      <Router />
    </section>
  </main>
</Sidebar.Provider>


<!-- <main class="flex h-auto flex-col justify-between bg-gray-100 md:h-screen">
  <Header />
  <Container>
   
    <Body />
   
  </Container>
  <Footer />
</main> -->
