<script>
  import { onMount, onDestroy } from "svelte";
  import { TabulatorFull as Tabulator } from "tabulator-tables";
  import "tabulator-tables/dist/css/tabulator.min.css";

  let el; // div ref
  let table; // Tabulator instance

  // your data (can be loaded async)
  let rows = [
    { id: 1, name: "Alpha", status: "queued", createdAt: Date.now() },
    { id: 2, name: "Beta", status: "done", createdAt: Date.now() - 3600000 },
  ];

  const columns = [
    { title: "Name", field: "name", editor: "input", width: 170 },
    {
      title: "Status",
      field: "status",
      editor: "list",
      width: 170,
      editorParams: { values: ["queued", "running", "done", "error"] },
    },
    {
      title: "Created",
      field: "createdAt",
      sorter: "number",
      formatter: (cell) => new Date(cell.getValue()).toLocaleString(),
    },
    {
      title: "",
      width: 44,
      hozAlign: "center",
      formatter: "buttonCross",
      cellClick: (_e, cell) => table?.deleteRow(cell.getRow()),
    },
  ];

  onMount(() => {
    table = new Tabulator(el, {
      data: rows,
      columns,
      responsiveLayout: "hide",
      layout: "fitDataFill",
      reactiveData: true, // mutate `rows` and table updates
      height: 420,
      width: "1200px",
    });
  });

  onDestroy(() => table?.destroy());
</script>

<div bind:this={el} />
