'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Download, Check, Loader2 } from 'lucide-react';
import { usePwaInstallStore } from './install-store';
import { usePwaInstall } from './usePwaInstall';
import { getInstallGuide } from './install-guidance';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { toPersianDigits } from '@/lib/persian';

// پنجره‌ی «نصب اپلیکیشن».
//
// 🎯 چرا این ساخته شد؟ قبلاً وقتی نصبِ یک‌کلیکی ممکن نبود، فقط یک پیامِ کوچک (توست) گوشه‌ی
// صفحه می‌آمد و بعد از چند ثانیه محو می‌شد. کاربر نه فرصتِ خواندنش را داشت و نه حس می‌کرد
// یک رابطِ کاربریِ درست است.
//
// 🔴 محدودیتی که نمی‌شود دورش زد: نمایشِ پنجره‌ی نصبِ خودِ مرورگر فقط وقتی ممکن است که
// مرورگر اجازه‌اش را اعلام کرده باشد، و روی آیفون/آی‌پد اصلاً چنین چیزی وجود ندارد. پس این
// پنجره دو حالت دارد:
//   • اگر اجازه هست  → یک دکمه‌ی «نصب» که مستقیم پنجره‌ی خودِ مرورگر را باز می‌کند.
//   • اگر اجازه نیست → مسیرِ دستیِ دقیقِ همان دستگاه، قدم‌به‌قدم.
// در هر دو حالت کاربر یک صفحه‌ی روشن می‌بیند، نه یک پیامِ گذرا.
export default function InstallGuideModal() {
  const open = usePwaInstallStore((s) => s.guideOpen);
  const closeGuide = usePwaInstallStore((s) => s.closeGuide);
  const { canInstall, installed, promptInstall } = usePwaInstall();

  // راهنما به userAgent نگاه می‌کند، پس فقط در مرورگر ساخته می‌شود (نه هنگامِ رندرِ سرور).
  const [guide, setGuide] = useState(null);
  useEffect(() => {
    if (open) setGuide(getInstallGuide());
  }, [open]);

  const onInstall = async () => {
    const outcome = await promptInstall();
    // 'accepted' یا 'dismissed' یعنی پنجره‌ی مرورگر واقعاً باز شد؛ کارِ این پنجره تمام است.
    // 'unavailable' یعنی اجازه در همین فاصله مصرف یا باطل شده — پنجره باز می‌ماند تا کاربر
    // مسیرِ دستی را ببیند (که با رفتنِ canInstall به false خودکار نمایش داده می‌شود).
    if (outcome !== 'unavailable') closeGuide();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && closeGuide()}
      title="نصب اپلیکیشن"
      description="راهنمای نصب اپلیکیشن روی این دستگاه"
    >
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">نصب اپلیکیشن</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              دسترسیِ سریع‌تر به رزرو نوبت، بدونِ بازکردنِ مرورگر
            </p>
          </div>
        </div>

        {installed ? (
          /* اپ از قبل نصب است (یا همین الان نصب شد). */
          <div className="flex items-start gap-2.5 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-sm text-emerald-300">
            <Check className="w-5 h-5 shrink-0 mt-0.5" />
            <span>اپ روی این دستگاه نصب است. آیکنش را روی صفحه‌ی اصلیِ دستگاهت پیدا کن.</span>
          </div>
        ) : canInstall ? (
          /* بهترین حالت: مرورگر اجازه داده — یک دکمه، بدونِ هیچ توضیحِ اضافه. */
          <>
            <p className="text-sm text-zinc-300 leading-relaxed mb-5">
              دکمه‌ی زیر را بزن تا پنجره‌ی نصبِ مرورگر باز شود، و بعد در همان پنجره «نصب / Install» را تأیید کن.
            </p>
            <Button onClick={onInstall} size="lg" className="w-full">
              <Download className="w-5 h-5" /> نصب اپلیکیشن
            </Button>
          </>
        ) : (
          /* مرورگر هنوز اجازه نداده — مسیرِ دستیِ همین دستگاه. */
          guide && (
            <>
              {/* 🔴 تفکیکی که کلِ تجربه را عوض می‌کند.
                  روی کروم و اِج دکمه‌ی یک‌کلیکی **می‌آید**، فقط مرورگر چند لحظه صبر می‌کند
                  تا مطمئن شود کاربر واقعاً دارد با سایت کار می‌کند (یک محافظت در خودِ
                  مرورگر، تا هر سایتی به‌محضِ بازشدن پیشنهادِ نصب ندهد).
                  قبلاً در همان لحظه مسیرِ دستی نشان داده می‌شد و کاربر نتیجه می‌گرفت
                  «نصبِ یک‌کلیکی کار نمی‌کند» — در حالی که چند ثانیه بعد فعال می‌شد.
                  این کادر وضعیتِ واقعی را می‌گوید و چون به‌صورتِ زنده به‌روز می‌شود، به‌محضِ
                  رسیدنِ اجازه خودش جایش را به دکمه‌ی نصب می‌دهد. */}
              {guide.canPromptEventually && (
                <div className="flex items-start gap-2.5 p-4 mb-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                  <Loader2 className="w-5 h-5 shrink-0 mt-0.5 text-amber-500 animate-spin" />
                  <div className="text-sm text-amber-200/90 leading-relaxed">
                    <b className="text-amber-400">دکمه‌ی نصب هنوز آماده نیست.</b> مرورگرِ تو نصبِ
                    یک‌کلیکی را پشتیبانی می‌کند، ولی چند لحظه صبر می‌کند تا مطمئن شود واقعاً داری
                    از سایت استفاده می‌کنی.
                    <span className="block mt-2 text-amber-200/70">
                      این پنجره را باز بگذار و چند ثانیه در صفحه اسکرول کن — به‌محضِ آماده‌شدن،
                      <b> همین‌جا</b> دکمه‌ی «نصب اپلیکیشن» ظاهر می‌شود.
                    </span>
                  </div>
                </div>
              )}

              <p className="text-xs font-extrabold text-amber-500 mb-2">
                {guide.canPromptEventually ? `${guide.title} — اگر عجله داری` : guide.title}
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed mb-5">{guide.intro}</p>

              <ol className="space-y-3">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-amber-500 text-black text-xs font-extrabold flex items-center justify-center mt-0.5">
                      {toPersianDigits(String(i + 1))}
                    </span>
                    <span className="text-sm text-zinc-300 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>

              {guide.note && (
                <p className="mt-5 p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 leading-relaxed">
                  {guide.note}
                </p>
              )}
            </>
          )
        )}
      </div>
    </Modal>
  );
}
