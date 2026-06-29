import { create } from 'zustand';

// state کلاینتیِ ویزارد رزرو (باز/بسته و انتخاب اولیه) — جایگزین prop drilling قبلی.
export const useBookingStore = create((set) => ({
  open: false,
  selectedServiceId: null,
  selectedBarberId: null,

  openBooking: () => set({ open: true, selectedServiceId: null, selectedBarberId: null }),
  openWithService: (serviceId) => set({ open: true, selectedServiceId: serviceId, selectedBarberId: null }),
  openWithBarber: (barberId) => set({ open: true, selectedBarberId: barberId, selectedServiceId: null }),
  close: () => set({ open: false, selectedServiceId: null, selectedBarberId: null }),
}));
