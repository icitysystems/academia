import React, { createContext, useContext, useEffect, useRef } from 'react';

// Types
interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

interface ErrorEvent {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  url: string;
  userAgent: string;
}

interface UserInteraction {
  type: string;
  target: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface MonitoringContextType {
  trackPerformance: (metric: Omit<PerformanceMetric, 'timestamp'>) => void;
  trackError: (error: Error, componentStack?: string) => void;
  trackInteraction: (interaction: Omit<UserInteraction, 'timestamp'>) => void;
  trackPageView: (pageName: string, metadata?: Record<string, any>) => void;
  setUserId: (userId: string) => void;
}

interface MonitoringConfig {
  enabled?: boolean;
  endpoint?: string;
  sampleRate?: number;
  enableCoreWebVitals?: boolean;
  enableErrorTracking?: boolean;
  enableUserInteractions?: boolean;
}

// Configuration
const MONITORING_CONFIG = {
  endpoint: process.env.REACT_APP_MONITORING_ENDPOINT || '/api/monitoring',
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  enablePerformanceTracking: true,
  enableErrorTracking: true,
  enableUserTracking: true,
  sampleRate: 1.0, // 100% of events
};

// Generate session ID
const generateSessionId = () => {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Monitoring Context
const MonitoringContext = createContext<MonitoringContextType | null>(null);

// Queue for batching events
class EventQueue {
  private queue: any[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  add(event: any) {
    this.queue.push(event);
    
    if (this.queue.length >= MONITORING_CONFIG.batchSize) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), MONITORING_CONFIG.flushInterval);
    }
  }

  flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Send to monitoring endpoint
    this.sendEvents(events);
  }

  private async sendEvents(events: any[]) {
    try {
      await fetch(MONITORING_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
        // Use keepalive for page unload scenarios
        keepalive: true,
      });
    } catch (error) {
      // Store in localStorage for retry
      const stored = localStorage.getItem('monitoring_failed_events') || '[]';
      const failedEvents = JSON.parse(stored);
      failedEvents.push(...events);
      localStorage.setItem('monitoring_failed_events', JSON.stringify(failedEvents.slice(-100)));
    }
  }
}

