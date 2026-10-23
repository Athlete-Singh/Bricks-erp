/** Window event the demo modal listens for. */
export const OPEN_DEMO_EVENT = 'brics:open-demo';

/**
 * "Book a Demo", from anywhere on the home page. A window event rather than
 * shared state, so any button — server or client component tree — can call it
 * without a provider. `DemoModal` is mounted once on the page and answers it.
 */
export function openDemo(): void {
  window.dispatchEvent(new Event(OPEN_DEMO_EVENT));
}
