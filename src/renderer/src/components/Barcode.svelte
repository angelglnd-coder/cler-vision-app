<script>
  import { onMount } from 'svelte';
  import JsBarcode from 'jsbarcode';

  export let value = '';
  export let format = 'CODE128';
  export let width = 2;
  export let height = 50;
  export let displayValue = true;
  export let fontSize = 14;
  export let margin = 10;

  let canvas;
  let error = false;

  onMount(() => {
    generateBarcode();
  });

  $: if (canvas && value) {
    generateBarcode();
  }

  function generateBarcode() {
    if (!canvas || !value) return;

    try {
      error = false;
      JsBarcode(canvas, value, {
        format: format,
        width: width,
        height: height,
        displayValue: displayValue,
        fontSize: fontSize,
        margin: margin,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch (err) {
      error = true;
      console.error('Barcode generation error:', err);
    }
  }
</script>

<style>
  .barcode-container {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }

  .error {
    color: #ef4444;
    font-size: 0.875rem;
    padding: 8px;
  }

  canvas {
    max-width: 70%;
    height: auto;
  }
</style>

<div class="barcode-container">
  {#if error}
    <div class="error">Failed to generate barcode</div>
  {:else}
    <canvas bind:this={canvas}></canvas>
  {/if}
</div>
