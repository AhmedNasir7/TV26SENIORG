import { UserManagement } from '@/components/admin/UserManagement'
import { PageHeader } from '@/components/ui/PageHeader'

export default function AdminUsersPage() {
  return (
    <div className="p-8">
      <PageHeader
        eyebrow="Users"
        title="User management"
        description="Add users and send their login credentials by email."
      />
      <UserManagement />
    </div>
  )
}
