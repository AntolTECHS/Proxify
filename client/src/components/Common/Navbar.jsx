import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Navbar({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Load Poppins font dynamically
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
      : "/admin/panel";

  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 bg-white border-b border-gray-300"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* LOGO */}
        <Link to="/" className="text-2xl font-bold text-teal-600">
          Proxify
        </Link>

        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-8 text-gray-700">
          <Link to="/" className="hover:text-teal-600 transition">
            Home
          </Link>

          {!user ? (
            <>
              <Link to="/login" className="hover:text-teal-600 transition">
                Login
              </Link>
              <Link
                to="/register"
                className="bg-teal-600 text-white px-5 py-2 rounded-lg hover:bg-teal-700 transition"
              >
                Get Started
              </Link>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold uppercase"
              >
                {user.name?.charAt(0) || "U"}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white rounded-lg shadow border">
                  <Link
                    to={dashboardPath}
                    className="block px-4 py-3 text-gray-700 hover:bg-gray-100"
                  >
                    Dashboard
                  </Link>

                  {user.role === "provider" && (
                    <Link
                      to="/provider/community"
                      className="block px-4 py-3 text-gray-700 hover:bg-gray-100"
                    >
                      Community
                    </Link>
                  )}

                  <button
                    onClick={() => alert("Logout")}
                    className="block w-full text-left px-4 py-3 text-red-600 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          className="md:hidden text-2xl text-gray-700"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t px-6 py-4 space-y-4 text-gray-700">
          <Link to="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>

          {!user ? (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="block bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 transition"
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              <Link
                to={dashboardPath}
                onClick={() => setMenuOpen(false)}
                className="block hover:text-teal-600 transition"
              >
                Dashboard
              </Link>

              {user.role === "provider" && (
                <Link
                  to="/provider/community"
                  onClick={() => setMenuOpen(false)}
                  className="block hover:text-teal-600 transition"
                >
                  Community
                </Link>
              )}

              <button
                onClick={() => alert("Logout")}
                className="text-red-600 block"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
