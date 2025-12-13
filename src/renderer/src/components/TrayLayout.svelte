<script>
  // Optional props for future extensibility
  export let rows = 10;
  export let cols = 10;
  export let title = "Tray Layout";
</script>

<div class="tray-layout-page">
  <h2>{title}</h2>
  <table class="tray-grid">
    <tbody>
      {#each Array(rows) as _, rowIndex}
        <tr>
          {#each Array(cols) as _, colIndex}
            {@const position = rowIndex * cols + colIndex + 1}
            <td class="tray-cell">
              <div class="tray-circle">
                <span class="tray-number">{position}</span>
              </div>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  /* Show on screen for debugging - TEMPORARY */
  .tray-layout-page {
    display: block;
    border: 2px dashed red;
    margin-top: 2rem;
  }

  /* Show and style for print */
  @media print {
    .tray-layout-page {
      display: block !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      padding: 1cm;
      background: white;
      position: relative;
      border: none !important;
    }

    .tray-layout-page h2 {
      font-size: 16pt;
      margin-bottom: 0.5cm;
      text-align: center;
      color: black;
      border-bottom: 2px solid #333;
      padding-bottom: 0.2cm;
    }

    .tray-grid {
      width: 100%;
      max-width: 18cm;
      margin: 0 auto;
      border-collapse: separate;
      border-spacing: 0;
      table-layout: fixed;
    }

    .tray-grid td {
      width: 10%;
      padding: 0.1cm;
      border: none;
      text-align: center;
      vertical-align: middle;
    }

    .tray-circle {
      width: 100%;
      aspect-ratio: 1 / 1;
      border: 2px solid #333;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      max-width: 1.6cm;
      max-height: 1.6cm;
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .tray-number {
      font-size: 8pt;
      font-weight: 600;
      color: #333;
      text-align: center;
      line-height: 1;
    }

    .tray-grid tr {
      page-break-inside: avoid;
    }
  }
</style>
