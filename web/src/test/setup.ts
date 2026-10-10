import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

/**
 * How long `findBy*` / `waitFor` keep retrying.
 *
 * Testing-library's own default is 1 s, which is separate from vitest's
 * `testTimeout` and was the real limit. Content arriving through react-query
 * renders well inside that when the suite runs alone, but a full parallel
 * `pnpm test` has backend Jest and web Vitest competing for the same cores and
 * it does not. That produced a failure that never reproduced on a re-run —
 * the worst kind, because it trains you to shrug and run it again.
 *
 * This is not a blanket slow-down: a query that resolves still resolves
 * immediately. It only raises the ceiling before giving up, and vitest's 20 s
 * `testTimeout` still bounds a genuinely hung test.
 */
configure({ asyncUtilTimeout: 10_000 });

/**
 * jsdom ships `<dialog>` without its methods, so any component using the native
 * modal throws `showModal is not a function` the moment it opens. Every master
 * screen's add/edit form is a `<dialog>`, so stub the three methods the
 * `Dialog` component calls and keep `open` honest — tests assert on what is
 * visible, which is driven by that attribute.
 */
const dialog = window.HTMLDialogElement?.prototype;
if (dialog && !dialog.showModal) {
  dialog.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  dialog.show = function show(this: HTMLDialogElement) {
    this.open = true;
  };
  dialog.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
