/**
 * Global fallback for broken <img> sources (e.g. files that no longer exist
 * on storage after the InsForge project migration). Installed once at app
 * startup so no component needs its own onError handler.
 */

export const IMAGE_PLACEHOLDER =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#E5E7EB"/>
      <g fill="#9CA3AF">
        <path d="M150 110h100a10 10 0 0 1 10 10v70a10 10 0 0 1-10 10H150a10 10 0 0 1-10-10v-70a10 10 0 0 1 10-10z" fill="none" stroke="#9CA3AF" stroke-width="6"/>
        <circle cx="175" cy="140" r="10"/>
        <path d="M140 190l35-30 30 25 25-20 30 25v10a10 10 0 0 1-10 10H150a10 10 0 0 1-10-10v-10z"/>
      </g>
    </svg>
  `);

export function installGlobalImageFallback(): void {
  document.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      if (target.dataset.fallbackApplied) return;

      target.dataset.fallbackApplied = 'true';
      target.src = IMAGE_PLACEHOLDER;
      target.classList.add('img-fallback');
    },
    true // 'error' doesn't bubble, so we must capture it
  );
}
