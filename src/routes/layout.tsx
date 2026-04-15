import { component$, Slot } from "@builder.io/qwik";
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

export const usePlatformTheme = routeLoader$(({ url }) => {
  const path = url.pathname;
  if (path.includes('/instagram')) return 'instagram';
  if (path.includes('/tiktok')) return 'tiktok';
  if (path.includes('/birthdays')) return 'birthdays';
  if (path.includes('/recaps')) return 'recaps';
  return 'twitter';
});

export default component$(() => {
  const loc = useLocation();
  const theme = usePlatformTheme();
  
  return (
    <div class="app-container" data-theme={theme.value}>
      <header class="logo-header">
        <a href="/twitter/">
          <img src="/images/logo.png" alt="Rotary Club of Nairobi South" class="platform-logo" />
        </a>
      </header>

      <main class="main-content">
        <Slot />
      </main>
      
      <nav class="bottom-nav">
        <a 
          href="/twitter/" 
          class={["nav-item", loc.url.pathname.includes('/twitter') ? "active" : ""]}
          aria-label="Home Feed"
        >
          <span class="icon">𝕏</span>
          <span class="label">Home</span>
        </a>
        <a 
          href="/instagram/" 
          class={["nav-item", loc.url.pathname.includes('/instagram') ? "active" : ""]}
          aria-label="Photo Gallery"
        >
          <span class="icon">📷</span>
          <span class="label">Photos</span>
        </a>
        <a 
          href="/tiktok/" 
          class={["nav-item", loc.url.pathname.includes('/tiktok') ? "active" : ""]}
          aria-label="Event Reel"
        >
          <span class="icon">📅</span>
          <span class="label">Events</span>
        </a>
        <a 
          href="/birthdays/" 
          class={["nav-item", loc.url.pathname.includes('/birthdays') ? "active" : ""]}
          aria-label="Birthday Showcase"
        >
          <span class="icon">🎂</span>
          <span class="label">Babies</span>
        </a>
        <a 
          href="/recaps/" 
          class={["nav-item", loc.url.pathname.includes('/recaps') ? "active" : ""]}
          aria-label="Moments Recap"
        >
          <span class="icon">🎞️</span>
          <span class="label">Recaps</span>
        </a>
      </nav>

      <style dangerouslySetInnerHTML={`
        .logo-header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 12px;
          z-index: 200;
          pointer-events: none; /* Allow scrolling content underneath */
        }
        .logo-header a {
          pointer-events: auto; /* Re-enable clicks for the logo link */
        }
        .platform-logo {
          height: clamp(80px, 20vh, 200px); /* Massive identity projection */
          width: auto;
          max-width: 100%;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.7));
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .platform-logo:hover {
          transform: scale(1.02);
        }
        
        .main-content {
          padding-top: clamp(100px, 25vh, 220px); /* Space for the amplified logo */
        }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: var(--max-width);
          height: var(--tab-height);
          background-color: oklch(from var(--bg-color) l c h / 0.85);
          backdrop-filter: blur(12px) saturate(180%);
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-around;
          align-items: center;
          z-index: 100;
          padding: 0 var(--space-xs);
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          color: var(--text-dim);
          font-size: var(--font-size-xs);
          font-weight: 500;
          letter-spacing: 0.02em;
          gap: 4px;
          flex: 1;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), 
                      color 0.2s ease;
        }
        .nav-item.active {
          color: var(--accent-color);
          transform: translateY(-2px);
        }
        .nav-item .icon {
          font-size: 1.4rem;
          line-height: 1;
        }
        .nav-item .label {
          opacity: 0.8;
        }
        .nav-item.active .label {
          opacity: 1;
          font-weight: 700;
        }
      `}></style>
    </div>
  );
});
