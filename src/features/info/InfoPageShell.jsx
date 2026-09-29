import Link from 'next/link';
import { Scissors } from 'lucide-react';
import BrandWordmark from '@/features/landing/BrandWordmark';

// قالبِ مشترکِ سه صفحه‌ی اطلاعاتیِ سایت: «قوانین و مقررات»، «دربارهٔ ما» و «تماس با ما».
//
// 🎯 چرا قالبِ مشترک؟ این سه صفحه دقیقاً یک چیدمان دارند (پس‌زمینه‌ی تیره، لوگوی بالا،
// آیکن و عنوان، محتوا، لینکِ بازگشت). بدونِ قالبِ مشترک، همین چیدمان سه بار کپی می‌شد و
// اولین بار که ظاهرِ سایت عوض می‌شد، دو تایشان عقب می‌ماندند.
//
// این قالب عمداً از خودِ صفحه‌ی «قوانین» بیرون کشیده شد، پس ظاهرِ آن صفحه دست‌نخورده است.
export default function InfoPageShell({ icon: Icon, title, intro, children }) {
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-3 mb-8 justify-center">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg shadow-lg">
            <Scissors className="w-5 h-5 text-black" />
          </div>
          <BrandWordmark className="font-sans font-extrabold text-xl tracking-wider text-amber-500" accentClassName="text-white" />
        </Link>

        <div className="flex flex-col items-center text-center mb-10">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl mb-3">
            <Icon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">{title}</h1>
          {intro && (
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-md">{intro}</p>
          )}
        </div>

        <div className="space-y-4">{children}</div>

        <Link href="/" className="block text-center text-xs text-zinc-500 hover:text-amber-400 mt-8 transition-colors">
          ← بازگشت به صفحه‌ی اصلی
        </Link>
      </div>
    </div>
  );
}
