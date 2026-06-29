'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ShieldCheck, Scissors } from 'lucide-react';
import Link from 'next/link';
import { loginSchema } from '@/lib/validation';
import { adminLogin } from '@/api/admin';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Field from '@/components/ui/Field';

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') || '/admin';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { password: '' } });

  const onSubmit = async (data) => {
    try {
      await adminLogin(data.password);
      toast.success('خوش آمدید! در حال انتقال به پنل مدیریت...');
      router.replace(from);
      router.refresh();
    } catch (e) {
      toast.error(e.status === 401 ? 'رمز عبور نادرست است.' : e.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col items-center justify-center px-6">
      <Link href="/" className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg shadow-lg">
          <Scissors className="w-5 h-5 text-black" />
        </div>
        <span className="font-sans font-extrabold text-xl tracking-wider text-amber-500">
          پیرایش <span className="text-white">رویال</span>
        </span>
      </Link>

      <div className="w-full max-w-sm glass p-8 rounded-3xl border border-zinc-800">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-white">ورود به پنل مدیریت</h1>
          <p className="text-xs text-zinc-400 mt-1">برای دسترسی به مدیریت نوبت‌ها رمز عبور را وارد کنید.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="رمز عبور" error={errors.password?.message}>
            <Input
              type="password"
              autoFocus
              placeholder="••••••••"
              error={errors.password}
              {...register('password')}
            />
          </Field>
          <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
            ورود
          </Button>
        </form>
      </div>

      <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 mt-6 transition-colors">
        ← بازگشت به سایت
      </Link>
    </div>
  );
}
