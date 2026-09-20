import { describe, it, expect } from 'vitest';
import {
  isReceived, netOf, computeOverview, filterByPeriod,
  computePeriodStats, computeOutstanding, buildMonthlyChart, buildDailyChart,
} from '@/lib/dashboard-stats';
import { PERSIAN_MONTHS, toPersianDigits } from '@/lib/persian';
import { PENDING_HOLD_MS } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────
//  اعدادِ داشبوردِ مدیریت.
//
//  چرا این فایل مهم‌ترین تستِ پروژه است؟ چون هر تصمیمِ مالیِ صاحبِ کسب‌وکار از این
//  عددها می‌آید، و غلط‌بودنشان **هیچ خطایی نمی‌دهد** — صفحه سالم بالا می‌آید و عددِ
//  اشتباه را با اطمینان نشان می‌دهد. سه باگِ جدی در همین محاسبات فقط با بازخوانیِ
//  دستیِ کد پیدا شدند، نه با تست؛ این فایل همان شکاف را می‌بندد.
// ─────────────────────────────────────────────────────────────

const TODAY = '2026-09-20'; // ۲۹ شهریور ۱۴۰۵
const NOW = Date.parse('2026-09-20T12:00:00Z');
const fresh = new Date(NOW - 60_000);                    // یک دقیقه پیش ساخته شده
const stale = new Date(NOW - PENDING_HOLD_MS - 60_000);  // مهلتش تمام شده

/** سازنده‌ی کوتاهِ رکوردِ نوبت — فقط ستون‌هایی که محاسبات لازم دارند. */
const bk = (over = {}) => ({
  date: TODAY, timeSlot: '09:00', status: 'confirmed', cancelledBy: null,
  createdAt: fresh, paymentStatus: 'paid', amount: 100_000, refundAmount: 0,
  servicesLabel: 'هیرکات', ...over,
});

// دیتاستِ مرجع — همان سناریوهایی که واقعاً در اپ ساخته می‌شوند.
const DATASET = [
  /* ۱ */ bk({ date: '2026-09-20', amount: 500_000 }),                                              // امروز، برگزارشده
  /* ۲ */ bk({ date: '2026-09-20', status: 'pending', paymentStatus: 'unpaid', amount: 300_000, createdAt: fresh, servicesLabel: 'ریش' }), // داخلِ درگاه، همین الان
  /* ۳ */ bk({ date: '2026-09-18', status: 'cancelled', cancelledBy: 'admin', amount: 400_000 }),   // لغوِ مدیریت، پول دستِ آرایشگاه
  /* ۴ */ bk({ date: '2026-09-17', status: 'cancelled', paymentStatus: 'failed', amount: 250_000 }),// رهاشده در درگاه
  /* ۵ */ bk({ date: '2026-09-16', status: 'cancelled', paymentStatus: 'refundPending', amount: 600_000, servicesLabel: 'هیرکات + ریش' }),
  /* ۶ */ bk({ date: '2026-09-15', status: 'cancelled', cancelledBy: 'customer', paymentStatus: 'refunded', amount: 700_000, refundAmount: 350_000 }),
  /* ۷ */ bk({ date: '2026-09-25', paymentStatus: 'unpaid', amount: 450_000, servicesLabel: 'ریش' }),// نوبتِ دستیِ «پول بعداً» — آینده
  /* ۸ */ bk({ date: '2026-09-22', amount: 800_000 }),                                              // آینده، پرداخت‌شده
  /* ۹ */ bk({ date: '2026-08-25', amount: 550_000 }),                                              // داخلِ ۳۰ روز
  /* ۱۰*/ bk({ date: '2026-05-10', amount: 900_000 }),                                              // خارج از ۳۰ روز، داخلِ امسال
];

