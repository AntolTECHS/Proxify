// src/pages/admin/AdminUsersPage.jsx
import { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  FaSearch,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaThLarge,
  FaTable,
  FaTrash,
} from "react-icons/fa";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";

const ROLE_TABS = ["All", "customer", "provider", "admin"];
const VERIFICATION_FILTERS = ["All", "pending", "approved", "rejected"];
const PAGE_SIZE = 10;

function safeText(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function getInitials(name) {
  return (
    String(name || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function getRoleBadge(role) {
  if (role === "admin") return "border-sky-200 bg-sky-50 text-sky-700";
  if (role === "provider") return "border-purple-200 bg-purple-50 text-purple-700";
  if (role === "customer") return "border-green-200 bg-green-50 text-green-700";
  return "border-gray-200 bg-gray-50 text-gray-700";
}

function getVerificationBadge(status, isVerified) {
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  if (status === "approved") return "border-green-200 bg-green-50 text-green-700";
  if (status === "pending") return "border-yellow-200 bg-yellow-50 text-yellow-700";

  return isVerified
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-gray-200 bg-gray-50 text-gray-700";
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition sm:px-4 ${
        active
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-gray-900">
        {value || "-"}
      </p>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3">
      <p className="text-sm text-gray-600">
        Page <span className="font-semibold text-gray-900">{currentPage}</span> of{" "}
        <span className="font-semibold text-gray-900">{totalPages}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={currentPage <= 1}
          className="gap-2"
        >
          <FaChevronLeft />
          Prev
        </Button>

        <Button
          variant="outline"
          onClick={onNext}
          disabled={currentPage >= totalPages}
          className="gap-2"
        >
          Next
          <FaChevronRight />
        </Button>
      </div>
    </div>
  );
}

/* ============================
   USER CARD (GRID VIEW)
============================ */
const UserCard = memo(function UserCard({ user, onOpen, onDelete, deleting }) {
  const role = String(user?.role || "");
  const verificationStatus = String(user?.verificationStatus || "");
  const isVerified = Boolean(user?.isVerified);

  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={() => onOpen(user)}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left sm:gap-4"
          aria-label={`View details for ${safeText(user?.name)}`}
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-base font-bold text-white shadow-sm sm:h-16 sm:w-16 sm:text-lg">
            {getInitials(user?.name)}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
              {safeText(user?.name)}
            </h3>
            <p className="truncate text-sm text-gray-500">{safeText(user?.email)}</p>
            <p className="mt-1 truncate text-sm text-gray-500">{safeText(user?.phone)}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize sm:px-3 sm:text-xs ${getRoleBadge(
                  role
                )}`}
              >
                {safeText(role)}
              </span>

              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize sm:px-3 sm:text-xs ${getVerificationBadge(
                  verificationStatus,
                  isVerified
                )}`}
              >
                {verificationStatus || (isVerified ? "verified" : "unverified")}
              </span>
            </div>
          </div>
        </button>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpen(user)}
          >
            View
          </Button>

          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={deleting}
            onClick={() => onDelete(user)}
          >
            <FaTrash className="mr-2" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
});

/* ============================
   MODAL SHELL
============================ */
function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label={`Close ${title}`}
      />

      <div className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>

          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        {children}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { token, user: authUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [roleTab, setRoleTab] = useState("All");
  const [verificationFilter, setVerificationFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);

  const [viewMode, setViewMode] = useState("cards"); // cards | table
  const [deletingUserId, setDeletingUserId] = useState("");

  const canAccess = token && authUser?.role === "admin";

  const loadUsers = useCallback(
    async ({ showLoader = false } = {}) => {
      if (!canAccess) return;

      if (showLoader) setLoading(true);
      setError("");

      try {
        const pageSize = 100;

        const firstResponse = await adminService.getUsers(token, {
          page: 1,
          limit: pageSize,
        });

        const firstUsers = Array.isArray(firstResponse)
          ? firstResponse
          : Array.isArray(firstResponse?.users)
          ? firstResponse.users
          : [];

        const totalPages = Array.isArray(firstResponse)
          ? 1
          : Math.max(Number(firstResponse?.totalPages) || 1, 1);

        let allUsers = [...firstUsers];

        if (!Array.isArray(firstResponse) && totalPages > 1) {
          for (let page = 2; page <= totalPages; page += 1) {
            const nextResponse = await adminService.getUsers(token, {
              page,
              limit: pageSize,
            });

            const nextUsers = Array.isArray(nextResponse)
              ? nextResponse
              : Array.isArray(nextResponse?.users)
              ? nextResponse.users
              : [];

            allUsers.push(...nextUsers);
          }
        }

        setUsers(allUsers);

        if (selectedUser?._id) {
          const refreshedSelected = allUsers.find(
            (u) => String(u?._id) === String(selectedUser._id)
          );
          if (refreshedSelected) setSelectedUser(refreshedSelected);
        }
      } catch (err) {
        setUsers([]);
        setError(err?.message || "Failed to load users");
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [canAccess, token, selectedUser?._id]
  );

  useEffect(() => {
    loadUsers({ showLoader: true });
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = users.filter((u) => {
      const role = String(u?.role || "");
      const status = String(u?.verificationStatus || "");
      const isVerified = Boolean(u?.isVerified);

      const okRole = roleTab === "All" || role === roleTab;

      const okVerification =
        verificationFilter === "All" ||
        status === verificationFilter ||
        (verificationFilter === "approved" && isVerified) ||
        (verificationFilter === "pending" && !isVerified);

      const okSearch =
        safeText(u?.name).toLowerCase().includes(q) ||
        safeText(u?.email).toLowerCase().includes(q) ||
        safeText(u?.phone).toLowerCase().includes(q) ||
        safeText(u?._id).toLowerCase().includes(q);

      return okRole && okVerification && okSearch;
    });

    list.sort((a, b) => {
      const aTime = new Date(a?.createdAt || 0).getTime() || 0;
      const bTime = new Date(b?.createdAt || 0).getTime() || 0;

      if (sortBy === "oldest") return aTime - bTime;
      if (sortBy === "name-asc") {
        return String(a?.name || "").localeCompare(String(b?.name || ""));
      }
      if (sortBy === "name-desc") {
        return String(b?.name || "").localeCompare(String(a?.name || ""));
      }
      return bTime - aTime;
    });

    return list;
  }, [users, search, roleTab, verificationFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleTab, verificationFilter, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  const openUserDetails = useCallback((targetUser) => {
    if (!targetUser?._id) return;
    setSelectedUser(targetUser);
  }, []);

  const closeUserDetails = useCallback(() => {
    setSelectedUser(null);
  }, []);

  const deleteUser = useCallback(
    async (targetUser) => {
      if (!targetUser?._id) return;

      if (targetUser?._id === authUser?._id) {
        setError("You cannot delete your own admin account.");
        return;
      }

      const ok = window.confirm(
        `Are you sure you want to delete this user?\n\nName: ${targetUser?.name}\nEmail: ${targetUser?.email}\n\nThis action cannot be undone.`
      );

      if (!ok) return;

      setDeletingUserId(targetUser._id);
      setError("");
      setSuccess("");

      try {
        await adminService.deleteUser(targetUser._id, token);
        await loadUsers();

        if (selectedUser?._id === targetUser._id) {
          setSelectedUser(null);
        }

        setSuccess(`Deleted ${safeText(targetUser?.name)} successfully.`);
      } catch (err) {
        setError(err?.message || "Failed to delete user");
      } finally {
        setDeletingUserId("");
      }
    },
    [authUser?._id, loadUsers, selectedUser?._id, token]
  );

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 2500);
    return () => clearTimeout(t);
  }, [success]);

  if (!canAccess) {
    return <div className="rounded-3xl bg-white p-6 shadow-sm">Access denied.</div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
          <FaSpinner className="animate-spin text-gray-700" />
          <span className="text-gray-700">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Users</h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              View and manage customer, provider, and admin accounts.
            </p>
          </div>

          <Button onClick={() => loadUsers({ showLoader: true })} variant="outline">
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        ) : null}
      </div>

      {/* FILTERS */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name, email, phone, role, or user ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-sky-500 sm:w-auto"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>

              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  onClick={() => setViewMode("cards")}
                  className="w-full sm:w-auto"
                >
                  <FaThLarge className="mr-2" />
                  Cards
                </Button>

                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  onClick={() => setViewMode("table")}
                  className="w-full sm:w-auto"
                >
                  <FaTable className="mr-2" />
                  Table
                </Button>
              </div>
            </div>
          </div>

          {/* ROLE TABS */}
          <div className="mt-5 flex flex-wrap gap-2">
            {ROLE_TABS.map((tab) => (
              <TabButton
                key={tab}
                active={roleTab === tab}
                onClick={() => setRoleTab(tab)}
              >
                {tab}
              </TabButton>
            ))}
          </div>

          {/* VERIFICATION TABS */}
          <div className="mt-5 flex flex-wrap gap-2">
            {VERIFICATION_FILTERS.map((tab) => (
              <TabButton
                key={tab}
                active={verificationFilter === tab}
                onClick={() => setVerificationFilter(tab)}
              >
                {tab}
              </TabButton>
            ))}
          </div>

          {/* USERS VIEW */}
          {viewMode === "cards" ? (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedUsers.map((u) => (
                  <UserCard
                    key={u._id}
                    user={u}
                    onOpen={openUserDetails}
                    onDelete={deleteUser}
                    deleting={deletingUserId === u._id}
                  />
                ))}
              </div>

              {paginatedUsers.length === 0 && (
                <div className="mt-6 rounded-2xl border bg-white px-4 py-8 text-center text-sm text-gray-500">
                  No users found.
                </div>
              )}
            </>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
              <table className="min-w-[1000px] w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Verification
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.map((u) => (
                    <tr key={u._id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {safeText(u.name)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {safeText(u.email)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {safeText(u.phone)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getRoleBadge(
                            u.role
                          )}`}
                        >
                          {safeText(u.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getVerificationBadge(
                            u.verificationStatus,
                            u.isVerified
                          )}`}
                        >
                          {u.verificationStatus || (u.isVerified ? "verified" : "unverified")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDateTime(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUserDetails(u)}
                          >
                            View
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingUserId === u._id}
                            onClick={() => deleteUser(u)}
                          >
                            <FaTrash className="mr-2" />
                            {deletingUserId === u._id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          />
        </CardContent>
      </Card>

      {/* DETAILS MODAL */}
      {selectedUser && (
        <ModalShell
          title={safeText(selectedUser?.name)}
          subtitle={`User ID: ${safeText(selectedUser?._id)}`}
          onClose={closeUserDetails}
        >
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow label="Name" value={safeText(selectedUser?.name)} />
              <DetailRow label="Email" value={safeText(selectedUser?.email)} />
              <DetailRow label="Phone" value={safeText(selectedUser?.phone)} />
              <DetailRow label="Role" value={safeText(selectedUser?.role)} />
              <DetailRow
                label="Verification"
                value={
                  selectedUser?.verificationStatus ||
                  (selectedUser?.isVerified ? "verified" : "unverified")
                }
              />
              <DetailRow label="Created At" value={formatDateTime(selectedUser?.createdAt)} />
              <DetailRow label="Updated At" value={formatDateTime(selectedUser?.updatedAt)} />
              <DetailRow label="User ID" value={safeText(selectedUser?._id)} />
            </div>

            <div className="mt-6 rounded-3xl border bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getRoleBadge(
                    selectedUser?.role
                  )}`}
                >
                  {safeText(selectedUser?.role)}
                </span>

                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getVerificationBadge(
                    selectedUser?.verificationStatus,
                    selectedUser?.isVerified
                  )}`}
                >
                  {selectedUser?.verificationStatus ||
                    (selectedUser?.isVerified ? "verified" : "unverified")}
                </span>
              </div>

              <p className="mt-4 text-sm text-gray-600">
                Use the action buttons in the list to delete this user or return to
                the table to continue managing accounts.
              </p>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}