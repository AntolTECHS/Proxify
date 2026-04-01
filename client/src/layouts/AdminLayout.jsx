import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Menu,
  LayoutDashboard,
  BriefcaseBusiness,
  CalendarCheck2,
  UserCircle2,
  LogOut,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "../components/ui/sheet";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/providers", label: "Providers & Services", icon: BriefcaseBusiness },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck2 },
  { to: "/admin/profile", label: "Profile", icon: UserCircle2 },
];

function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b p-4">
        <div className="rounded-2xl bg-gray-900 p-4 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-300">
            Admin area
          </p>
          <h1 className="mt-1 text-xl font-bold">Proxify</h1>
          <p className="mt-1 text-sm text-gray-300">Manage the platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout?.();
    navigate("/login");
  };

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <div className="min-h-screen w-full bg-gray-100 lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:border-r lg:bg-white">
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-white px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              
              {/* ✅ MOBILE MENU (FIXED) */}
              <div className="lg:hidden">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  
                  {/* ❌ removed asChild */}
                  <SheetTrigger>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Open menu"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="left" className="p-0">
                    <div className="flex h-full flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <p className="font-semibold">Menu</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={closeMobileMenu}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>

                      {/* Sidebar */}
                      <div className="flex-1 overflow-y-auto">
                        <Sidebar onNavigate={closeMobileMenu} />
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Admin Panel
                </h2>
                <p className="text-sm text-gray-500">
                  Welcome back, {user?.name || "Admin"}
                </p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>

              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}