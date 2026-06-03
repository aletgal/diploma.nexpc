import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Search, ShieldCheck, ShieldOff } from 'lucide-react'
import { adminApi } from '../../api/admin'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import AdminLayout from '../../components/admin/AdminLayout'
import { formatDate } from '../../utils/formatters'

function UserAvatar({ user }) {
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className="w-9 h-9 rounded-full object-cover bg-dark-800 ring-2 ring-dark-700"
      />
    )
  }

  const colors = [
    'bg-primary-800 text-primary-200',
    'bg-indigo-800 text-indigo-200',
    'bg-purple-800 text-purple-200',
    'bg-green-800 text-green-200',
    'bg-yellow-800 text-yellow-200',
  ]
  const colorIndex = user.name
    ? user.name.charCodeAt(0) % colors.length
    : 0

  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-dark-700 ${colors[colorIndex]}`}
    >
      {initials}
    </div>
  )
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [roleTarget, setRoleTarget] = useState(null) // { user, newRole }
  const [mutationError, setMutationError] = useState('')
  const searchTimerRef = useRef(null)
  const LIMIT = 20

  function handleSearchChange(e) {
    const val = e.target.value
    setSearch(val)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 350)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users', debouncedSearch, page],
    queryFn: () =>
      adminApi.getUsers({
        ...(debouncedSearch && { search: debouncedSearch }),
        page,
        limit: LIMIT,
      }),
    keepPreviousData: true,
  })

  const usersData = data?.data ?? {}
  const users = usersData.users ?? usersData ?? []
  const totalPages = usersData.pages ?? usersData.totalPages ?? 1

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => adminApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'users'])
      setRoleTarget(null)
    },
  })

  async function handleRoleChange() {
    if (!roleTarget) return
    setMutationError('')
    try {
      await updateRoleMutation.mutateAsync({
        id: roleTarget.user.id,
        role: roleTarget.newRole,
      })
    } catch (err) {
      setMutationError(err?.response?.data?.message ?? 'Failed to update role.')
    }
  }

  function promptRoleChange(user) {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
    setRoleTarget({ user, newRole })
    setMutationError('')
  }

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-7 h-7 text-primary-400" />
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or email..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden mb-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-dark-400">
            Failed to load users. Please try again.
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description={debouncedSearch ? 'Try a different search term.' : 'No registered users yet.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-gray-500 font-medium text-sm py-4 px-6 bg-gray-50 border-b border-gray-200">User</th>
                  <th className="text-left text-gray-500 font-medium text-sm py-4 px-6 bg-gray-50 border-b border-gray-200">Email</th>
                  <th className="text-left text-gray-500 font-medium text-sm py-4 px-6 bg-gray-50 border-b border-gray-200">Role</th>
                  <th className="text-left text-gray-500 font-medium text-sm py-4 px-6 bg-gray-50 border-b border-gray-200">Orders</th>
                  <th className="text-left text-gray-500 font-medium text-sm py-4 px-6 bg-gray-50 border-b border-gray-200">Joined</th>
                  <th className="text-left text-gray-500 font-medium text-sm py-4 px-6 bg-gray-50 border-b border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = currentUser?.id === user.id
                  const isAdmin = user.role === 'ADMIN'

                  return (
                    <tr key={user.id} className="hover:bg-dark-800/40 transition-colors">
                      <td className="py-4 px-6 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <div>
                            <p className="font-medium text-dark-100">
                              {user.name}
                              {isSelf && (
                                <span className="ml-2 text-xs text-dark-500">(you)</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100 text-dark-400">
                        {user.email}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100">
                        <span className={`badge ${isAdmin ? 'badge-red' : 'badge-blue'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100 text-dark-400">
                        {user._count?.orders ?? 0}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100 text-dark-400">
                        {user.createdAt ? formatDate(user.createdAt) : '—'}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100">
                        {isSelf ? (
                          <span className="text-xs text-dark-600">—</span>
                        ) : (
                          <button
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                              isAdmin
                                ? 'bg-dark-800 border-dark-700 text-dark-300 hover:text-red-300 hover:border-red-800 hover:bg-red-900/20'
                                : 'bg-dark-800 border-dark-700 text-dark-300 hover:text-primary-300 hover:border-primary-800 hover:bg-primary-900/20'
                            }`}
                            onClick={() => promptRoleChange(user)}
                          >
                            {isAdmin ? (
                              <>
                                <ShieldOff className="w-3 h-3" />
                                Make User
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3 h-3" />
                                Make Admin
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination page={page} pages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Role change confirmation */}
      <ConfirmDialog
        open={!!roleTarget}
        title={
          roleTarget?.newRole === 'ADMIN'
            ? 'Grant Admin Access'
            : 'Revoke Admin Access'
        }
        message={
          roleTarget
            ? roleTarget.newRole === 'ADMIN'
              ? `Are you sure you want to make "${roleTarget.user.name}" an admin? They will have full access to the admin panel.`
              : `Are you sure you want to revoke admin access from "${roleTarget.user.name}"?`
            : ''
        }
        confirmLabel={
          updateRoleMutation.isPending
            ? 'Updating…'
            : roleTarget?.newRole === 'ADMIN'
            ? 'Grant Admin'
            : 'Revoke Admin'
        }
        onConfirm={handleRoleChange}
        onCancel={() => {
          setRoleTarget(null)
          setMutationError('')
        }}
      />

      {mutationError && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded-lg bg-red-900/80 border border-red-700 text-red-200 text-sm z-50">
          {mutationError}
        </div>
      )}
    </AdminLayout>
  )
}
