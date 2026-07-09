<div dir="rtl" align="right">

# 🛑 فعال‌کردن Kill Switch در v2rayN (جلوگیری از لو رفتن IP)

<div style="background:#e7f5ff;border-right:4px solid #1c7ed6;color:#0b3d66;padding:8px 12px;border-radius:6px">
ℹ️ <b>Kill Switch یعنی چه؟</b> اگر ناگهان پروکسی/VPN قطع شود، به‌طور عادی ویندوز ترافیک را از <b>اتصال اصلیِ خودت</b> رد می‌کند و <b>IP واقعی‌ات لو می‌رود</b>. Kill Switch یعنی: «اگر VPN قطع شد، کلاً اینترنت را قطع کن تا هیچ چیزی از مسیر مستقیم رد نشود.»
</div>

<div style="background:#fff4e6;border-right:4px solid #f08c00;color:#7c3f00;padding:8px 12px;border-radius:6px">
⚠️ <b>مهم:</b> خودِ v2rayN یک دکمه‌ی آماده‌ی «Kill Switch» <b>ندارد</b>. این قابلیت را با <b>فایروال ویندوز (Windows Defender Firewall)</b> می‌سازیم. منطقش این است: «همه‌ی خروجی‌ها را ببند، فقط به <b>هسته‌ی v2ray</b> اجازه‌ی خروج بده.» اگر هسته قطع شود، دیگر هیچ برنامه‌ای راهی به اینترنت ندارد → پس IP لو نمی‌رود.

<b>پیش‌نیاز:</b> بهتر است اول در v2rayN حالت <b>Tun Mode</b> را روشن کنی (منوی v2rayN → <b>Tun Mode → Enable</b>). این‌طور همه‌ی ترافیک از هسته رد می‌شود و Kill Switch کامل‌تر عمل می‌کند.
</div>

---

## ✅ روش ۱ (پیشنهادی): اسکریپت PowerShell — سریع و دقیق

**۱)** اول مسیرِ **هسته‌ی v2ray** را پیدا کن. معمولاً یکی از این‌هاست (داخل پوشه‌ی نصبِ v2rayN):

```text
C:\Program Files\v2rayN\bin\xray\xray.exe
C:\Program Files\v2rayN\bin\v2ray\v2ray.exe
```

> اگر مطمئن نیستی: در v2rayN وقتی وصل هستی، در Task Manager دنبال پروسه‌ی `xray.exe` یا `v2ray.exe` بگرد → راست‌کلیک → **Open file location** → مسیرش همان است.

**۲)** **PowerShell را به‌صورت Administrator** باز کن (Start → بنویس PowerShell → راست‌کلیک → Run as administrator).

**۳)** این اسکریپت را (با مسیر درستِ هسته‌ی خودت) اجرا کن — این همان **روشن‌کردنِ Kill Switch** است:

```powershell
# --- مسیر هسته‌ی خودت را اینجا بگذار ---
$core   = "C:\Program Files\v2rayN\bin\xray\xray.exe"
$v2rayn = "C:\Program Files\v2rayN\v2rayN.exe"

# ۱) اجازه‌ی خروج فقط به هسته‌ی v2ray و خود v2rayN (تا بتوانند به سرور وصل شوند)
New-NetFirewallRule -DisplayName "KillSwitch-Allow-Core"  -Direction Outbound -Program $core   -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "KillSwitch-Allow-v2rayN" -Direction Outbound -Program $v2rayn -Action Allow -Profile Any

# ۲) اجازه به ترافیک شبکه‌ی داخلی/LAN (اختیاری ولی توصیه‌شده)
New-NetFirewallRule -DisplayName "KillSwitch-Allow-LAN" -Direction Outbound -RemoteAddress LocalSubnet -Action Allow -Profile Any

# ۳) بستنِ پیش‌فرضِ همه‌ی خروجی‌های دیگر  ← قلبِ Kill Switch
Set-NetFirewallProfile -Profile Domain,Public,Private -DefaultOutboundAction Block
```

