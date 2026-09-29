// یک «کارت» در صفحه‌های اطلاعاتی: آیکن + عنوان + فهرستِ بندها.
//
// همان چیزی که پیش‌تر فقط داخلِ صفحه‌ی «قوانین و مقررات» تعریف شده بود؛ حالا صفحه‌های
// «دربارهٔ ما» و «تماس با ما» هم از همین استفاده می‌کنند تا سه صفحه یک زبانِ بصری داشته باشند.
//
// حالتِ بدونِ گلوله (bullet) برای وقتی است که محتوا فهرست نیست — مثلاً بلوکِ اطلاعاتِ تماس.
export default function InfoSection({ icon: Icon, title, plain = false, children }) {
  return (
    <section className="glass p-6 rounded-3xl border border-zinc-800">
      <h2 className="flex items-center gap-2.5 text-sm font-extrabold text-white mb-4">
        <Icon className="w-4 h-4 text-amber-500 flex-shrink-0" />
        {title}
      </h2>
      {plain ? (
        <div className="space-y-3 text-xs text-zinc-400 leading-relaxed">{children}</div>
      ) : (
        <ul className="space-y-2.5 text-xs text-zinc-400 leading-relaxed list-disc pr-4 marker:text-amber-500/60">
          {children}
        </ul>
      )}
    </section>
  );
}
