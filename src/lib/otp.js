// تولید و راستی‌آزماییِ کدِ تأییدِ دومرحله‌ای (OTP).
// کد به‌صورتِ hash (sha256) روی رکوردِ نوبت ذخیره می‌شود؛ خودِ کدِ خام هرگز در DB نمی‌ماند.
import { createHash, randomInt } from 'crypto';

export const OTP_TTL_MS = 2 * 60 * 1000; // اعتبارِ کد: ۲ دقیقه
export const OTP_MAX_ATTEMPTS = 5; // حداکثر تلاشِ اشتباه پیش از باطل‌شدنِ کد

// کدِ ۶ رقمی با randomInt (امن، نه Math.random).
export function generateOtp() {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(otp) {
  return createHash('sha256').update(String(otp)).digest('hex');
}
