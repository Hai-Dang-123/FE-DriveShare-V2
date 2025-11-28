import React from 'react'
import { useAuth } from '@/hooks/useAuth'

const ProviderProfile: React.FC = () => {
  const { user } = useAuth()
  const p: any = user

  if (!p) return <div className="p-8 text-center">Đang tải hồ sơ...</div>

  return (
    <div className="p-4 max-w-3xl mx-auto">
<h1 className="text-2xl font-bold mb-4">Hồ sơ nhà cung cấp</h1>
<div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
<div className="space-y-2">
<div>
<div className="text-sm text-gray-500">Tên</div>
<div className="font-medium">{p.userName}</div>
</div>
<div>
<div className="text-sm text-gray-500">Công ty</div>
<div className="font-medium">{p.companyName ?? 'Không có'}</div>
</div>
<div>
<div className="text-sm text-gray-500">Email</div>
<div className="font-medium">{p.email}</div>
</div>
<div>
<div className="text-sm text-gray-500">SĐT</div>
<div className="font-medium">{p.phoneNumber ?? 'Không có'}</div>
</div>
</div>
</div>
</div>
  )
}

// Styles: dùng Tailwind classes trong JSX, nếu cần style object có thể thêm dưới đây.

export default ProviderProfile
