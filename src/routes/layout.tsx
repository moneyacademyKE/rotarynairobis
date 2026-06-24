import { component$, Slot, createContextId, useContextProvider, useStore } from "@builder.io/qwik";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";

/**
 * Linkify URLs and hashtags within text content.
 * Wraps URLs in <a> tags and hashtags in accent-colored spans.
 */
function linkifyContent(text: string): any[] {
  if (!text) return [text];
  // Match URLs and hashtags
  const pattern = /(https?:\/\/[^\s]+)|(#\w+)/g;
  const parts: any[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      // URL
      parts.push(
        <a key={`link-${key++}`} href={match[1]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
          {match[1]}
        </a>
      );
    } else if (match[2]) {
      // Hashtag
      parts.push(
        <span key={`tag-${key++}`} style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>
          {match[2]}
        </span>
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

/**
 * Define the Platform interface for Cloudflare.
 */
declare global {
  interface QwikCityPlatform {
    env: {
      DB: D1Database;
      CACHE: KVNamespace;
      CLASSIFY_QUEUE: Queue<any>;
      GEMINI_API_KEY: string;
      PHOTOS: R2Bucket;
      ASSETS: any;
    };
  }
}

export interface DrawerState {
  isOpen: boolean;
  title: string;
  category: string;
  mediaSrc: string;
  mediaType: 'image' | 'video' | 'failed';
  content: string;
}

export const DrawerContext = createContextId<DrawerState>("rcns-drawer-context");

export const usePlatformTheme = routeLoader$(({ url }) => {
  const path = url.pathname;
  if (path.includes('/instagram')) return 'instagram';
  if (path.includes('/tiktok')) return 'tiktok';
  if (path.includes('/birthdays')) return 'birthdays';
  if (path.includes('/recaps')) return 'recaps';
  if (path.includes('/search')) return 'search';
  if (path.includes('/about')) return 'about';
  if (path.includes('/rcns')) return 'rcns';
  if (path.includes('/ri-history')) return 'ri-history';
  return 'twitter';
});

export default component$(() => {
  const loc = useLocation();
  const theme = usePlatformTheme();

  const drawerState = useStore<DrawerState>({
    isOpen: false,
    title: "",
    category: "",
    mediaSrc: "",
    mediaType: "image",
    content: ""
  });
  useContextProvider(DrawerContext, drawerState);

  return (
    <div 
      class="app-container" 
      data-theme={theme.value}
      window:onKeyDown$={(e) => {
        if (e.key === "Escape") {
          drawerState.isOpen = false;
        }
      }}
    >
      {/* Skip to main content — first focusable element for keyboard users */}
      <a href="#main-content" class="skip-link sr-only">Skip to main content</a>

      <div class="sticky-header">
        <header class="app-header">
          <div class="header-brand-row">
            <a href="/twitter/" class="brand-link">
              <img src="/images/logo.png" alt="Rotary Club of Nairobi South" class="brand-logo" />
            </a>
          </div>
        </header>

        <div class="controls-wrapper">
          <nav aria-label="Main navigation" class="category-pills">
            <a 
              href="/twitter/" 
              class={["pill-btn", loc.url.pathname.includes('/twitter') ? "active" : ""]}
            >
              Home
            </a>
            <a 
              href="/instagram/" 
              class={["pill-btn", loc.url.pathname.includes('/instagram') ? "active" : ""]}
            >
              Photos
            </a>
            <a 
              href="/tiktok/" 
              class={["pill-btn", loc.url.pathname.includes('/tiktok') ? "active" : ""]}
            >
              Events
            </a>
            <a 
              href="/birthdays/" 
              class={["pill-btn", loc.url.pathname.includes('/birthdays') ? "active" : ""]}
            >
              Birthdays
            </a>
            <a 
              href="/recaps/" 
              class={["pill-btn", loc.url.pathname.includes('/recaps') ? "active" : ""]}
            >
              More
            </a>
            <a 
              href="/search/" 
              class={["pill-btn", loc.url.pathname.includes('/search') ? "active" : ""]}
            >
              Search
            </a>
            <a 
              href="/about/" 
              class={["pill-btn", loc.url.pathname.includes('/about') ? "active" : ""]}
            >
              About
            </a>
            <a 
              href="/rcns/" 
              class={["pill-btn", loc.url.pathname.includes('/rcns') ? "active" : ""]}
            >
              RCNS
            </a>
            <a 
              href="/ri-history/" 
              class={["pill-btn", loc.url.pathname.includes('/ri-history') ? "active" : ""]}
            >
              RI History
            </a>
          </nav>
        </div>
      </div>

      <main id="main-content" class="main-content" inert={drawerState.isOpen ? true : undefined}>
        <Slot />
      </main>

      {/* Slide-out Drawer Backdrop */}
      <div 
        class={["drawer-backdrop", drawerState.isOpen ? "open" : ""]}
        onClick$={() => { drawerState.isOpen = false; }}
      />

      {/* Slide-out Drawer Panel */}
      <div 
        class={["drawer-panel", drawerState.isOpen ? "open" : ""]}
        role="dialog"
        aria-modal={drawerState.isOpen ? "true" : "false"}
        aria-labelledby="drawer-title"
        aria-hidden={!drawerState.isOpen}
      >
        <div class="drawer-header">
          <div class="drawer-header-info">
            <span class="drawer-category">{drawerState.category}</span>
            <h2 id="drawer-title" class="drawer-title">{drawerState.title}</h2>
          </div>
          <button 
            class="close-btn" 
            onClick$={() => { drawerState.isOpen = false; }}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
        <div class="drawer-body">
          {drawerState.mediaSrc && (
            <div class="drawer-media-section">
              {drawerState.mediaType === 'video' ? (
                <video 
                  src={drawerState.mediaSrc} 
                  controls 
                  preload="metadata"
                  loop 
                  muted 
                  class="drawer-video-gif" 
                />
              ) : (
                <img 
                  src={drawerState.mediaSrc} 
                  alt={drawerState.title} 
                  class="drawer-video-gif" 
                />
              )}
            </div>
          )}
          <div class="prompt-section-header">
            <span class="prompt-section-title">Description & Details</span>
          </div>
          <div class="codeblock-wrapper">
            <div class="codeblock-content">
              {linkifyContent(drawerState.content)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

