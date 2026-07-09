import { create } from 'zustand';

// state کلاینتیِ ویزارد رزرو (باز/بسته و انتخاب اولیه‌ی خدمت) — جایگزین prop drilling قبلی.
// پروژه تک‌آرایشگره است؛ انتخاب آرایشگر وجود ندارد.
export const useBookingStore = create((set) => ({
  open: false,
  selectedServiceId: null,

  openBooking: () => set({ open: true, selectedServiceId: null }),
  openWithService: (serviceId) => set({ open: true, selectedServiceId: serviceId }),
  close: () => set({ open: false, selectedServiceId: null }),
}));
