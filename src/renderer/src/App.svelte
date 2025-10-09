<script>
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "../src/components/AppSidebar.svelte";
</script>

<Sidebar.Provider>
  <AppSidebar />
  <main class="min-h-screen">
    <div class="p-2">
      <Sidebar.Trigger /> <!-- toggles the sidebar -->
    </div>

    <section class="p-4">
      <h1 class="text-2xl font-semibold">Hello Sidebar</h1>
      <p>Content goes here.</p>
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
