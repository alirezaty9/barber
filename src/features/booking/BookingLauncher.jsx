'use client';

import Modal from '@/components/ui/Modal';
import { useBookingStore } from './store';
import BookingWizard from './BookingWizard';

// مودال رزرو را با وضعیت Zustand کنترل می‌کند. با هر بار باز شدن، ویزارد
// به‌کمک key از نو مانت می‌شود تا state تمیز شروع شود.
export default function BookingLauncher({ services, barbers }) {
  const open = useBookingStore((s) => s.open);
  const close = useBookingStore((s) => s.close);

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && close()}
      title="رزرو نوبت"
      description="انتخاب خدمت، زمان، ثبت اطلاعات تماس و پرداخت"
    >
      {open && <BookingWizard key="wizard" services={services} barbers={barbers} onClose={close} />}
    </Modal>
  );
}
