// ─────────────────────────────────────────────────────────────
//  لاگرِ سبک و حرفه‌ای — روی سرور و کلاینت کار می‌کند.
//  امکانات: سطح‌بندی (debug/info/success/warn/error)، namespace رنگی،
//  زمان‌سنجی (timer)، و خاموشیِ خودکار در production.
//
//  سطحِ نمایش با متغیرِ محیطی قابلِ تنظیم است:
//    کلاینت → NEXT_PUBLIC_LOG_LEVEL   |   سرور → LOG_LEVEL
//    مقادیر: debug | info | success | warn | error | silent
//  پیش‌فرض: توسعه = debug ، پروداکشن = (کلاینت) silent / (سرور) warn
// ─────────────────────────────────────────────────────────────

const LEVELS = { debug: 10, info: 20, success: 25, warn: 30, error: 40, silent: 99 };
const isServer = typeof window === 'undefined';
const isDev = process.env.NODE_ENV !== 'production';
const now = () => performance.now();

function threshold() {
  const raw = isServer ? process.env.LOG_LEVEL : process.env.NEXT_PUBLIC_LOG_LEVEL;
  if (raw && LEVELS[raw] != null) return LEVELS[raw];
  if (isDev) return LEVELS.debug;
  return isServer ? LEVELS.warn : LEVELS.silent;
}
const THRESHOLD = threshold();

const LEVEL_META = {
  debug: { label: 'DBG', color: '#9ca3af', ansi: 90, fn: 'log' },
  info: { label: 'INF', color: '#3b82f6', ansi: 34, fn: 'log' },
  success: { label: 'OK ', color: '#10b981', ansi: 32, fn: 'log' },
  warn: { label: 'WRN', color: '#f59e0b', ansi: 33, fn: 'warn' },
  error: { label: 'ERR', color: '#ef4444', ansi: 31, fn: 'error' },
};

// رنگِ ثابت برای هر namespace (مثلِ کتابخانه‌ی debug) — برای تشخیصِ سریعِ چشمی.
const NS_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#eab308', '#f97316'];
function nsColor(ns) {
  let h = 0;
  for (let i = 0; i < ns.length; i++) h = (h * 31 + ns.charCodeAt(i)) >>> 0;
  return NS_COLORS[h % NS_COLORS.length];
}

function stamp() {
  const d = new Date();
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function emit(level, ns, args) {
  if (LEVELS[level] < THRESHOLD) return;
  const meta = LEVEL_META[level];
  const time = stamp();

  if (isServer) {
    const c = (code, s) => `\x1b[${code}m${s}\x1b[0m`;
    const prefix = `${c(90, time)} ${c(meta.ansi, meta.label)}${ns ? ' ' + c(36, `[${ns}]`) : ''}`;
    console[meta.fn](prefix, ...args);
  } else {
    const base = 'padding:1px 5px;border-radius:3px;font-weight:600;';
    const styles = [`color:#71717a`, `${base}color:#fff;background:${meta.color}`];
    let fmt = `%c${time}%c${meta.label}`;
    if (ns) { fmt += `%c${ns}`; styles.push(`${base}color:#fff;background:${nsColor(ns)}`); }
    console[meta.fn](fmt, ...styles, ...args);
  }
}

function make(ns) {
  const timers = new Map();
  return {
    debug: (...a) => emit('debug', ns, a),
    info: (...a) => emit('info', ns, a),
    success: (...a) => emit('success', ns, a),
    warn: (...a) => emit('warn', ns, a),
    error: (...a) => emit('error', ns, a),
    // لاگرِ فرزند با namespaceِ تودرتو: logger.ns('booking').ns('wizard')
    ns: (child) => make(ns ? `${ns}:${child}` : child),
    // زمان‌سنجیِ سریع: const end = log.timer('کار'); ...; end();
    // اگر بیش از ۵۰۰ms طول بکشد، به‌صورتِ warn لاگ می‌شود.
    timer: (label) => {
      const start = now();
      return (...extra) => {
        const ms = now() - start;
        emit(ms > 500 ? 'warn' : 'debug', ns, [`⏱ ${label}: ${ms.toFixed(1)}ms`, ...extra]);
        return ms;
      };
    },
    time: (label) => timers.set(label, now()),
    timeEnd: (label) => {
      const s = timers.get(label);
      if (s == null) return;
      timers.delete(label);
      const ms = now() - s;
      emit(ms > 500 ? 'warn' : 'debug', ns, [`⏱ ${label}: ${ms.toFixed(1)}ms`]);
      return ms;
    },
  };
}

export const logger = make('');
export const createLogger = (ns) => make(ns);
export default logger;
