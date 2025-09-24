<script>
  import Header from './layout/Header.svelte';
  import Footer from './layout/Footer.svelte';
  import Body from './layout/Body.svelte';
  import Container from './layout/Container.svelte';
  // import 'tabulator-tables/dist/css/tabulator.min.css';
</script>

<main class="flex h-auto flex-col justify-between bg-gray-100 md:h-screen">
  <Header />
  <Container>
    <!-- <div class="flex flex-col justify-between gap-8 py-8 md:flex-row md:gap-0 md:py-0"> -->
    <Body />
    <!-- </div> -->
  </Container>
  <Footer />
</main>
