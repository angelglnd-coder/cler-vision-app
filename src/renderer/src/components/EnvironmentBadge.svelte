<script>
  const env = import.meta.env.RENDERER_VITE_APP_ENV || 'development';

  const envColors = {
    development: { bg: '#3b82f6', text: '#ffffff' },
    staging: { bg: '#f59e0b', text: '#ffffff' },
    production: { bg: '#10b981', text: '#ffffff' }
  };

  const envLabels = {
    development: 'DEV',
    staging: 'STAGING',
    production: 'PROD'
  };

  const colors = envColors[env];
  const label = envLabels[env];

  // Only show badge in non-production environments
  const showBadge = env !== 'production';
</script>

{#if showBadge}
  <div
    class="env-badge"
    style="background-color: {colors.bg}; color: {colors.text};"
  >
    {label}
  </div>
{/if}

<style>
  .env-badge {
    position: fixed;
    top: 8px;
    right: 8px;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    z-index: 9999;
    pointer-events: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  @media print {
    .env-badge {
      display: none;
    }
  }
</style>
