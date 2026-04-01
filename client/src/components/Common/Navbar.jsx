// src/components/Navbar.jsx
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";

export default function Navbar({ user, fullWidth = false, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
    setServicesOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!document.getElementById("gf-poppins")) {
      const link = document.createElement("link");
      link.id = "gf-poppins";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const dashboardPath =
    user?.role === "provider"
      ? "/provider/dashboard"
      : user?.role === "customer"
      ? "/customer/dashboard"
      : user?.role === "admin"
      ? "/admin/dashboard"
      : "/login";

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    alert("Logout");
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 w-full border-b border-gray-300 bg-white"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div
        className={`flex items-center px-6 py-4 ${
          fullWidth ? "w-full" : "mx-auto max-w-7xl"
        }`}
      >
        {/* LOGO */}
        <Link to="/" className="text-2xl font-bold text-teal-600">
          Proxify
        </Link>

        {/* MENU ITEMS - DESKTOP */}
        <div className="ml-auto hidden items-center gap-6 text-gray-800 md:flex">
          <Link to="/" className="transition hover:text-teal-600">
            Home
          </Link>
          <Link to="/about" className="transition hover:text-teal-600">
            About Us
          </Link>
          <Link to="/contact" className="transition hover:text-teal-600">
            Contact Us
          </Link>

          {/* Services Dropdown */}
          <div className="relative">
            <button
              onClick={() => setServicesOpen((prev) => !prev)}
              className="flex items-center gap-1 font-medium transition hover:text-teal-600"
              type="button"
            >
              Our Services
              <ChevronDown className="h-4 w-4" />
            </button>

            {servicesOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-white py-2 shadow-lg">
                <Link
                  to="/services/plumbing"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Plumbing
                </Link>
                <Link
                  to="/services/cleaning"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Cleaning
                </Link>
                <Link
                  to="/services/electricians"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Electricians
                </Link>
                <Link
                  to="/services/relocation"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Relocation
                </Link>
              </div>
            )}
          </div>

          {!user ? (
            <>
              <Link to="/login" className="font-medium transition hover:text-teal-600">
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-teal-600 px-5 py-2 font-medium text-white transition hover:bg-teal-700"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 font-bold uppercase text-white"
                type="button"
                aria-label="User menu"
              >
                {user.name?.charAt(0) || "U"}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-48 overflow-hidden rounded-lg border bg-white shadow">
                  <Link
                    to={dashboardPath}
                    className="block px-4 py-3 hover:bg-gray-100"
                  >
                    Dashboard
                  </Link>

                  {user.role === "provider" && (
                    <Link
                      to="/provider/community"
                      className="block px-4 py-3 hover:bg-gray-100"
                    >
                      Community
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-3 text-left text-red-600 hover:bg-gray-100"
                    type="button"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Become Provider */}
          {user?.role !== "provider" && (
            <Link
              to="/provider/onboarding"
              className="rounded-lg border border-teal-600 bg-teal-100 px-5 py-2 font-medium text-teal-700 transition hover:bg-teal-600 hover:text-white"
            >
              Become a Provider
            </Link>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          className="ml-auto text-gray-800 md:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
          type="button"
          aria-label="Open menu"
        >
          {menuOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="border-t bg-white px-6 py-4 text-gray-800 md:hidden">
          <div className="space-y-4">
            <Link to="/" onClick={() => setMenuOpen(false)} className="block">
              Home
            </Link>
            <Link to="/about" onClick={() => setMenuOpen(false)} className="block">
              About Us
            </Link>
            <Link to="/contact" onClick={() => setMenuOpen(false)} className="block">
              Contact Us
            </Link>

            <div>
              <button
                onClick={() => setServicesOpen((prev) => !prev)}
                className="flex w-full items-center justify-between font-medium"
                type="button"
              >
                <span>Our Services</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {servicesOpen && (
                <div className="mt-2 space-y-2 pl-4">
                  <Link
                    to="/services/plumbing"
                    onClick={() => setMenuOpen(false)}
                    className="block"
                  >
                    Plumbing
                  </Link>
                  <Link
                    to="/services/cleaning"
                    onClick={() => setMenuOpen(false)}
                    className="block"
                  >
                    Cleaning
                  </Link>
                  <Link
                    to="/services/electricians"
                    onClick={() => setMenuOpen(false)}
                    className="block"
                  >
                    Electricians
                  </Link>
                  <Link
                    to="/services/relocation"
                    onClick={() => setMenuOpen(false)}
                    className="block"
                  >
                    Relocation
                  </Link>
                </div>
              )}
            </div>

            {!user ? (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="block">
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded bg-teal-600 px-4 py-2 text-center text-white"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <Link to={dashboardPath} onClick={() => setMenuOpen(false)} className="block">
                  Dashboard
                </Link>

                {user.role === "provider" && (
                  <Link
                    to="/provider/community"
                    onClick={() => setMenuOpen(false)}
                    className="block"
                  >
                    Community
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="block text-red-600"
                  type="button"
                >
                  Logout
                </button>
              </>
            )}

            {user?.role !== "provider" && (
              <Link
                to="/provider/onboarding"
                onClick={() => setMenuOpen(false)}
                className="block rounded border border-teal-600 bg-teal-100 px-4 py-2 text-center text-teal-700"
              >
                Become a Provider
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}