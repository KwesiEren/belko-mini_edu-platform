export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const liveRegion = document.getElementById('a11y-live-region') || createLiveRegion();
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.textContent = '';
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);
}

function createLiveRegion(): HTMLElement {
  const region = document.createElement('div');
  region.id = 'a11y-live-region';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.style.cssText = 'position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;';
  document.body.appendChild(region);
  return region;
}

export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleTab(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }

  element.addEventListener('keydown', handleTab);
  firstElement?.focus();

  return () => {
    element.removeEventListener('keydown', handleTab);
  };
}

export function setFocusVisible(): void {
  const style = document.createElement('style');
  style.textContent = `
    :focus:not(:focus-visible) {
      outline: none;
    }
    :focus-visible {
      outline: 2px solid #2d827b;
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
}

export function reduceMotionEnabled(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function onReduceMotionChange(callback: (enabled: boolean) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mediaQuery.addEventListener?.('change', handler);
  return () => mediaQuery.removeEventListener?.('change', handler);
}

export function createKeyboardNavigation(root: HTMLElement): void {
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const target = e.target as HTMLElement;
      if (target.hasAttribute('role') && target.getAttribute('role') === 'button') {
        e.preventDefault();
        target.click();
      }
    }
  });
}

export function enhanceTableAccessibility(table: HTMLTableElement): void {
  const headers = table.querySelectorAll('th');
  headers.forEach((th, index) => {
    th.setAttribute('scope', 'col');
    th.setAttribute('id', `col-${index}`);
  });

  const rows = table.querySelectorAll('tbody tr');
  rows.forEach((row, rowIndex) => {
    const firstCell = row.querySelector('td, th');
    if (firstCell) {
      firstCell.setAttribute('scope', 'row');
    }
    row.setAttribute('role', 'row');
  });

  table.setAttribute('role', 'table');
}

export function addSkipLink(): void {
  if (document.getElementById('skip-link')) return;

  const skipLink = document.createElement('a');
  skipLink.id = 'skip-link';
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.style.cssText = `
    position: absolute;
    top: -100%;
    left: 50%;
    transform: translateX(-50%);
    background: #183b3d;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    z-index: 10000;
    text-decoration: none;
    font-weight: 600;
  `;
  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '8px';
  });
  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-100%';
  });
  document.body.prepend(skipLink);
}

export function ensureAriaLabels(): void {
  document.querySelectorAll('[aria-label]').forEach(el => {
    const label = el.getAttribute('aria-label');
    if (label && label.trim() === '') {
      el.removeAttribute('aria-label');
    }
  });

  document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(input => {
    const id = input.id;
    const label = id ? document.querySelector(`label[for="${id}"]`) : null;
    if (label?.textContent) {
      input.setAttribute('aria-label', label.textContent.trim());
    }
  });
}

export function initializeAccessibility(): void {
  addSkipLink();
  setFocusVisible();
  ensureAriaLabels();
  
  const main = document.querySelector('main') || document.getElementById('root');
  if (main) {
    main.setAttribute('id', 'main-content');
    main.setAttribute('role', 'main');
  }
}