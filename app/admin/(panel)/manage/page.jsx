import ManageServices from '@/features/admin/ManageServices';
import ManageBarbers from '@/features/admin/ManageBarbers';

export const dynamic = 'force-dynamic';

export default function AdminManagePage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-white">مدیریت خدمات و آرایشگران</h2>
        <p className="text-xs text-zinc-400 mt-1">افزودن، ویرایش و حذف خدمات و آرایشگران آرایشگاه</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ManageServices />
        <ManageBarbers />
      </div>
    </div>
  );
}
