/**
 * WCAG Accessibility Utilities
 * Comprehensive accessibility helpers for WCAG 2.1 AA compliance
 */

import React, { useEffect, useRef, useCallback } from 'react';

// ==================== Screen Reader Utilities ====================

/**
 * Announce text to screen readers
 * @param message - Text to announce
 * @param priority - 'polite' for non-urgent, 'assertive' for important
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  
  // Visually hidden but accessible
  announcement.style.cssText = `
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  `;
  
  document.body.appendChild(announcement);
  
  // Small delay ensures screen reader picks up the announcement
  setTimeout(() => {
    announcement.textContent = message;
    
    // Clean up after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, 100);
}

// ==================== Focus Management ====================

/**
 * Custom hook for managing focus on route changes
 */
export function useFocusOnRouteChange(): void {
  const isFirstRender = useRef(true);
  
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Find and focus the main content area
    const mainContent = document.querySelector('main, [role="main"]');
    if (mainContent instanceof HTMLElement) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      mainContent.removeAttribute('tabindex');
    }
  }, []);
}

/**
 * Skip to main content link
 */
export const SkipToMainContent: React.FC<{ mainContentId?: string }> = ({
  mainContentId = 'main-content'
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const mainContent = document.getElementById(mainContentId);
    if (mainContent) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <a
      href={`#${mainContentId}`}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      onFocus={(e) => {
        const target = e.target as HTMLElement;
        target.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: auto;
          height: auto;
          overflow: visible;
          padding: 16px 24px;
          background: #1976d2;
          color: white;
          z-index: 10000;
          font-weight: 600;
          text-decoration: none;
          border-radius: 0 0 4px 0;
        `;
      }}
      onBlur={(e) => {
        const target = e.target as HTMLElement;
        target.style.cssText = `
          position: absolute;
          left: -10000px;
          top: auto;
          width: 1px;
          height: 1px;
          overflow: hidden;
        `;
      }}
    >
      Skip to main content
    </a>
  );
};

/**
 * Focus trap for modals and dialogs
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    // Focus first element
    firstFocusable?.focus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
  
  return containerRef;
}

// ==================== Color & Contrast ====================

/**
 * Check if color contrast meets WCAG AA requirements
 * @param foreground - Foreground color hex
 * @param background - Background color hex
 * @param isLargeText - Is text 18pt+ or 14pt+ bold
 * @returns Whether contrast is sufficient
 */
export function checkColorContrast(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(hexToRgb(color1));
  const l2 = getLuminance(hexToRgb(color2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// ==================== Keyboard Navigation ====================

/**
 * Hook for arrow key navigation in lists
 */
export function useArrowKeyNavigation<T extends HTMLElement>(
  itemCount: number,
  orientation: 'horizontal' | 'vertical' = 'vertical'
) {
  const containerRef = useRef<T>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
      const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
      
      switch (e.key) {
        case prevKey:
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
          break;
        case nextKey:
          e.preventDefault();
          setActiveIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(itemCount - 1);
          break;
      }
    },
    [itemCount, orientation]
  );
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const focusableItems = containerRef.current.querySelectorAll<HTMLElement>(
      '[role="option"], [role="menuitem"], [role="tab"], li, button'
    );
    
    focusableItems[activeIndex]?.focus();
  }, [activeIndex]);
  
  return { containerRef, activeIndex, handleKeyDown };
}

// ==================== Form Accessibility ====================

/**
 * Generate unique ID for form accessibility
 */
export function useAccessibleForm(
  fieldName: string
): {
  inputId: string;
  labelId: string;
  descriptionId: string;
  errorId: string;
  inputProps: Record<string, string>;
} {
  const baseId = React.useMemo(
    () => `${fieldName}-${Math.random().toString(36).substr(2, 9)}`,
    [fieldName]
  );
  
  return {
    inputId: baseId,
    labelId: `${baseId}-label`,
    descriptionId: `${baseId}-description`,
    errorId: `${baseId}-error`,
    inputProps: {
      id: baseId,
      'aria-labelledby': `${baseId}-label`,
      'aria-describedby': `${baseId}-description ${baseId}-error`,
    },
  };
}

/**
 * Accessible error message component
 */
export const AccessibleErrorMessage: React.FC<{
  id: string;
  error?: string;
}> = ({ id, error }) => {
  if (!error) return null;
  
  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '4px' }}
    >
      {error}
    </div>
  );
};

// ==================== Reduced Motion ====================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook for reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = React.useState(prefersReducedMotion);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return reducedMotion;
}

// ==================== ARIA Helpers ====================

/**
 * Generate ARIA props for expandable sections
 */
export function getExpandableProps(
  id: string,
  expanded: boolean
): {
  button: Record<string, string | boolean>;
  content: Record<string, string | boolean>;
} {
  return {
    button: {
      'aria-expanded': expanded,
      'aria-controls': `${id}-content`,
    },
    content: {
      id: `${id}-content`,
      role: 'region',
      'aria-labelledby': `${id}-button`,
      hidden: !expanded,
    },
  };
}

/**
 * Generate ARIA props for tabs
 */
export function getTabProps(
  tabId: string,
  panelId: string,
  selected: boolean
): {
  tab: Record<string, string | boolean>;
  panel: Record<string, string | boolean>;
} {
  return {
    tab: {
      id: tabId,
      role: 'tab',
      'aria-selected': selected,
      'aria-controls': panelId,
      tabIndex: selected ? 0 : -1,
    },
    panel: {
      id: panelId,
      role: 'tabpanel',
      'aria-labelledby': tabId,
      hidden: !selected,
      tabIndex: 0,
    },
  };
}

// ==================== Accessibility Audit Helper ====================

interface AccessibilityIssue {
  type: 'error' | 'warning';
  element: string;
  issue: string;
  wcag: string;
  fix: string;
}

/**
 * Basic accessibility audit (development only)
 */
export function runAccessibilityAudit(): AccessibilityIssue[] {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Accessibility audit should only run in development');
    return [];
  }
  
  const issues: AccessibilityIssue[] = [];
  
  // Check images without alt text
  document.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('alt')) {
      issues.push({
        type: 'error',
        element: `<img src="${img.src.substring(0, 50)}...">`,
        issue: 'Image missing alt attribute',
        wcag: '1.1.1 Non-text Content',
        fix: 'Add alt attribute describing the image, or alt="" for decorative images',
      });
    }
  });
  
  // Check buttons without accessible names
  document.querySelectorAll('button').forEach((button) => {
    const hasAccessibleName =
      button.textContent?.trim() ||
      button.getAttribute('aria-label') ||
      button.getAttribute('aria-labelledby');
    
    if (!hasAccessibleName) {
      issues.push({
        type: 'error',
        element: '<button>',
        issue: 'Button missing accessible name',
        wcag: '4.1.2 Name, Role, Value',
        fix: 'Add text content, aria-label, or aria-labelledby',
      });
    }
  });
  
  // Check form inputs without labels
  document.querySelectorAll('input, select, textarea').forEach((input) => {
    const id = input.id;
    const hasLabel =
      id && document.querySelector(`label[for="${id}"]`) ||
      input.getAttribute('aria-label') ||
      input.getAttribute('aria-labelledby');
    
    if (!hasLabel && input.getAttribute('type') !== 'hidden') {
      issues.push({
        type: 'error',
        element: `<${input.tagName.toLowerCase()} type="${input.getAttribute('type') || 'text'}">`,
        issue: 'Form input missing label',
        wcag: '1.3.1 Info and Relationships',
        fix: 'Add associated label element, aria-label, or aria-labelledby',
      });
    }
  });
  
  // Check links without discernible text
  document.querySelectorAll('a[href]').forEach((link) => {
    const hasAccessibleName =
      link.textContent?.trim() ||
      link.getAttribute('aria-label') ||
      link.querySelector('img[alt]');
    
    if (!hasAccessibleName) {
      issues.push({
        type: 'error',
        element: `<a href="${link.getAttribute('href')}">`,
        issue: 'Link missing accessible name',
        wcag: '2.4.4 Link Purpose',
        fix: 'Add link text, aria-label, or image with alt text',
      });
    }
  });
  
  // Check for heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let previousLevel = 0;
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName[1]);
    if (level > previousLevel + 1) {
      issues.push({
        type: 'warning',
        element: `<${heading.tagName.toLowerCase()}>`,
        issue: 'Heading levels skipped',
        wcag: '1.3.1 Info and Relationships',
        fix: `Heading jumps from h${previousLevel || 'none'} to h${level}. Use sequential headings.`,
      });
    }
    previousLevel = level;
  });
  
  // Log results
  if (issues.length > 0) {
    console.group('Accessibility Audit Results');
    console.log(`Found ${issues.length} issues:`);
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. [${issue.type.toUpperCase()}] ${issue.issue}`);
      console.log(`   Element: ${issue.element}`);
      console.log(`   WCAG: ${issue.wcag}`);
      console.log(`   Fix: ${issue.fix}`);
    });
    console.groupEnd();
  } else {
    console.log('✓ No accessibility issues found');
  }
  
  return issues;
}

export default {
  announceToScreenReader,
  useFocusOnRouteChange,
  SkipToMainContent,
  useFocusTrap,
  checkColorContrast,
  useArrowKeyNavigation,
  useAccessibleForm,
  AccessibleErrorMessage,
  prefersReducedMotion,
  useReducedMotion,
  getExpandableProps,
  getTabProps,
  runAccessibilityAudit,
};
