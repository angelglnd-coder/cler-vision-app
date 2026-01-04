<script>
  let { api, row, column } = $props();

  // Get selectedRowIds from column config (passed from parent)
  let selectedRowIds = $derived(column.selectedRowIds || []);
  let isChecked = $derived(selectedRowIds.includes(row.id));

  function handleClick(e) {
    e.stopPropagation();

    // Trigger custom callback that parent can handle
    if (column.onToggle) {
      column.onToggle(row.id, !isChecked);
    }
  }
</script>

<input
  type="checkbox"
  checked={isChecked}
  onclick={handleClick}
  style="cursor: pointer; width: 16px; height: 16px;"
/>
