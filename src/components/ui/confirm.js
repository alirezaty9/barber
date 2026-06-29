import { create } from 'zustand';

// جایگزین امن و زیبا برای confirm() مرورگر.
// استفاده: const ok = await confirm({ title, description, danger: true });
export const useConfirmStore = create((set) => ({
  open: false,
  options: {},
  resolver: null,
  show: (options, resolver) => set({ open: true, options, resolver }),
  hide: () => set({ open: false, resolver: null }),
}));

export function confirm(options = {}) {
  return new Promise((resolve) => {
    useConfirmStore.getState().show(options, resolve);
  });
}
