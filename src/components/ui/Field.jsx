import { AlertCircle } from 'lucide-react';

// رپر فیلد فرم: برچسب + محتوا + پیام خطا (برای استفاده با React Hook Form).
export default function Field({ label, error, children, hint }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-zinc-400 text-xs font-bold">{label}</label>}
      {children}
      {hint && !error && <p className="text-[10px] text-zinc-500">{hint}</p>}
      {error && (
        <p className="text-red-500 text-[10px] font-semibold flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
