import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaClipboardList,
  FaCogs,
  FaSignOutAlt,
  FaStar,
} from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/slices/authSlice";

export default function Sidebar() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  const navItems = [
    { title: "Dashboard", path: "/provider/dashboard", icon: FaHome },
    { title: "Services", path: "/provider/services", icon: FaClipboardList },
    { title: "Jobs", path: "/provider/jobs", icon: FaClipboardList },
    { title: "Ratings", path: "/provider/ratings", icon: FaStar },
    { title: "Settings", path: "/provider/settings", icon: FaCogs },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 shadow-md hidden md:flex flex-col">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-800">Proxify</h2>
        <p className="mt-2 text-gray-500 text-sm">
          {user?.name || "Provider"}
        </p>
      </div>

      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded-md text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition ${
                    isActive ? "bg-teal-600 text-white" : ""
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-6 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-2 rounded-md text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
        >
          <FaSignOutAlt className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}