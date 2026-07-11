import { useId, cloneElement, isValidElement } from 'react';
import { AlertCircle } from 'lucide-react';

// رپر فیلد فرم: برچسب + محتوا + پیام خطا (برای استفاده با React Hook Form).
// برچسب با کنترل از طریقِ id/htmlFor پیوند می‌خورد تا کلیکِ روی برچسب فوکوس کند و
// screen readerها درست بخوانند. اگر کنترل id نداشته باشد، یک id خودکار تزریق می‌شود.
export default function Field({ label, error, children, hint, htmlFor }) {
  const autoId = useId();
  const controlId = htmlFor || (isValidElement(children) && children.props.id) || autoId;
  const errorId = `${controlId}-error`;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id || controlId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : children.props['aria-describedby'],
      })
    : children;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={controlId} className="block text-zinc-400 text-xs font-bold">{label}</label>
      )}
      {control}
      {hint && !error && <p className="text-[10px] text-zinc-500">{hint}</p>}
      {error && (
        <p id={errorId} className="text-red-500 text-[10px] font-semibold flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