describe('isReceived / netOf — پولی که واقعاً دریافت شده', () => {
  it('«در انتظار استرداد» هم پولش دریافت شده و باید دیده شود', () => {
    expect(isReceived(bk({ paymentStatus: 'refundPending' }))).toBe(true);
  });
  it('«مسترد شده» هم دریافت شده بوده — فقط بعداً برگشته', () => {
    expect(isReceived(bk({ paymentStatus: 'refunded' }))).toBe(true);
  });
  it('«پرداخت‌نشده» و «ناموفق» دریافت نشده‌اند', () => {
    expect(isReceived(bk({ paymentStatus: 'unpaid' }))).toBe(false);
    expect(isReceived(bk({ paymentStatus: 'failed' }))).toBe(false);
  });
  it('خالصِ یک نوبت = مبلغ منهای مسترد', () => {
    expect(netOf(bk({ amount: 700_000, refundAmount: 350_000, paymentStatus: 'refunded' }))).toBe(350_000);
  });
  it('نوبتِ پرداخت‌نشده هیچ درآمدی ندارد، حتی با مبلغِ بزرگ', () => {
    expect(netOf(bk({ paymentStatus: 'unpaid', amount: 900_000 }))).toBe(0);
  });
});

describe('نوارِ نگاه کلی — امروز / این ماه / امسال', () => {
  const ov = computeOverview(DATASET, TODAY);

  it('درآمد امروز فقط رکوردِ امروز را می‌شمارد', () => {
    expect(ov.incToday).toBe(500_000); // فقط #۱ — #۲ پرداخت‌نشده است
  });

  // 🔴 تستِ باگِ واقعی: قبلاً نوبتِ ۲۲ سپتامبر (آینده) داخلِ «این ماه» شمرده می‌شد و
  // عددِ ماه از عددِ «۳۰ روز اخیر» بزرگ‌تر می‌شد — تناقضی که روی یک صفحه دیده می‌شد.
  it('نوبتِ آینده در «این ماه» شمرده نمی‌شود', () => {
    // شهریورِ ۱۴۰۵ = ‎2026-08-23‎ تا ‎2026-09-22‎. رکوردهای داخلِ ماه و تا امروز:
    //   #۱ ۵۰۰ + #۳ ۴۰۰ + #۵ ۶۰۰ + #۶ ۳۵۰ + #۹ ۵۵۰ (‎2026-08-25‎ = ۳ شهریور) = ۲٬۴۰۰٬۰۰۰
    // رکوردِ #۸ (‎2026-09-22‎ = ۳۱ شهریور) داخلِ همین ماهِ شمسی است ولی **آینده** است،
    // پس نباید شمرده شود — همان باگی که «این ماه» را از «۳۰ روز اخیر» بزرگ‌تر می‌کرد.
    expect(ov.incMonth).toBe(2_400_000);
    expect(ov.incMonth).not.toBe(2_400_000 + 800_000);
  });

  it('«این ماه» هرگز از «۳۰ روز اخیر» بزرگ‌تر نمی‌شود وقتی داده‌ی قدیمی‌تری نباشد', () => {
    const { filtered } = filterByPeriod(DATASET, '30', TODAY);
    const { net } = computePeriodStats(filtered, NOW);
    expect(ov.incMonth).toBeLessThanOrEqual(net);
  });

  it('«امسال» شاملِ ماه‌های قبلیِ همان سالِ شمسی است', () => {
    // شهریور ۲٬۴۰۰٬۰۰۰ + ۹۰۰٬۰۰۰ (#۱۰ = ۲۰ اردیبهشت ۱۴۰۵)
    expect(ov.incYear).toBe(2_400_000 + 900_000);
  });

  it('لیستِ خالی همه‌ی عددها را صفر می‌دهد، نه NaN', () => {
    expect(computeOverview([], TODAY)).toEqual({ incToday: 0, incMonth: 0, incYear: 0 });
  });
});

