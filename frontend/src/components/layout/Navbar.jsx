import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Zap } from "lucide-react";
import { generateInitials } from "../../lib/utils";

function Navbar() {
  const location = useLocation();

  const user = {
    name: 'Terrasn User',
    email: 'internal@company.com'
  };

  return (
    <nav className="bg-white border border-slate-200 shadow-sm sticky top-0 z-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-shadow">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-200 animate-pulse" />
            </div>
            <span className="text-xl font-bold text-blue-600">
              Terrasun APIFlow Internal
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`px-4 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${location.pathname === "/dashboard" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}
            >
              Dashboard
            </Link>
            <Link
              to="/search"
              className={`px-4 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${location.pathname === "/search" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}
            >
              <Search className="w-4 h-4" />
              Search
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 h-8 rounded-xl bg-white border border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
                {generateInitials(user.name)}
              </div>
              <span className="hidden sm:block text-sm font-medium text-slate-800">
                {user.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
