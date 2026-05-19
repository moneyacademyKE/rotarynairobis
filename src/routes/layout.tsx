import { component$, Slot, createContextId, useContextProvider, useStore } from "@builder.io/qwik";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";

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
  if (path.includes('/search')) return 'twitter';
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
    <div class="app-container" data-theme={theme.value}>
      <header class="app-header">
        <div class="header-brand-row">
          <a href="/twitter/" class="brand-link">
            <img src="/images/logo.png" alt="Rotary Club of Nairobi South" class="brand-logo" />
          </a>
        </div>
        <span class="kicker">District 9212</span>
        <h1 class="main-title">Rotary Nairobi South</h1>
        <p class="main-desc">
          Service Above Self
        </p>
      </header>

      <div class="controls-wrapper">
        <div class="category-pills">
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
            Babies
          </a>
          <a 
            href="/recaps/" 
            class={["pill-btn", loc.url.pathname.includes('/recaps') ? "active" : ""]}
          >
            Recaps
          </a>
          <a 
            href="/search/" 
            class={["pill-btn", loc.url.pathname.includes('/search') ? "active" : ""]}
          >
            Search
          </a>
        </div>
      </div>

      <main class="main-content">
        <Slot />
      </main>

      {/* Slide-out Drawer Backdrop */}
      <div 
        class={["drawer-backdrop", drawerState.isOpen ? "open" : ""]}
        onClick$={() => { drawerState.isOpen = false; }}
      />

      {/* Slide-out Drawer Panel */}
      <div class={["drawer-panel", drawerState.isOpen ? "open" : ""]}>
        <div class="drawer-header">
          <div class="drawer-header-info">
            <span class="drawer-category">{drawerState.category}</span>
            <h2 class="drawer-title">{drawerState.title}</h2>
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
                  autoplay 
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
              {drawerState.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

