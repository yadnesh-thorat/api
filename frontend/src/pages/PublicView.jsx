import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { shareApi, endpointsApi } from "../lib/api";
import { getMethodColor } from "../lib/utils";
import ApiPreview from "./ApiPreview";
import {
    Zap,
    Search,
    ChevronRight,
    ChevronDown,
    Globe,
    Loader2,
    Menu,
    X
} from "lucide-react";

export default function PublicView() {
    const { token } = useParams();
    const [selectedEndpointId, setSelectedEndpointId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [search, setSearch] = useState("");

    const { data: shareData, isLoading, error } = useQuery({
        queryKey: ["share", token],
        queryFn: async () => {
            const res = await shareApi.get(token);
            return res.data;
        },
        enabled: !!token
    });

    useEffect(() => {
        if (shareData?.apis?.length > 0 && !selectedEndpointId) {
            const firstEp = shareData.apis[0].endpoints?.[0];
            if (firstEp) setSelectedEndpointId(firstEp.id);
        }
    }, [shareData]);

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error || !shareData) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
                <Zap className="w-12 h-12 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Documentation Not Found</h2>
                <p className="text-slate-500 text-center max-w-sm">The link might be expired or invalid. Please request a new share link from the project owner.</p>
            </div>
        );
    }

    const { project, apis } = shareData;

    const filteredApis = apis.map(api => ({
        ...api,
        endpoints: api.endpoints?.filter(ep =>
            ep.path.toLowerCase().includes(search.toLowerCase()) ||
            ep.summary?.toLowerCase().includes(search.toLowerCase())
        )
    })).filter(api => api.endpoints?.length > 0);

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden text-slate-900 selection:bg-blue-100">
            {/* Public Header */}
            <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-50 bg-white/80 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
                        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                            <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black uppercase tracking-tight leading-none mb-0.5">{project.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">API Documentation</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-1.5 opacity-60">
                        <Globe className="w-3.5 h-3.5" />
                        <span className="text-xs font-mono">{project.base_url || "Production"}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded shadow-sm border border-blue-100 uppercase tracking-widest">Read Only</span>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Navigation */}
                <aside className={`${sidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:w-80 lg:translate-x-0'} border-r border-slate-200 bg-slate-50/50 flex flex-col transition-all duration-300 z-40 overflow-hidden`}>
                    <div className="p-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Filter endpoints..."
                                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 h-10 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 pb-10 space-y-8">
                        {filteredApis.map(api => (
                            <div key={api.id} className="space-y-1">
                                <h4 className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{api.name}</h4>
                                <div className="space-y-0.5">
                                    {api.endpoints.map(ep => (
                                        <button
                                            key={ep.id}
                                            onClick={() => { setSelectedEndpointId(ep.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${selectedEndpointId === ep.id ? 'bg-white shadow-md shadow-slate-200/50 border border-slate-100' : 'hover:bg-slate-100/50 border border-transparent opacity-70 hover:opacity-100'}`}
                                        >
                                            <span className={`text-[8px] font-black w-10 text-center py-0.5 rounded border uppercase ${ep.method === 'GET' ? 'text-blue-600 bg-blue-50 border-blue-100' :
                                                    ep.method === 'POST' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                                        ep.method === 'PUT' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                                            ep.method === 'DELETE' ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-600 bg-slate-50 border-slate-200'
                                                }`}>
                                                {ep.method}
                                            </span>
                                            <span className={`text-xs font-mono truncate ${selectedEndpointId === ep.id ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                                                {ep.path}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {filteredApis.length === 0 && (
                            <div className="p-10 text-center opacity-30">
                                <p className="text-xs font-bold uppercase tracking-widest">No results</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Doc Viewer */}
                <main className="flex-1 overflow-hidden flex flex-col bg-white">
                    {selectedEndpointId ? (
                        <ApiPreview endpointId={selectedEndpointId} baseUrl={project.base_url || ""} />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 bg-slate-50/20 opacity-40 grayscale">
                            <Search className="w-16 h-16 text-slate-200 mb-6" />
                            <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Select a route</h3>
                            <p className="text-slate-300 text-sm">Pick an endpoint from the left to view documentation.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
