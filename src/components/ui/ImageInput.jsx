'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from './Input';
import { resizeImageToDataUrl } from '@/lib/image';

// ورودی تصویرِ دومنظوره: هم می‌توان لینک (URL) وارد کرد، هم فایل از سیستم آپلود کرد.
// فایلِ آپلودی سمت کلاینت کوچک/فشرده و به Data URL تبدیل می‌شود و در همان فیلد می‌نشیند.
// value/onChange کنترل‌شده‌اند تا با React Hook Form (setValue/watch) کار کنند.
export default function ImageInput({ value, onChange, error, placeholder }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const isData = typeof value === 'string' && value.startsWith('data:');

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // تا بشود همان فایل را دوباره انتخاب کرد
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 512);
      onChange(dataUrl);
    } catch (err) {
      toast.error(err.message || 'آپلود تصویر ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder={placeholder || 'https://...'}
        style={{ direction: 'ltr', textAlign: 'left' }}
        error={error}
        value={isData ? '' : value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={isData}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {isData ? 'تصویر آپلودشده' : 'آپلود فایل'}
        </button>

        {value ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="پیش‌نمایش" className="w-9 h-9 rounded-lg object-cover border border-zinc-700" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute -top-1.5 -left-1.5 bg-red-600 text-white rounded-full p-0.5 leading-none"
              aria-label="حذف تصویر"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : null}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
      </div>
    </div>
  );
}
