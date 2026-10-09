import '@testing-library/jest-dom/vitest';

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