describe('فیلترِ بازه', () => {
  it('«امروز» فقط رکوردهای امروز را نگه می‌دارد', () => {
    const { filtered, chartMode } = filterByPeriod(DATASET, 'today', TODAY);
    expect(filtered.every((b) => b.date === TODAY)).toBe(true);
    expect(chartMode).toBe('daily');
  });

  it('بازه‌های روزشمار سقفِ «تا امروز» دارند — نوبتِ آینده داخلشان نیست', () => {
    const { filtered } = filterByPeriod(DATASET, '30', TODAY);
    expect(filtered.some((b) => b.date > TODAY)).toBe(false);
  });

  it('«۳۰ روز اخیر» دقیقاً ۳۰ روز است: روزِ ۳۰اُم داخل، روزِ ۳۱اُم بیرون', () => {
    const edge = [bk({ date: '2026-08-22' }), bk({ date: '2026-08-21' })];
    const { filtered } = filterByPeriod(edge, '30', TODAY);
    expect(filtered.map((b) => b.date)).toEqual(['2026-08-22']);
  });

  it('«امسال» نوبتِ آینده را هم در بر می‌گیرد (بازه‌ی تقویمی است، نه گزارشِ گذشته)', () => {
    const { filtered, chartMode } = filterByPeriod(DATASET, 'year', TODAY);
    expect(filtered.some((b) => b.date === '2026-09-25')).toBe(true);
    expect(chartMode).toBe('monthly');
  });

  it('«کل دوره» هیچ‌چیز را کنار نمی‌گذارد', () => {
    const { filtered } = filterByPeriod(DATASET, 'all', TODAY);
    expect(filtered).toHaveLength(DATASET.length);
  });

  it('بازه‌ی ناشناس به ۳۰ روزِ پیش‌فرض می‌افتد', () => {
    const a = filterByPeriod(DATASET, 'xyz', TODAY);
    const b = filterByPeriod(DATASET, '30', TODAY);
    expect(a.filtered).toEqual(b.filtered);
  });

  it('۹۰ روز نمودارِ ماهانه می‌گیرد، ۳۰ روز روزانه', () => {
    expect(filterByPeriod(DATASET, '90', TODAY).chartMode).toBe('monthly');
    expect(filterByPeriod(DATASET, '30', TODAY).chartMode).toBe('daily');
  });
});

describe('محاسباتِ بازه — بازحسابیِ دستیِ «۳۰ روز اخیر»', () => {
  const { filtered } = filterByPeriod(DATASET, '30', TODAY);
  const s = computePeriodStats(filtered, NOW);

  // بازه شاملِ رکوردهای ۱ تا ۶ و ۹ است (۷ و ۸ آینده‌اند، ۱۰ خیلی قدیمی).
  it('تعدادِ کلِ بازه', () => expect(s.totalCount).toBe(7));

  it('درآمد خالص = ۵۰۰ + ۴۰۰ + ۶۰۰ + ۳۵۰ + ۵۵۰ هزار', () => {
    expect(s.net).toBe(2_400_000);
  });

  it('مبلغِ مستردشده جدا گزارش می‌شود و از خالص کسر شده است', () => {
    expect(s.refunded).toBe(350_000);
  });

  it('اتحادِ بنیادی: خالص = درآمدِ خدمتِ ارائه‌شده + پولِ نوبت‌های لغوشده‌ی تسویه‌نشده', () => {
    expect(s.servedNet + s.cancelledHeld).toBe(s.net);
  });

  it('افرازِ وضعیت‌ها کامل است: هیچ رکوردی دوبار یا صفر بار شمرده نمی‌شود', () => {
    expect(s.confirmed + s.pend + s.cancelledReal + s.abandoned).toBe(s.totalCount);
  });

  // 🔴 تستِ باگِ واقعی: پولِ نوبت‌های لغوشده قبلاً به نامِ همان خدمت نوشته می‌شد و
  // ردیفِ «هیرکات» تا ۷۱٪ بیش‌برآورد داشت.
  it('«درآمد هر خدمت» فقط نوبت‌های واقعاً برگزارشده را می‌شمارد', () => {
    // فقط #۱ (۵۰۰) و #۹ (۵۵۰) برگزار شده‌اند و هر دو هیرکات‌اند.
    expect(s.perService).toEqual({ هیرکات: 1_050_000 });
    expect(Object.values(s.perService).reduce((a, b) => a + b, 0)).toBe(s.servedNet);
  });

  it('میانگینِ هر نوبت روی نوبت‌های برگزارشده حساب می‌شود، نه کلِ بازه', () => {
    expect(s.servedCount).toBe(2);
    expect(s.avg).toBe(Math.round(1_050_000 / 2)); // ۵۲۵٬۰۰۰
  });

  it('مخرجِ نرخِ لغو، تلاش‌های رهاشده‌ی درگاه را کنار می‌گذارد', () => {
    expect(s.abandoned).toBe(1);            // فقط #۴
    expect(s.bookedCount).toBe(6);          // ۷ منهای رهاشده
    expect(s.cancelledReal).toBe(3);        // #۳، #۵، #۶
    expect(s.cancelRate).toBe(50);
  });

  it('نوبتِ لغوشده ساعتش را اشغال نمی‌کند (شلوغیِ ساعت‌ها)', () => {
    const activeCount = Object.values(s.perHour).reduce((a, b) => a + b, 0);
    expect(activeCount).toBe(s.confirmed + s.pend);
  });

  it('لیستِ خالی: همه‌ی عددها صفر، بدونِ تقسیم بر صفر', () => {
    const e = computePeriodStats([], NOW);
    expect(e.net).toBe(0);
    expect(e.avg).toBe(0);
    expect(e.cancelRate).toBe(0);
    expect(e.totalCount).toBe(0);
  });
});

