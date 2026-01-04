<script>
  import { onMount } from "svelte";
  import JsBarcode from "jsbarcode";

  export let value = "";
  export let format = "CODE128";
  export let width = 1.5;
  export let height = 30;
  export let displayValue = false;
  export let fontSize = 8;
  export let margin = 2;

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
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch (err) {
      error = true;
      console.error("Small barcode generation error:", err);
    }
  }
</script>

<style>
  .small-barcode {
    display: inline-block;
  }

  .error {
    color: #ef4444;
    font-size: 0.75rem;
  }

  canvas {
    display: block;
    max-width: 100%;
    height: auto;
  }
</style>

{#if error}
  <div class="error">Invalid barcode</div>
{:else}
  <div class="small-barcode">
    <canvas bind:this={canvas}></canvas>
  </div>
{/if}
