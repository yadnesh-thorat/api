import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { searchApi } from "../lib/api";
import { getMethodColor } from "../lib/utils";
import { Search as SearchIcon, Code2, ArrowRight } from "lucide-react";
function SearchPage() {
  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const searchMutation = useMutation({
    mutationFn: () => searchApi.search({ q: query, method: methodFilter || void 0 }),
    onSuccess: (res) => {
      setResults(res.data);
      setHasSearched(true);
    }
  });
  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim() || methodFilter) {
      searchMutation.mutate();
    }
  };
  return <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8 animate-fadeIn">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Search APIs</h1>
                <p className="text-slate-600">Find any API by endpoint, tag, description, or method</p>
            </div>

            {
    /* Search Form */
  }
            <form onSubmit={handleSearch} className="mb-8 animate-fadeIn">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-lg placeholder-slate-400 focus:outline-none focus:border-blue-200 focus:ring-1 focus:ring-primary-500/20 transition-all"
    placeholder="Search endpoints, descriptions, tags..."
  />
                    </div>
                    <select
    value={methodFilter}
    onChange={(e) => setMethodFilter(e.target.value)}
    className="px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-200"
  >
                        <option value="">All Methods</option>
                        {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button
    type="submit"
    disabled={searchMutation.isPending}
    className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
  >
                        {searchMutation.isPending ? "Searching..." : "Search"}
                    </button>
                </div>
            </form>

            {
    /* Results */
  }
            <div className="space-y-3">
                {results.map((result, i) => {
    const methodColor = getMethodColor(result.method);
    return <Link
      key={result.id}
      to={`/project/${result.project_id}`}
      className="group bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex items-center justify-between hover:border-blue-200 transition-all animate-fadeIn block"
      style={{ animationDelay: `${i * 50}ms` }}
    >
                            <div className="flex items-center gap-4">
                                <span
      className="method-badge text-sm"
      style={{ color: methodColor, backgroundColor: `${methodColor}15` }}
    >
                                    {result.method}
                                </span>
                                <div>
                                    <div className="font-mono text-sm text-slate-800 group-hover:text-blue-700 transition-colors">
                                        {result.path}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {result.summary} • <span className="text-slate-400">{result.project_name}</span> / {result.api_name}
                                    </div>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </Link>;
  })}

                {hasSearched && results.length === 0 && <div className="text-center py-16 animate-fadeIn">
                        <Code2 className="w-12 h-12 text-surface-700 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-600 mb-1">No results found</h3>
                        <p className="text-slate-500">Try different search terms or filters</p>
                    </div>}
            </div>
        </div>;
}
export {
  SearchPage as default
};