// 🔴 تستِ باگِ واقعی: «نرخ لغو» با اجرای کرونِ دوساعته چند واحد می‌پرید، بدونِ اینکه
// هیچ مشتری‌ای کاری کرده باشد. رزروِ منقضی باید همان لحظه «رهاشده» شمرده شود.
describe('رزروِ منقضی — پایداریِ عدد در برابرِ گذشتِ زمان', () => {
  const expired = [
    bk({ status: 'pending', paymentStatus: 'unpaid', createdAt: stale }),
    bk({ status: 'confirmed' }),
  ];

  it('رزروی که مهلتش تمام شده «رهاشده» است، نه «در انتظار»', () => {
    const s = computePeriodStats(expired, NOW);
    expect(s.abandoned).toBe(1);
    expect(s.pend).toBe(0);
  });

  it('رزروی که تازه ساخته شده هنوز «در انتظار» است', () => {
    const s = computePeriodStats([bk({ status: 'pending', paymentStatus: 'unpaid', createdAt: fresh })], NOW);
    expect(s.pend).toBe(1);
    expect(s.abandoned).toBe(0);
  });

  it('عددها قبل و بعد از «رسمی‌شدنِ لغو» توسط کرون یکی می‌مانند', () => {
    const before = computePeriodStats(expired, NOW);
    // همان داده، بعد از اینکه کرون رکورد را رسماً لغو کرد:
    const after = computePeriodStats(
      [bk({ status: 'cancelled', paymentStatus: 'failed', createdAt: stale }), bk({ status: 'confirmed' })],
      NOW,
    );
    expect(after.abandoned).toBe(before.abandoned);
    expect(after.cancelRate).toBe(before.cancelRate);
    expect(after.bookedCount).toBe(before.bookedCount);
  });

  it('رزروی که مهلتش تمام شده ولی پولش رسیده، «رهاشده» نیست', () => {
    const s = computePeriodStats([bk({ status: 'pending', paymentStatus: 'paid', createdAt: stale })], NOW);
    expect(s.abandoned).toBe(0);
  });
});

// 🔴 تستِ باگِ واقعی: این عدد دقیقاً برعکس کار می‌کرد — نوبتِ دستیِ «پول بعداً» را
// نمی‌شمرد (چون آینده بود) و به‌جایش مشتریِ داخلِ درگاه را می‌شمرد.
describe('طلبِ وصول‌نشده', () => {
  it('نوبتِ دستیِ آینده با «پول بعداً» شمرده می‌شود', () => {
    expect(computeOutstanding(DATASET)).toEqual({ count: 1, amount: 450_000 });
  });

  it('مشتریِ داخلِ درگاه طلب نیست — کسی بدهکارش نیست', () => {
    const inGateway = [bk({ status: 'pending', paymentStatus: 'unpaid', amount: 300_000 })];
    expect(computeOutstanding(inGateway).amount).toBe(0);
  });

  it('نوبتِ لغوشده‌ی پرداخت‌نشده طلب نیست', () => {
    const cancelled = [bk({ status: 'cancelled', paymentStatus: 'unpaid', amount: 300_000 })];
    expect(computeOutstanding(cancelled).amount).toBe(0);
  });

  it('مستقل از بازه است: با «۳۰ روز» و «کل دوره» یک عدد می‌دهد', () => {
    const a = computeOutstanding(DATASET);
    const b = computeOutstanding(filterByPeriod(DATASET, 'all', TODAY).filtered);
    expect(a).toEqual(b);
  });
});

