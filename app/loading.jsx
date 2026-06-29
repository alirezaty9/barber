import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-sm">در حال بارگذاری...</span>
      </div>
    </div>
  );
}
