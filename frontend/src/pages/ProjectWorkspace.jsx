import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, apisApi, endpointsApi, exportApi, shareApi } from "../lib/api";
import { generatePdf } from "../lib/exportUtils";
import ApiEditor from "./ApiEditor";
import ApiPreview from "./ApiPreview";
import Editor from "@monaco-editor/react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  FolderOpen,
  Code2,
  FileCode2,
  Share2,
  Download,
  TreePine,
  Search,
  Settings,
  Zap,
  Check,
  FileJson,
  FileCode,
  Globe,
  Trash2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Circle,
  Info
} from "lucide-react";

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedEndpointId, setSelectedEndpointId] = useState(null);
  const [expandedApis, setExpandedApis] = useState(new Set());
  const [activeTab, setActiveTab] = useState("editor");
  const [showNewApi, setShowNewApi] = useState(false);
  const [newApiName, setNewApiName] = useState("");
  const [showNewEndpoint, setShowNewEndpoint] = useState(null);
  const [createTab, setCreateTab] = useState("params");
  const [newEndpoint, setNewEndpoint] = useState({
    path: "",
    method: "GET",
    summary: "",
    description: "",
    headers: [],
    query_params: [],
    path_params: [],
    auth_type: "None",
    request_body: null,
    response_schema: null,
    status_codes: [{ code: 200, description: "Success" }]
  });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const onboardingTips = [
    { id: 'path', label: 'Define endpoint route', status: !!newEndpoint.path },
    { id: 'summary', label: 'Add clear summary', status: newEndpoint.summary?.length > 5 },
    { id: 'schema', label: 'Define response schema', status: !!newEndpoint.response_schema },
    { id: 'auth', label: 'Set security protocol', status: newEndpoint.auth_type !== 'None' },
  ];
  const creationProgress = Math.round((onboardingTips.filter(t => t.status).length / onboardingTips.length) * 100);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await projectsApi.get(projectId);
      return res.data;
    },
    enabled: !!projectId
  });

  const { data: tree = [] } = useQuery({
    queryKey: ["project-tree", projectId],
    queryFn: async () => {
      const res = await projectsApi.getTree(projectId);
      return res.data;
    },
    enabled: !!projectId
  });

  useEffect(() => {
    if (tree.length > 0 && expandedApis.size === 0) {
      setExpandedApis(new Set(tree.map((a) => a.id)));
    }
  }, [tree]);

  const createApiMutation = useMutation({
    mutationFn: (data) => apisApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tree", projectId] });
      setShowNewApi(false);
      setNewApiName("");
    }
  });

  const createEndpointMutation = useMutation({
    mutationFn: ({ apiId, data }) => endpointsApi.create(apiId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["project-tree", projectId] });
      setShowNewEndpoint(null);
      setNewEndpoint({
        path: "",
        method: "GET",
        summary: "",
        description: "",
        headers: [],
        query_params: [],
        path_params: [],
        auth_type: "None",
        request_body: null,
        response_schema: null,
        status_codes: [{ code: 200, description: "Success" }]
      });
      setSelectedEndpointId(res.data.id);
      setActiveTab("editor");
    }
  });

  const deleteApiMutation = useMutation({
    mutationFn: (apiId) => apisApi.delete(apiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tree", projectId] });
    },
    onError: (err) => {
      alert("Failed to delete collection: " + (err.response?.data?.error || err.message));
    }
  });

  const deleteEndpointMutation = useMutation({
    mutationFn: (endpointId) => endpointsApi.delete(endpointId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tree", projectId] });
      setSelectedEndpointId(null);
    },
    onError: (err) => {
      alert("Failed to delete endpoint: " + (err.response?.data?.error || err.message));
    }
  });

  const toggleApi = (id) => {
    const next = new Set(expandedApis);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedApis(next);
  };

  const handleShare = async () => {
    try {
      const res = await shareApi.create(projectId, { expires_at: null });
      const shareUrl = `${window.location.origin}/share/${res.data.token}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      alert("Failed to create share link");
    }
  };

  const handleExport = async (format) => {
    try {
      const res = await exportApi.openapi(projectId, format);
      const blob = new Blob([format === 'yaml' ? res.data : JSON.stringify(res.data, null, 2)], { type: format === 'yaml' ? 'text/yaml' : 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.${format === 'yaml' ? 'yaml' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setShowExportMenu(false);
    } catch (err) {
      alert("Export failed");
    }
  };

  const handlePdfExport = async () => {
    try {
      setShowExportMenu(false);
      await generatePdf(project, tree);
    } catch (err) {
      console.error(err);
      alert("PDF Export failed");
    }
  };

  const filteredTree = tree.map(api => ({
    ...api,
    endpoints: (api.endpoints || []).filter(ep =>
      (ep.path || "").toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      (ep.summary || "").toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      (api.name || "").toLowerCase().includes(sidebarSearch.toLowerCase())
    )
  })).filter(api =>
    (api.name || "").toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    (api.endpoints && api.endpoints.length > 0)
  );

  const methodColors = {
    GET: "text-blue-600 bg-blue-50 border-blue-100",
    POST: "text-emerald-600 bg-emerald-50 border-emerald-100",
    PUT: "text-amber-600 bg-amber-50 border-amber-100",
    PATCH: "text-purple-600 bg-purple-50 border-purple-100",
    DELETE: "text-red-600 bg-red-50 border-red-100",
    UNKNOWN: "text-slate-600 bg-slate-50 border-slate-100"
  };

  return (
    <div className="flex-1 flex bg-white overflow-hidden">
      {/* Sidebar - Enhanced Document List */}
      <aside className="w-80 border-r border-slate-200 bg-slate-50/40 flex flex-col flex-shrink-0 z-30">

        {/* Project Context */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200 overflow-hidden">
              <Zap className="w-5 h-5 text-blue-400 fill-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900 tracking-tight truncate uppercase leading-none mb-1">{project?.name}</h2>
              <div className="flex items-center gap-1.5 opacity-60">
                <Globe className="w-3 h-3 text-slate-400" />
                <p className="text-[10px] font-mono text-slate-500 truncate">{project?.base_url || "No target URL"}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 relative">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-3 h-9 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all text-xs font-bold shadow-sm"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedLink ? "Copied" : "Share"}
            </button>
            <div className="flex-1 relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="w-full flex items-center justify-center gap-2 px-3 h-9 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all text-xs font-bold shadow-md shadow-slate-200"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>

              {showExportMenu && (
                <div className="absolute top-10 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-2xl p-1 z-50 animate-scaleIn">
                  <button onClick={() => handleExport("json")} className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-slate-50 rounded-lg flex items-center gap-2">
                    <FileJson className="w-3 h-3 text-blue-500" /> JSON (OpenAPI)
                  </button>
                  <button onClick={() => handleExport("yaml")} className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-slate-50 rounded-lg flex items-center gap-2">
                    <FileCode className="w-3 h-3 text-emerald-500" /> YAML (OpenAPI)
                  </button>
                  <button onClick={handlePdfExport} className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-slate-50 rounded-lg flex items-center gap-2">
                    <Download className="w-3 h-3 text-red-500" /> Export to PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tree Container */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Quick Filter */}
          <div className="px-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search 100+ APIs..."
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 h-9 text-[11px] font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Collections</h3>
            <button
              onClick={() => { setShowNewApi(true); setSelectedEndpointId(null); setShowNewEndpoint(null); }}
              className="p-1 px-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-[10px] font-black"
            >
              CREATE NEW
            </button>
          </div>

          {showNewApi && (
            <div className="hidden">
              {/* Logic handled in main surface now */}
            </div>
          )}

          {filteredTree.map((api) => (
            <div key={api.id} className="space-y-1">
              <div className="flex items-center group">
                <button
                  onClick={() => toggleApi(api.id)}
                  className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/60 transition-colors text-left"
                >
                  <FolderOpen className={`w-4 h-4 transition-colors ${expandedApis.has(api.id) ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-700 truncate">{api.name}</span>
                  <span className="ml-auto text-[10px] font-black text-slate-400 bg-white border border-slate-100 px-1.5 py-0.5 rounded shadow-sm">
                    {api.endpoints?.length || 0}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewEndpoint(api.id);
                    setSelectedEndpointId(null);
                  }}
                  className="p-1.5 opacity-40 group-hover:opacity-100 bg-white shadow-sm border border-slate-200 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-all scale-90"
                  title="Add Endpoint"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete the entire "${api.name}" collection and all its endpoints?`)) {
                      deleteApiMutation.mutate(api.id);
                    }
                  }}
                  className="p-1.5 mr-2 opacity-40 group-hover:opacity-100 bg-white shadow-sm border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 transition-all scale-90"
                  title="Delete Collection"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {expandedApis.has(api.id) && (api.endpoints || []).map((ep) => {
                if (!ep) return null;
                const method = (ep.method || "GET").toUpperCase();
                return (
                  <div key={ep.id} className="relative group/ep flex items-center">
                    <button
                      onClick={() => { setSelectedEndpointId(ep.id); setActiveTab("editor"); setShowNewEndpoint(null); }}
                      className={`flex-1 flex items-center gap-3 pl-10 pr-4 py-2 text-left transition-all relative ${selectedEndpointId === ep.id ? 'bg-white shadow-sm border-l-2 border-blue-600' : 'hover:bg-white/40'}`}
                    >
                      <span className={`text-[8px] font-black w-10 py-0.5 rounded border text-center ${methodColors[method] || methodColors.UNKNOWN}`}>
                        {method}
                      </span>
                      <span className={`text-xs font-mono truncate ${selectedEndpointId === ep.id ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>
                        {ep.path || "/"}
                      </span>
                      {((ep.query_params || []).some(p => p.required) || (ep.headers || []).some(h => h.required) || (ep.path_params || []).some(p => p.required)) && (
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0 ml-auto mr-4" title="Contains required fields" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete endpoint "${method} ${ep.path}"?`)) {
                          deleteEndpointMutation.mutate(ep.id);
                        }
                      }}
                      className="absolute right-2 opacity-40 group-hover/ep:opacity-100 p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white shadow-sm transition-all"
                      title="Delete Endpoint"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}

          {tree.length === 0 && (
            <div className="py-20 text-center opacity-40 grayscale flex flex-col items-center">
              <TreePine className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Empty Workspace</p>
            </div>
          )}
        </div>

        {/* Workspace Footer Actions */}
        <div className="p-4 border-t border-slate-200 flex gap-2">
          <button className="flex-1 px-3 py-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2 justify-center transition-colors">
            <Settings className="w-3.5 h-3.5" /> Project Config
          </button>
        </div>
      </aside>

      {/* Main Surface */}
      <main className="flex-1 flex flex-col min-w-0 bg-white shadow-inner">
        {selectedEndpointId ? (
          <>
            {/* Header Tabs - Document Switcher */}
            <div className="px-6 flex items-center justify-between border-b border-slate-200 bg-white">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("editor")}
                  className={`flex items-center gap-2 px-6 h-14 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'editor' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <FileCode2 className="w-4 h-4" /> Document Editor
                  {activeTab === 'editor' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600" />}
                </button>
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-2 px-6 h-14 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'preview' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Globe className="w-4 h-4" /> Published Preview
                  {activeTab === 'preview' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600" />}
                </button>
              </div>
            </div>

            {/* Tab Rendering */}
            <div className="flex-1 flex flex-col min-h-0 relative">
              {activeTab === 'editor' ? (
                <ApiEditor endpointId={selectedEndpointId} projectId={projectId} />
              ) : (
                <ApiPreview endpointId={selectedEndpointId} baseUrl={project?.base_url || ""} />
              )}
            </div>
          </>
        ) : showNewApi ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/20 animate-fadeIn overflow-y-auto">
            <div className="w-full max-w-xl bg-white rounded-[32px] border border-slate-200 shadow-2xl p-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Create API Collection</h3>
                  <p className="text-xs text-slate-500 font-medium">Group related endpoints together (e.g. "Auth", "Users")</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Collection Name</label>
                <input
                  placeholder="Enter collection name..."
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 h-14 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                  value={newApiName}
                  onChange={e => setNewApiName(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowNewApi(false)} className="flex-1 h-14 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">CANCEL</button>
                <button
                  onClick={() => { if (newApiName.trim()) createApiMutation.mutate({ name: newApiName }); }}
                  className="flex-[2] h-14 rounded-2xl bg-indigo-600 text-white text-sm font-black shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
                >
                  CREATE COLLECTION
                </button>
              </div>
            </div>
          </div>
        ) : showNewEndpoint ? (
          <div className="flex-1 flex flex-col min-h-0 bg-white animate-fadeIn">
            {/* Mission Control Bar */}
            <div className="bg-slate-900 px-8 py-2 flex items-center justify-between flex-shrink-0">
              <div className="flex gap-6">
                {onboardingTips.map(tip => (
                  <div key={tip.id} className={`flex items-center gap-2 transition-all ${tip.status ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${tip.status ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{tip.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${creationProgress}%` }} />
                </div>
                <span className="text-[10px] font-black text-blue-400">{creationProgress}% READY</span>
              </div>
            </div>

            {/* Main Action Header */}
            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-200">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">API Blueprint Engine</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Documenting to <span className="text-blue-600 underline font-black">{tree.find(a => a.id === showNewEndpoint)?.name}</span> Collection</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowNewEndpoint(null)}
                  className="px-8 h-12 rounded-xl border-2 border-slate-100 text-xs font-black text-slate-400 hover:border-slate-200 hover:text-slate-600 transition-all uppercase tracking-widest"
                >
                  Discard
                </button>
                <button
                  onClick={() => { if (newEndpoint.path) createEndpointMutation.mutate({ apiId: showNewEndpoint, data: newEndpoint }); }}
                  className="px-10 h-12 rounded-xl bg-slate-900 text-white text-xs font-black shadow-2xl shadow-slate-300 hover:bg-black transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2"
                >
                  Confirm & Document <Check className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Unified Scrollable Surface */}
            <div className="flex-1 overflow-y-auto bg-slate-50/10">
              <div className="max-w-5xl mx-auto p-10 space-y-12 pb-32">

                {/* Method & Path Core */}
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-40 flex-shrink-0">
                      <select
                        value={newEndpoint.method}
                        onChange={e => setNewEndpoint({ ...newEndpoint, method: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 h-14 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      >
                        {["GET", "POST", "PUT", "PATCH", "DELETE"].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        placeholder="/api/v1/resource"
                        autoFocus
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 h-14 text-sm font-mono text-slate-900 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                        value={newEndpoint.path}
                        onChange={e => setNewEndpoint({ ...newEndpoint, path: e.target.value })}
                      />
                    </div>
                  </div>
                  {/* Summary Field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Endpoint Title / Summary</label>
                    <input
                      placeholder="e.g. List all registered users with pagination"
                      className="w-full bg-white border border-slate-100 rounded-2xl px-6 h-12 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm"
                      value={newEndpoint.summary}
                      onChange={e => setNewEndpoint({ ...newEndpoint, summary: e.target.value })}
                    />
                  </div>
                </div>

                {/* Configuration Tabs Interior */}
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-8 border-b border-slate-100 bg-white flex-shrink-0">
                    <div className="flex gap-8">
                      {[
                        { id: 'params', label: 'Params', dot: newEndpoint.query_params.length > 0 || newEndpoint.path_params.length > 0 },
                        { id: 'auth', label: 'Authorization', dot: newEndpoint.auth_type !== 'None' },
                        { id: 'headers', label: 'Headers', count: newEndpoint.headers.length },
                        { id: 'body', label: 'Body', dot: !!newEndpoint.request_body },
                        { id: 'response', label: 'Response', dot: !!newEndpoint.response_schema },
                        { id: 'settings', label: 'Settings' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setCreateTab(tab.id)}
                          className={`relative py-5 text-[11px] font-black uppercase tracking-widest transition-all ${createTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          <span className="flex items-center gap-1.5">
                            {tab.label}
                            {tab.count > 0 && <span className="text-[9px] text-blue-400">({tab.count})</span>}
                            {tab.dot && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          </span>
                          {createTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full shadow-[0_-2px_8px_rgba(37,99,235,0.3)]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-10 min-h-[500px]">
                    {createTab === 'params' && (
                      <div className="space-y-10 animate-fadeInLow">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Query Parameters</label>
                            <button
                              onClick={() => setNewEndpoint({ ...newEndpoint, query_params: [...newEndpoint.query_params, { name: "", type: "string", description: "", required: false }] })}
                              className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-all"
                            >
                              + ADD PARAM
                            </button>
                          </div>
                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            {newEndpoint.query_params.length === 0 ? (
                              <div className="py-10 text-center text-slate-400 text-xs italic">No query parameters defined.</div>
                            ) : (
                              <div className="divide-y divide-slate-100">
                                {newEndpoint.query_params.map((p, i) => (
                                  <div key={i} className="p-4 flex gap-3 items-center">
                                    <input
                                      placeholder="Key"
                                      className="flex-1 bg-slate-50 border-none rounded-xl px-4 h-10 text-xs font-mono font-bold"
                                      value={p.name}
                                      onChange={e => {
                                        const next = [...newEndpoint.query_params];
                                        next[i] = { ...next[i], name: e.target.value };
                                        setNewEndpoint({ ...newEndpoint, query_params: next });
                                      }}
                                    />
                                    <select
                                      value={p.type || "string"}
                                      onChange={e => {
                                        const next = [...newEndpoint.query_params];
                                        next[i] = { ...next[i], type: e.target.value };
                                        setNewEndpoint({ ...newEndpoint, query_params: next });
                                      }}
                                      className="w-24 bg-slate-50 border-none rounded-xl px-2 h-10 text-[10px] font-bold"
                                    >
                                      <option value="string">string</option>
                                      <option value="number">number</option>
                                      <option value="boolean">boolean</option>
                                    </select>
                                    <input
                                      placeholder="Description"
                                      className="flex-[2] bg-slate-50 border-none rounded-xl px-4 h-10 text-xs text-slate-600"
                                      value={p.description}
                                      onChange={e => {
                                        const next = [...newEndpoint.query_params];
                                        next[i] = { ...next[i], description: e.target.value };
                                        setNewEndpoint({ ...newEndpoint, query_params: next });
                                      }}
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 border border-slate-100 rounded-xl px-3 h-10 transition-all hover:bg-white focus-within:ring-2 focus-within:ring-blue-100">
                                      <input
                                        type="checkbox"
                                        checked={p.required}
                                        onChange={e => {
                                          const next = [...newEndpoint.query_params];
                                          next[i] = { ...next[i], required: e.target.checked };
                                          setNewEndpoint({ ...newEndpoint, query_params: next });
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Required</span>
                                    </label>
                                    <button
                                      onClick={() => setNewEndpoint({ ...newEndpoint, query_params: newEndpoint.query_params.filter((_, idx) => idx !== i) })}
                                      className="p-2 text-slate-300 hover:text-red-500"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Path Parameters</label>
                            <button
                              onClick={() => setNewEndpoint({ ...newEndpoint, path_params: [...newEndpoint.path_params, { name: "", type: "string", description: "" }] })}
                              className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-all"
                            >
                              + ADD VARIABLE
                            </button>
                          </div>
                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            {newEndpoint.path_params.length === 0 ? (
                              <div className="p-6">
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  No path parameters. Add one or use <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600">:name</code> in the path.
                                </p>
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-100">
                                {newEndpoint.path_params.map((p, i) => (
                                  <div key={i} className="p-4 flex gap-3 items-center">
                                    <input
                                      placeholder="Variable Name"
                                      className="flex-1 bg-slate-50 border-none rounded-xl px-4 h-10 text-xs font-mono font-bold"
                                      value={p.name}
                                      onChange={e => {
                                        const next = [...newEndpoint.path_params];
                                        next[i] = { ...next[i], name: e.target.value };
                                        setNewEndpoint({ ...newEndpoint, path_params: next });
                                      }}
                                    />
                                    <input
                                      placeholder="Description"
                                      className="flex-[2] bg-slate-50 border-none rounded-xl px-4 h-10 text-xs text-slate-600"
                                      value={p.description}
                                      onChange={e => {
                                        const next = [...newEndpoint.path_params];
                                        next[i] = { ...next[i], description: e.target.value };
                                        setNewEndpoint({ ...newEndpoint, path_params: next });
                                      }}
                                    />
                                    <button
                                      onClick={() => setNewEndpoint({ ...newEndpoint, path_params: newEndpoint.path_params.filter((_, idx) => idx !== i) })}
                                      className="p-2 text-slate-300 hover:text-red-500"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {createTab === 'auth' && (
                      <div className="max-w-2xl space-y-8 animate-fadeInLow">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Auth Type</label>
                          <select
                            value={newEndpoint.auth_type}
                            onChange={e => setNewEndpoint({ ...newEndpoint, auth_type: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 h-14 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                          >
                            <option value="None">No Authentication</option>
                            <option value="Bearer">Bearer Token (JWT)</option>
                            <option value="API Key">API Key</option>
                            <option value="Basic">Basic Auth (Base64)</option>
                          </select>
                        </div>

                        {newEndpoint.auth_type === 'API Key' && (
                          <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Key Name</label>
                              <input
                                placeholder="X-API-Key"
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 h-12 text-sm font-mono font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                                value={newEndpoint.auth_key_name || ""}
                                onChange={e => setNewEndpoint({ ...newEndpoint, auth_key_name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Location</label>
                              <select
                                value={newEndpoint.auth_location || "Header"}
                                onChange={e => setNewEndpoint({ ...newEndpoint, auth_location: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 h-12 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                              >
                                <option value="Header">Header</option>
                                <option value="Query">Query Parameter</option>
                              </select>
                            </div>
                          </div>
                        )}

                        <div className="p-8 bg-blue-50/50 rounded-[32px] border border-blue-100 flex gap-6">
                          <ShieldCheck className="w-8 h-8 text-blue-600 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-bold text-blue-900 mb-2">Security Definition</h4>
                            <p className="text-xs text-blue-600 leading-relaxed font-medium">
                              Selecting a security type here will ensure it's documented in your OpenAPI spec and visible in the test console.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {createTab === 'headers' && (
                      <div className="space-y-6 animate-fadeInLow">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">HTTP Headers</label>
                          <button
                            onClick={() => setNewEndpoint({ ...newEndpoint, headers: [...newEndpoint.headers, { name: "", value: "", description: "" }] })}
                            className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-all"
                          >
                            + ADD HEADER
                          </button>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                          {newEndpoint.headers.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 text-xs italic">No custom headers. Common headers are auto-generated.</div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {newEndpoint.headers.map((h, i) => (
                                <div key={i} className="p-4 flex gap-3 items-center">
                                  <input
                                    placeholder="Header-Name"
                                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 h-10 text-xs font-mono font-bold"
                                    value={h.name}
                                    onChange={e => {
                                      const next = [...newEndpoint.headers];
                                      next[i] = { ...h, name: e.target.value };
                                      setNewEndpoint({ ...newEndpoint, headers: next });
                                    }}
                                  />
                                  <input
                                    placeholder="Example Value"
                                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 h-10 text-xs"
                                    value={h.value}
                                    onChange={e => {
                                      const next = [...newEndpoint.headers];
                                      next[i] = { ...h, value: e.target.value };
                                      setNewEndpoint({ ...newEndpoint, headers: next });
                                    }}
                                  />
                                  <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 border border-slate-100 rounded-xl px-3 h-10 transition-all hover:bg-white">
                                    <input
                                      type="checkbox"
                                      checked={h.required}
                                      onChange={e => {
                                        const next = [...newEndpoint.headers];
                                        next[i] = { ...h, required: e.target.checked };
                                        setNewEndpoint({ ...newEndpoint, headers: next });
                                      }}
                                      className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${h.required ? 'text-blue-600' : 'text-slate-400'}`}>Required</span>
                                  </label>
                                  <button
                                    onClick={() => setNewEndpoint({ ...newEndpoint, headers: newEndpoint.headers.filter((_, idx) => idx !== i) })}
                                    className="p-2 text-slate-300 hover:text-red-500"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {createTab === 'body' && (
                      <div className="space-y-6 animate-fadeInLow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Request Body Schema</label>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">application/json</span>
                        </div>
                        <div className="rounded-[32px] overflow-hidden border border-slate-200 shadow-xl bg-[#1e1e1e]">
                          <div className="bg-[#2d2d2d] px-6 py-2 border-b border-[#333] flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">JSON Editor</span>
                            <div className="flex gap-2">
                              {[
                                { name: 'User', data: { name: "John Doe", email: "john@example.com", role: "admin" } },
                                { name: 'Product', data: { id: "prod_123", name: "Premium Laptop", price: 999.99 } }
                              ].map(template => (
                                <button
                                  key={template.name}
                                  onClick={() => setNewEndpoint({ ...newEndpoint, request_body: template.data })}
                                  className="text-[9px] font-black bg-[#3d3d3d] text-slate-400 px-3 py-1 rounded-full hover:bg-blue-600 hover:text-white transition-all"
                                >
                                  + {template.name}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Editor
                            height="600px"
                            language="json"
                            theme="vs-dark"
                            value={JSON.stringify(newEndpoint.request_body || { name: "string" }, null, 2)}
                            options={{
                              minimap: { enabled: false },
                              fontSize: 14,
                              padding: { top: 20 },
                              scrollBeyondLastLine: false,
                            }}
                            onChange={(val) => {
                              try {
                                const parsed = JSON.parse(val || "{}");
                                setNewEndpoint({ ...newEndpoint, request_body: parsed });
                              } catch (e) { }
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {createTab === 'response' && (
                      <div className="space-y-12 animate-fadeInLow">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-emerald-600" />
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Response Schema (200 OK)</label>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">application/json</span>
                          </div>
                          <div className="rounded-[32px] overflow-hidden border border-slate-200 shadow-xl bg-[#1e1e1e]">
                            <div className="bg-[#2d2d2d] px-6 py-2 border-b border-[#333] flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">JSON Editor</span>
                              <div className="flex gap-2">
                                {[
                                  { name: 'Success', data: { success: true, message: "Action completed" } },
                                  { name: 'Paginated', data: { data: [], total: 0, page: 1, limit: 10 } }
                                ].map(template => (
                                  <button
                                    key={template.name}
                                    onClick={() => setNewEndpoint({ ...newEndpoint, response_schema: template.data })}
                                    className="text-[9px] font-black bg-[#3d3d3d] text-slate-400 px-3 py-1 rounded-full hover:bg-emerald-600 hover:text-white transition-all"
                                  >
                                    + {template.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <Editor
                              height="600px"
                              language="json"
                              theme="vs-dark"
                              value={JSON.stringify(newEndpoint.response_schema || { success: true }, null, 2)}
                              options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                padding: { top: 20 },
                                scrollBeyondLastLine: false,
                              }}
                              onChange={(val) => {
                                try {
                                  const parsed = JSON.parse(val || "{}");
                                  setNewEndpoint({ ...newEndpoint, response_schema: parsed });
                                } catch (e) { }
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status Codes</label>
                            <button
                              onClick={() => setNewEndpoint({ ...newEndpoint, status_codes: [...newEndpoint.status_codes, { code: 400, description: "Bad Request" }] })}
                              className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-all"
                            >
                              + ADD CODE
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {newEndpoint.status_codes.map((sc, i) => (
                              <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-3 items-center group shadow-sm">
                                <input
                                  type="number"
                                  className="w-16 bg-slate-50 border-none rounded-xl px-2 h-10 text-xs font-bold text-center"
                                  value={sc.code}
                                  onChange={e => {
                                    const next = [...newEndpoint.status_codes];
                                    next[i] = { ...sc, code: parseInt(e.target.value) || 0 };
                                    setNewEndpoint({ ...newEndpoint, status_codes: next });
                                  }}
                                />
                                <input
                                  placeholder="Description"
                                  className="flex-1 bg-slate-50 border-none rounded-xl px-4 h-10 text-xs"
                                  value={sc.description}
                                  onChange={e => {
                                    const next = [...newEndpoint.status_codes];
                                    next[i] = { ...sc, description: e.target.value };
                                    setNewEndpoint({ ...newEndpoint, status_codes: next });
                                  }}
                                />
                                <button
                                  onClick={() => setNewEndpoint({ ...newEndpoint, status_codes: newEndpoint.status_codes.filter((_, idx) => idx !== i) })}
                                  className="p-2 text-slate-300 hover:text-red-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {createTab === 'settings' && (
                      <div className="max-w-4xl space-y-12 animate-fadeInLow">
                        <div className="space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                              <Check className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Core Metadata</h4>
                              <p className="text-[10px] text-slate-400 font-medium">Identify this route in documentation</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Route Summary</label>
                            <input
                              placeholder="Registers a new system user"
                              className="w-full bg-white border border-slate-200 rounded-2xl px-6 h-14 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                              value={newEndpoint.summary}
                              onChange={e => setNewEndpoint({ ...newEndpoint, summary: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                                <FileCode2 className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Technical Documentation</h4>
                                <p className="text-[10px] text-slate-400 font-medium">Markdown notes for developers</p>
                              </div>
                            </div>
                          </div>
                          <div className="rounded-[32px] overflow-hidden border border-slate-200 shadow-2xl bg-[#1e1e1e]">
                            <div className="bg-[#2d2d2d] px-6 py-2 border-b border-[#333] flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Markdown Editor</span>
                            </div>
                            <Editor
                              height="300px"
                              language="markdown"
                              theme="vs-dark"
                              value={newEndpoint.description}
                              options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                padding: { top: 20 },
                                wordWrap: "on"
                              }}
                              onChange={(val) => setNewEndpoint({ ...newEndpoint, description: val || "" })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 bg-slate-50/20">
            <div className="w-24 h-24 bg-white rounded-[40px] shadow-2xl flex items-center justify-center mb-8 animate-pulse border border-slate-100">
              <Code2 className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Ready to Document</h3>
            <p className="text-slate-400 text-sm max-w-sm text-center">Select an existing endpoint from your collection or create a new one to begin defining your API contract.</p>
          </div>
        )}
      </main>
    </div>
  );
}