describe('نمودارِ ماهانه', () => {
  it('در بازه‌ی تک‌سال، سال روی برچسب نمی‌آید', () => {
    const chart = buildMonthlyChart(
      [bk({ date: '2026-09-20', amount: 100_000 })], PERSIAN_MONTHS, toPersianDigits,
    );
    expect(chart).toHaveLength(1);
    expect(chart[0].label).toBe('شهریور');
  });

  // 🔴 بدونِ این، دو ستونِ «فروردین» از دو سالِ مختلف کاملاً شبیهِ هم می‌شدند.
  it('در بازه‌ی چندساله، دو رقمِ سال روی برچسب می‌آید', () => {
    const chart = buildMonthlyChart(
      [bk({ date: '2026-04-10', amount: 100_000 }), bk({ date: '2027-04-10', amount: 200_000 })],
      PERSIAN_MONTHS, toPersianDigits,
    );
    expect(chart.map((c) => c.label)).toEqual(['فروردین ۰۵', 'فروردین ۰۶']);
    expect(chart.map((c) => c.label)).toEqual([...new Set(chart.map((c) => c.label))]); // بی‌تکرار
  });

  it('ستون‌ها به ترتیبِ زمانی‌اند، نه ترتیبِ الفبا', () => {
    const chart = buildMonthlyChart(
      [bk({ date: '2026-12-10', amount: 1 }), bk({ date: '2026-04-10', amount: 2 })],
      PERSIAN_MONTHS, toPersianDigits,
    );
    expect(chart.map((c) => c.label)).toEqual(['فروردین', 'آذر']);
  });

  it('ماهی که درآمد ندارد ستون نمی‌گیرد', () => {
    const chart = buildMonthlyChart([bk({ paymentStatus: 'unpaid' })], PERSIAN_MONTHS, toPersianDigits);
    expect(chart).toHaveLength(0);
  });

  it('عنوانِ کاملِ هر ستون سالِ چهاررقمی دارد', () => {
    const chart = buildMonthlyChart([bk({ date: '2026-09-20', amount: 1 })], PERSIAN_MONTHS, toPersianDigits);
    expect(chart[0].full).toBe('شهریور ۱۴۰۵');
  });
});

describe('نمودارِ روزانه', () => {
  const lbl = (iso) => iso.slice(-2);
  it('هر روزِ بازه یک ستون دارد، حتی روزِ بدونِ درآمد', () => {
    const chart = buildDailyChart([bk({ date: TODAY, amount: 100_000 })], '7', TODAY, lbl, lbl);
    expect(chart).toHaveLength(7);
    expect(chart.filter((c) => c.net > 0)).toHaveLength(1);
  });
  it('آخرین ستون امروز است', () => {
    const chart = buildDailyChart([], '7', TODAY, lbl, lbl);
    expect(chart[chart.length - 1].label).toBe('20');
  });
  it('بازه‌ی «امروز» فقط یک ستون دارد', () => {
    expect(buildDailyChart([], 'today', TODAY, lbl, lbl)).toHaveLength(1);
  });
  it('درآمدِ چند نوبت در یک روز جمع می‌شود', () => {
    const chart = buildDailyChart(
      [bk({ date: TODAY, amount: 100_000 }), bk({ date: TODAY, amount: 250_000 })],
      'today', TODAY, lbl, lbl,
    );
    expect(chart[0].net).toBe(350_000);
  });
});