<div style="background:#ebfbee;border-right:4px solid #2f9e44;color:#14532d;padding:8px 12px;border-radius:6px">
✅ حالا Kill Switch فعال است: اگر v2ray قطع شود، هیچ برنامه‌ای به اینترنت نمی‌رسد و IP واقعی‌ات لو نمی‌رود.
</div>

**۴)** برای **خاموش‌کردنِ Kill Switch** (وقتی خواستی بدون VPN اینترنت داشته باشی) این را اجرا کن:

```powershell
# دوباره اجازه به همه‌ی خروجی‌ها
Set-NetFirewallProfile -Profile Domain,Public,Private -DefaultOutboundAction Allow

# پاک‌کردن قوانینی که ساختیم (اختیاری)
Remove-NetFirewallRule -DisplayName "KillSwitch-Allow-Core"
Remove-NetFirewallRule -DisplayName "KillSwitch-Allow-v2rayN"
Remove-NetFirewallRule -DisplayName "KillSwitch-Allow-LAN"
```

---

## 🖱️ روش ۲: با محیط گرافیکیِ فایروال (بدون دستور)

اگر با PowerShell راحت نیستی:

1. `Win + R` بزن → بنویس `wf.msc` → Enter (پنجره‌ی **Windows Defender Firewall with Advanced Security** باز می‌شود).
2. **قانونِ اجازه برای هسته:** روی **Outbound Rules** → **New Rule…** → **Program** → مسیرِ `xray.exe` (هسته) را بده → **Allow the connection** → همه‌ی پروفایل‌ها را تیک بزن → اسم بگذار «KillSwitch-Allow-Core». (همین کار را یک بار هم برای `v2rayN.exe` تکرار کن.)
3. **بستنِ بقیه:** در همان پنجره، از ستون راست روی **Windows Defender Firewall Properties** کلیک کن → در هر سه تب (**Domain / Private / Public**)، مقدارِ **Outbound connections** را روی **Block** بگذار → OK.
4. تمام. برای خاموش‌کردن، همان **Outbound connections** را دوباره روی **Allow (default)** بگذار.

---

## 🔬 تست کن که واقعاً کار می‌کند

1. v2ray را وصل کن → به [whatismyip](https://whatismyipaddress.com) برو → باید **IP سرور VPN** باشد.
2. حالا **v2ray را قطع کن / Stop بزن** (بدون خاموش‌کردنِ Kill Switch).
3. صفحه را رفرش کن → باید **اصلاً باز نشود / اینترنت قطع باشد**. ✅
4. اگر به‌جای قطع‌شدن، **IP واقعی‌ات** را نشان داد → یعنی Kill Switch درست ست نشده (احتمالاً پیش‌فرضِ Outbound هنوز Allow است یا برنامه از مسیر دیگری خارج می‌شود) → مرحله‌ی ۳ روش ۱ را دوباره چک کن.

---

## 📌 نکات مهم

| نکته | توضیح |
|------|--------|
| 🔴 **بعد از فعال‌کردن** | تا وقتی v2ray وصل نباشد، اینترنت نداری. این <b>رفتار درستِ</b> Kill Switch است، نه باگ. |
| 🟡 **آپدیت v2rayN** | اگر نسخه‌ی v2rayN را عوض کنی و مسیرِ هسته فرق کند، باید قانون را با مسیر جدید بسازی. |
| 🔵 **DNS Leak** | چون همه‌ی خروجی‌ها بسته می‌شود، درخواست‌های DNS مستقیم هم بسته می‌شوند → از DNS Leak هم جلوگیری می‌شود. |
| 🟢 **بهترین ترکیب** | <b>Tun Mode روشن</b> + <b>Kill Switch فایروال</b> = امن‌ترین حالت بدون نشتیِ IP. |

<div style="background:#e7f5ff;border-right:4px solid #1c7ed6;color:#0b3d66;padding:8px 12px;border-radius:6px">
ℹ️ اگر می‌خواهی به‌جای بستنِ «همه‌چیز»، فقط اجازه بدهی ترافیک <b>فقط به IP سرورِ VPNِ خودت</b> برود (کمی سخت‌گیرانه‌تر و امن‌تر)، بگو تا نسخه‌ی <b>RemoteAddress = IP سرور</b> اسکریپت را هم برایت بنویسم.
</div>

</div>
