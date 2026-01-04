<script>
  let { api, column } = $props();

  // Get data from column config (passed from parent)
  let rows = $derived(column.rows || []);
  let selectedRowIds = $derived(column.selectedRowIds || []);

  let allIds = $derived(rows.map(r => r.id));
  let isAllSelected = $derived(allIds.length > 0 && allIds.every(id => selectedRowIds.includes(id)));
  let isSomeSelected = $derived(selectedRowIds.length > 0 && !isAllSelected);

  function handleClick(e) {
    e.stopPropagation();

    // Trigger custom callback that parent can handle
    if (column.onToggleAll) {
      column.onToggleAll(!isAllSelected);
    }
  }
</script>

<input
  type="checkbox"
  checked={isAllSelected}
  indeterminate={isSomeSelected}
  onclick={handleClick}
  style="cursor: pointer; width: 16px; height: 16px;"
  title={isAllSelected ? "Deselect All" : "Select All"}
/>
