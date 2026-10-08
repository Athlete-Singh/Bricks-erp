import { create } from 'zustand';

type UiStore = {
  /** Desktop only: collapses the sidebar to icons. */
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  /**
   * Phones only: the sidebar is a drawer over the content there, because a
   * 224px rail on a 375px screen leaves nothing to work in.
   */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));