// Provider Component
export const MonitoringProvider: React.FC<{ 
  children: React.ReactNode;
  config?: MonitoringConfig;
}> = ({ children, config }) => {
  const sessionId = useRef(generateSessionId());
  const userId = useRef<string | null>(null);
  const eventQueue = useRef(new EventQueue());

  // Merge provided config with defaults
  const mergedConfig = {
    ...MONITORING_CONFIG,
    ...(config && {
      endpoint: config.endpoint || MONITORING_CONFIG.endpoint,
      sampleRate: config.sampleRate ?? MONITORING_CONFIG.sampleRate,
      enablePerformanceTracking: config.enableCoreWebVitals ?? MONITORING_CONFIG.enablePerformanceTracking,
      enableErrorTracking: config.enableErrorTracking ?? MONITORING_CONFIG.enableErrorTracking,
      enableUserTracking: config.enableUserInteractions ?? MONITORING_CONFIG.enableUserTracking,
    }),
  };
  
  const isEnabled = config?.enabled !== false;

  // Set up performance observer
  useEffect(() => {
    if (!isEnabled || !mergedConfig.enablePerformanceTracking) return;

    // Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          trackPerformance({
            name: 'LCP',
            value: entry.startTime,
            unit: 'ms',
          });
        } else if (entry.entryType === 'first-input') {
          const fidEntry = entry as PerformanceEventTiming;
          trackPerformance({
            name: 'FID',
            value: fidEntry.processingStart - fidEntry.startTime,
            unit: 'ms',
          });
        } else if (entry.entryType === 'layout-shift') {
          const clsEntry = entry as any;
          if (!clsEntry.hadRecentInput) {
            trackPerformance({
              name: 'CLS',
              value: clsEntry.value,
              unit: 'score',
            });
          }
        }
      }
    });

    try {
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      observer.observe({ type: 'first-input', buffered: true });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // PerformanceObserver not supported
    }

    // Navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          trackPerformance({
            name: 'TTFB',
            value: navigation.responseStart - navigation.requestStart,
            unit: 'ms',
          });
          trackPerformance({
            name: 'DOMContentLoaded',
            value: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            unit: 'ms',
          });
          trackPerformance({
            name: 'PageLoad',
            value: navigation.loadEventEnd - navigation.fetchStart,
            unit: 'ms',
          });
        }
      }, 0);
    });

    return () => observer.disconnect();
  }, []);

  // Set up global error handler
  useEffect(() => {
    if (!MONITORING_CONFIG.enableErrorTracking) return;

    const handleError = (event: ErrorEvent) => {
      trackError(new Error(event.message));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    };

    window.addEventListener('error', handleError as any);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError as any);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Flush on page unload
  useEffect(() => {
    const handleUnload = () => {
      eventQueue.current.flush();
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        eventQueue.current.flush();
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  // Retry failed events on load
  useEffect(() => {
    const stored = localStorage.getItem('monitoring_failed_events');
    if (stored) {
      try {
        const events = JSON.parse(stored);
        if (events.length > 0) {
          fetch(MONITORING_CONFIG.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events }),
          }).then(() => {
            localStorage.removeItem('monitoring_failed_events');
          });
        }
      } catch (e) {
        localStorage.removeItem('monitoring_failed_events');
      }
    }
  }, []);

  const shouldSample = () => Math.random() < MONITORING_CONFIG.sampleRate;

  const trackPerformance = (metric: Omit<PerformanceMetric, 'timestamp'>) => {
    if (!shouldSample()) return;

    eventQueue.current.add({
      type: 'performance',
      ...metric,
      timestamp: Date.now(),
      sessionId: sessionId.current,
      userId: userId.current,
      url: window.location.href,
    });
  };

  const trackError = (error: Error, componentStack?: string) => {
    if (!shouldSample()) return;

    const errorEvent: ErrorEvent = {
      message: error.message,
      stack: error.stack,
      componentStack,
      timestamp: Date.now(),
      sessionId: sessionId.current,
      userId: userId.current || undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    eventQueue.current.add({
      type: 'error',
      ...errorEvent,
    });

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Tracked Error:', error);
    }
  };

  const trackInteraction = (interaction: Omit<UserInteraction, 'timestamp'>) => {
    if (!MONITORING_CONFIG.enableUserTracking || !shouldSample()) return;

    eventQueue.current.add({
      ...interaction,
      eventType: 'interaction',
      timestamp: Date.now(),
      sessionId: sessionId.current,
      userId: userId.current,
      url: window.location.href,
    });
  };

  const trackPageView = (pageName: string, metadata?: Record<string, any>) => {
    if (!shouldSample()) return;

    eventQueue.current.add({
      type: 'pageview',
      pageName,
      metadata,
      timestamp: Date.now(),
      sessionId: sessionId.current,
      userId: userId.current,
      url: window.location.href,
      referrer: document.referrer,
    });
  };

  const setUserIdFn = (id: string) => {
    userId.current = id;
  };

  const value: MonitoringContextType = {
    trackPerformance,
    trackError,
    trackInteraction,
    trackPageView,
    setUserId: setUserIdFn,
  };

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
};

// Hook
export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};

// Error Boundary with monitoring
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class MonitoredErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  static contextType = MonitoringContext;
  context!: React.ContextType<typeof MonitoringContext>;

  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.context) {
      this.context.trackError(error, errorInfo.componentStack || undefined);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>We've been notified and are working on a fix.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for tracking component performance
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const { trackPerformance } = useMonitoring();
    const renderStart = useRef(performance.now());

    useEffect(() => {
      const renderTime = performance.now() - renderStart.current;
      trackPerformance({
        name: `${componentName}_render`,
        value: renderTime,
        unit: 'ms',
      });
    }, [trackPerformance]);

    return <WrappedComponent {...props} />;
  };
}

// Hook for tracking page views
export function usePageTracking(pageName: string, metadata?: Record<string, any>) {
  const { trackPageView } = useMonitoring();

  useEffect(() => {
    trackPageView(pageName, metadata);
  }, [pageName, trackPageView, metadata]);
}

// Hook for tracking interactions
export function useInteractionTracking() {
  const { trackInteraction } = useMonitoring();

  const trackClick = (target: string, metadata?: Record<string, any>) => {
    trackInteraction({
      type: 'click',
      target,
      metadata,
    });
  };

  const trackFormSubmit = (formName: string, metadata?: Record<string, any>) => {
    trackInteraction({
      type: 'form_submit',
      target: formName,
      metadata,
    });
  };

  const trackNavigation = (from: string, to: string) => {
    trackInteraction({
      type: 'navigation',
      target: to,
      metadata: { from },
    });
  };

  return { trackClick, trackFormSubmit, trackNavigation };
}

export default MonitoringProvider;
