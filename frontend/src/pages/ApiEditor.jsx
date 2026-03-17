import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { endpointsApi, versionsApi } from "../lib/api";
import { useSocket } from "../hooks/useSocket";
import { formatRelativeTime, getMethodColor } from "../lib/utils";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import {
    Save,
    Clock,
    Code2,
    FileJson,
    ChevronDown,
    ChevronRight,
    Plus,
    Trash2,
    RotateCcw,
    Layout,
    Layers,
    ShieldCheck,
    AlertCircle,
    Zap
} from "lucide-react";

export default function ApiEditor({ endpointId, projectId }) {
    const queryClient = useQueryClient();
    const { isConnected, activeUsers, joinDoc, leaveDoc, sendUpdate, onDocUpdate, onDocInit } = useSocket();
    const [isGenerating, setIsGenerating] = useState(false);
    const [editedEndpoint, setEditedEndpoint] = useState({});
    const [jsonEditor, setJsonEditor] = useState(null);
    const [editorContent, setEditorContent] = useState("");
    const [showVersions, setShowVersions] = useState(false);
    const [expandedSections, setExpandedSections] = useState(new Set(["basic", "request", "response", "params"]));

    const yDocRef = useRef(new Y.Doc());
    const isUpdatingRef = useRef(false);

    const { data: endpoint, isLoading } = useQuery({
        queryKey: ["endpoint", endpointId],
        queryFn: async () => {
            const res = await endpointsApi.get(endpointId);
            return res.data;
        },
        enabled: !!endpointId
    });

    const { data: versions = [] } = useQuery({
        queryKey: ["versions", endpointId],
        queryFn: async () => {
            const res = await versionsApi.list(endpointId);
            return res.data;
        },
        enabled: showVersions && !!endpointId
    });

    const { data: projectSchemas = [] } = useQuery({
        queryKey: ["project-schemas", projectId],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api'}/projects/${projectId}/schemas`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            return res.json();
        },
        enabled: !!projectId
    });

    useEffect(() => {
        if (endpoint) {
            setEditedEndpoint(endpoint);
            // Initialize Yjs doc with the fetched endpoint data
            yDocRef.current.getMap("content").set("data", endpoint);
        }
    }, [endpoint, yDocRef]);

    useEffect(() => {
        if (endpointId) {
            const docId = `endpoint-${endpointId}`;
            joinDoc(docId);

            const ymap = yDocRef.current.getMap("content");

            const handleUpdate = (update) => {
                if (!isUpdatingRef.current) {
                    Y.applyUpdate(yDocRef.current, new Uint8Array(update.update));
                    const next = ymap.get("data");
                    if (next) setEditedEndpoint(next);
                }
            };

            const handleInit = (data) => {
                Y.applyUpdate(yDocRef.current, new Uint8Array(data.state));
                const next = ymap.get("data");
                if (next) setEditedEndpoint(next);
            };

            const unbindUpdate = onDocUpdate(handleUpdate);
            const unbindInit = onDocInit(handleInit);

            const observer = () => {
                if (!isUpdatingRef.current) {
                    const next = ymap.get("data");
                    if (next) setEditedEndpoint(next);
                }
            };
            ymap.observe(observer);

            return () => {
                leaveDoc(docId);
                unbindUpdate();
                unbindInit();
                ymap.unobserve(observer);
                yDocRef.current = new Y.Doc(); // Reset Y.Doc on unmount
            };
        }
    }, [endpointId, joinDoc, leaveDoc, onDocUpdate, onDocInit, yDocRef]);

    const saveMutation = useMutation({
        mutationFn: (data) => endpointsApi.update(endpointId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["endpoint", endpointId] });
            queryClient.invalidateQueries({ queryKey: ["project-tree", projectId] });
        }
    });

    const restoreMutation = useMutation({
        mutationFn: (versionId) => versionsApi.restore(versionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["endpoint", endpointId] });
            queryClient.invalidateQueries({ queryKey: ["versions", endpointId] });
        }
    });

    const updateRemote = (nextState) => {
        isUpdatingRef.current = true;
        const ymap = yDocRef.current.getMap("content");

        yDocRef.current.transact(() => {
            ymap.set("data", nextState);
        });

        const update = Y.encodeStateAsUpdate(yDocRef.current);
        sendUpdate(`endpoint-${endpointId}`, Array.from(update));
        isUpdatingRef.current = false;
    };

    const handleSave = () => {
        saveMutation.mutate(editedEndpoint);
    };

    const [activeTab, setActiveTab] = useState("params");

    const updateField = (field, value) => {
        setEditedEndpoint((prev) => {
            const next = { ...prev, [field]: value };
            updateRemote(next);
            return next;
        });
    };

    const openJsonEditor = (type) => {
        const data = type === "request" ? currentEndpoint.request_body : currentEndpoint.response_schema;
        setEditorContent(JSON.stringify(data || {}, null, 2));
        setJsonEditor(type);
    };

    const saveJsonEditor = () => {
        try {
            const parsed = JSON.parse(editorContent);
            if (jsonEditor === "request") {
                updateField("request_body", parsed);
            } else {
                updateField("response_schema", parsed);
            }
            setJsonEditor(null);
        } catch (e) {
            alert("Invalid JSON");
        }
    };

    const generateAiMock = async (type) => {
        setIsGenerating(true);
        try {
            // Get names from existing params if any to help AI
            const fieldNames = [
                ...(currentEndpoint.query_params || []).map(p => p.name),
                ...(currentEndpoint.path_params || []).map(p => p.name),
                ...(currentEndpoint.headers || []).map(h => h.name)
            ].filter(Boolean).join(", ");

            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api'}/ai/generate-mock`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    type,
                    method: currentEndpoint.method,
                    path: currentEndpoint.path,
                    summary: currentEndpoint.summary,
                    fieldNames,
                    contentType: currentEndpoint.headers?.find(h => h.name?.toLowerCase() === 'content-type')?.value || "application/json",
                    requestBody: type === "response" ? currentEndpoint.request_body : null
                })
            });
            const data = await res.json();
            if (data.mock) {
                if (type === "request") {
                    updateField("request_body", data.mock);
                } else {
                    updateField("response_schema", data.mock);
                }
            }
        } catch (e) {
            console.error("AI Generation failed", e);
            alert("Failed to generate mock data. Check your AI configuration.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 space-y-6">
            <div className="h-10 w-1/2 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-64 w-full bg-slate-100 rounded-2xl animate-pulse" />
        </div>;
    }

    if (!endpoint) return null;

    const currentEndpoint = editedEndpoint && editedEndpoint.method ? editedEndpoint : endpoint;
    const methodColor = getMethodColor(currentEndpoint.method || "GET");

    const tabs = [
        {
            id: 'params',
            label: 'Params',
            count: (currentEndpoint.query_params?.length || 0) + (currentEndpoint.path_params?.length || 0),
            dot: (currentEndpoint.query_params?.length > 0 || currentEndpoint.path_params?.length > 0),
            required: (currentEndpoint.query_params?.some(p => p.required) || currentEndpoint.path_params?.some(p => p.required))
        },
        {
            id: 'auth',
            label: 'Authorization',
            dot: currentEndpoint.auth_type && currentEndpoint.auth_type !== 'None'
        },
        {
            id: 'headers',
            label: 'Headers',
            count: currentEndpoint.headers?.length,
            required: currentEndpoint.headers?.some(h => h.required)
        },
        { id: 'body', label: 'Body', dot: !!currentEndpoint.request_body },
        { id: 'response', label: 'Response', dot: !!currentEndpoint.response_schema },
        { id: 'docs', label: 'Documentation' },
        { id: 'settings', label: 'Route Settings' }
    ];


    return (
        <div className="flex flex-col h-full bg-white relative animate-fadeIn">
            {/* JSON Modal */}
            {jsonEditor && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-10 overflow-y-auto">
                    <div className="bg-white w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden animate-scaleIn my-auto">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <FileJson className="w-5 h-5 text-blue-600" />
                                {jsonEditor === "request" ? "Request Schema Editor" : "Response Schema Editor"}
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    {[
                                        { name: 'User', data: { id: "string", name: "string", email: "string", role: "admin|user", active: true } },
                                        { name: 'Product', data: { id: "string", name: "string", price: 0, category: "string", stock: 100 } },
                                        { name: 'Order', data: { id: "string", customer_id: "string", items: [{ product_id: "string", qty: 1 }], total: 0, status: "pending" } },
                                        { name: 'Error', data: { code: 400, message: "Error description", timestamp: "" } },
                                        { name: 'List', data: { items: [], count: 0, next_page: null } }
                                    ].map(t => (
                                        <button
                                            key={t.name}
                                            onClick={() => setEditorContent(JSON.stringify(t.data, null, 2))}
                                            className="text-[9px] font-black bg-white border border-slate-200 text-slate-400 px-3 py-1.5 rounded-full hover:border-blue-500 hover:text-blue-600 transition-all"
                                        >
                                            + {t.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="w-px h-6 bg-slate-200" />
                                <button onClick={() => setJsonEditor(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
                                <button onClick={saveJsonEditor} className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md">Apply Changes</button>
                            </div>
                        </div>
                        <div className="p-1 bg-slate-900">
                            <Editor
                                height="700px"
                                language="json"
                                value={editorContent}
                                onChange={(v) => setEditorContent(v || "")}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    padding: { top: 20 },
                                    scrollBeyondLastLine: false,
                                    lineNumbers: "on"
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Top Toolbar - Postman Style */}
            <div className="sticky top-0 z-40 bg-white border-b border-slate-200">
                <div className="px-6 py-4 flex flex-col gap-4">
                    {/* Breadcrumbs / Name Section */}
                    <div className="flex items-center gap-2 mb-2">
                        <Layout className="w-4 h-4 text-orange-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">My Workspace / API Project /</span>
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{currentEndpoint.summary || "Unnamed Request"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Request URL Bar */}
                        <div className="flex-1 flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                            <select
                                value={currentEndpoint.method || "GET"}
                                onChange={(e) => updateField("method", e.target.value)}
                                className={`px-4 h-9 rounded-md text-xs font-black tracking-widest border-none outline-none appearance-none cursor-pointer bg-white shadow-sm transition-colors`}
                                style={{ 
                                    color: methodColor,
                                    backgroundColor: 'white'
                                }}
                            >
                                {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map(m => (
                                    <option key={m} value={m} className="font-bold">{m}</option>
                                ))}
                            </select>
                            <div className="h-5 w-px bg-slate-300 mx-2" />
                            <input
                                value={currentEndpoint.path || ""}
                                onChange={(e) => updateField("path", e.target.value)}
                                placeholder="http://api.example.com/v1/resource"
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-mono text-slate-700 h-9 px-2"
                            />
                        </div>

                        {/* Send & Save Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSave}
                                disabled={saveMutation.isPending}
                                className="flex items-center gap-2 px-6 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {saveMutation.isPending ? "Saving..." : "Send / Save"}
                                <ChevronDown className="w-3.5 h-3.5 opacity-60 border-l border-white/20 pl-1.5 ml-1" />
                            </button>
                            <button
                                onClick={() => setShowVersions(!showVersions)}
                                className={`flex items-center gap-2 px-4 h-11 rounded-lg border border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all ${showVersions ? 'bg-slate-100 border-slate-300' : ''}`}
                            >
                                <Clock className="w-4 h-4" />
                                <span className="hidden lg:inline">History</span>
                            </button>
                        </div>
                    </div>

                    {/* Meta Context */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base URL:</span>
                                <span className="text-[10px] font-bold text-blue-600 cursor-pointer hover:underline">localhost:4000</span>
                            </div>
                            <div className="h-4 w-px bg-slate-200" />
                            {/* Real-time Presence */}
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-1.5">
                                    {activeUsers.slice(0, 3).map((u) => (
                                        <div key={u.userId} className="w-6 h-6 rounded-full border border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold shadow-sm" style={{ backgroundColor: u.color }} title={u.name}>
                                            {u.name[0]}
                                        </div>
                                    ))}
                                </div>
                                {activeUsers.length > 0 && <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{activeUsers.length} editing</span>}
                            </div>
                        </div>

                        {/* Content Type Picker */}
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200">
                             <Layers className="w-3 h-3 text-slate-400" />
                             <select
                                value={currentEndpoint.headers?.find(h => h.name?.toLowerCase() === 'content-type')?.value || "application/json"}
                                onChange={(e) => {
                                    const headers = [...(currentEndpoint.headers || [])];
                                    const index = headers.findIndex(h => h.name?.toLowerCase() === 'content-type');
                                    if (index > -1) {
                                        headers[index] = { ...headers[index], value: e.target.value };
                                    } else {
                                        headers.push({ name: "Content-Type", value: e.target.value, required: true, enabled: true });
                                    }
                                    updateField("headers", headers);
                                }}
                                className="bg-transparent border-none text-[10px] font-black text-slate-600 focus:ring-0 cursor-pointer uppercase tracking-tight"
                            >
                                <option value="application/json">JSON</option>
                                <option value="application/xml">XML</option>
                                <option value="text/plain">TEXT</option>
                                <option value="multipart/form-data">FORM-DATA</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Postman Tabs Bar */}
                <div className="px-6 flex gap-1 bg-white border-t border-slate-100">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2.5 ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab.label}
                            {tab.dot && <div className={`w-1.5 h-1.5 rounded-full ${tab.required ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-orange-500'}`} />}
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-orange-600" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto bg-slate-50/30">
                    <div className="max-w-6xl mx-auto p-10 space-y-12">


                        {activeTab === 'params' && (
                            <div className="animate-fadeInLow space-y-10">
                                <ParameterList title="Query Parameters" items={currentEndpoint.query_params || []} onChange={items => updateField("query_params", items)} />
                                <ParameterList title="Path Parameters" items={currentEndpoint.path_params || []} onChange={items => updateField("path_params", items)} />
                            </div>
                        )}

                        {activeTab === 'auth' && (
                            <div className="animate-fadeInLow">
                                <section className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-sm transition-all hover:shadow-md">
                                    <div className="flex items-center gap-4 mb-8 border-b border-slate-50 pb-6">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                            <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 uppercase tracking-tight">Endpoint Authentication</h3>
                                            <p className="text-xs text-slate-400">Define how users should authenticate with this route</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                                        <div className="space-y-4">
                                            <select
                                                value={currentEndpoint.auth_type || "None"}
                                                onChange={(e) => updateField("auth_type", e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 h-14 text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                                            >
                                                <option value="None">No Authentication</option>
                                                <option value="Bearer">Bearer Token (JWT)</option>
                                                <option value="API Key">API Key</option>
                                                <option value="Basic">Basic Auth (Base64)</option>
                                            </select>

                                            {currentEndpoint.auth_type === 'API Key' && (
                                                <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Key Name</label>
                                                        <input
                                                            placeholder="X-API-Key"
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 h-12 text-sm font-mono font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                                                            value={currentEndpoint.auth_key_name || ""}
                                                            onChange={e => updateField("auth_key_name", e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Location</label>
                                                        <select
                                                            value={currentEndpoint.auth_location || "Header"}
                                                            onChange={e => updateField("auth_location", e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 h-12 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                                                        >
                                                            <option value="Header">Header</option>
                                                            <option value="Query">Query Parameter</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                                <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                                                    <span className="font-black uppercase mr-2 tracking-widest">Note:</span>
                                                    Changes here will automatically update the playground test console and all generated documentation snippets.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-100 rounded-[32px]">
                                            <AlertCircle className="w-8 h-8 text-slate-200 mb-4" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center leading-loose">
                                                Auth requirements for this route are <br />managed at the collection level by default.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'headers' && (
                            <div className="animate-fadeInLow">
                                <ParameterList title="HTTP Headers" items={currentEndpoint.headers || []} onChange={items => updateField("headers", items)} />
                            </div>
                        )}

                        {activeTab === 'body' && (
                            <div className="animate-fadeInLow">
                                <SchemaBox
                                    title="Request Body JSON Schema"
                                    data={currentEndpoint.request_body}
                                    onEdit={() => openJsonEditor("request")}
                                    onAiGenerate={() => generateAiMock("request")}
                                    isGenerating={isGenerating}
                                    schemas={projectSchemas}
                                    onSelectSchema={(schema) => updateField("request_body", schema.definition)}
                                    color="blue"
                                />
                            </div>
                        )}

                        {activeTab === 'response' && (
                            <div className="animate-fadeInLow space-y-12">
                                <div className="grid grid-cols-1 gap-12">
                                    <SchemaBox
                                        title="Success Response Schema (200 OK)"
                                        data={currentEndpoint.response_schema}
                                        onEdit={() => openJsonEditor("response")}
                                        onAiGenerate={() => generateAiMock("response")}
                                        isGenerating={isGenerating}
                                        schemas={projectSchemas}
                                        onSelectSchema={(schema) => updateField("response_schema", schema.definition)}
                                        color="emerald"
                                    />

                                    <section className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-10">
                                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                                            <div>
                                                <h3 className="font-black text-slate-900 uppercase tracking-tight">Status Codes</h3>
                                                <p className="text-xs text-slate-400">Document possible response states</p>
                                            </div>
                                            <button
                                                onClick={() => updateField("status_codes", [...(editedEndpoint.status_codes || []), { code: 200, description: "Success" }])}
                                                className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all uppercase tracking-widest"
                                            >
                                                <Plus className="w-4 h-4" /> Add Code
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {(editedEndpoint.status_codes || []).map((sc, i) => (
                                                <div key={i} className="flex gap-4 group items-center">
                                                    <div className="w-24">
                                                        <input
                                                            type="number"
                                                            value={sc.code}
                                                            onChange={e => {
                                                                const codes = [...editedEndpoint.status_codes];
                                                                codes[i] = { ...sc, code: parseInt(e.target.value) };
                                                                updateField("status_codes", codes);
                                                            }}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-mono font-bold text-slate-800 focus:ring-4 focus:ring-blue-50 transition-all"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <input
                                                            value={sc.description}
                                                            onChange={e => {
                                                                const codes = [...editedEndpoint.status_codes];
                                                                codes[i] = { ...sc, description: e.target.value };
                                                                updateField("status_codes", codes);
                                                            }}
                                                            placeholder="Description"
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 h-12 text-sm text-slate-600 focus:ring-4 focus:ring-blue-50 transition-all"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => updateField("status_codes", editedEndpoint.status_codes.filter((_, idx) => idx !== i))}
                                                        className="p-3 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}

                        {activeTab === 'docs' && (
                            <div className="animate-fadeInLow">
                                <section className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                                            <Code2 className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 uppercase tracking-tight">Engineering Documentation</h3>
                                            <p className="text-xs text-slate-400">Markdown enabled internal notes for implementation details</p>
                                        </div>
                                    </div>
                                    <div className="rounded-[32px] border border-slate-200 overflow-hidden shadow-2xl bg-[#1e1e1e]">
                                        <div className="bg-[#2d2d2d] px-6 py-2 border-b border-[#333] flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Markdown Editor</span>
                                        </div>
                                        <Editor
                                            height="700px"
                                            language="markdown"
                                            value={currentEndpoint.documentation || ""}
                                            onChange={(v) => updateField("documentation", v || "")}
                                            theme="vs-dark"
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 14,
                                                padding: { top: 30, left: 30, right: 30 },
                                                wordWrap: "on",
                                                scrollbar: {
                                                    verticalScrollbarSize: 8,
                                                    horizontalScrollbarSize: 8
                                                },
                                                scrollBeyondLastLine: false,
                                                lineNumbers: "off",
                                                folding: false
                                            }}
                                        />
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="animate-fadeInLow space-y-12">
                                <section className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-sm">
                                    <div className="flex items-center gap-4 mb-8 border-b border-slate-50 pb-6">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                            <Layers className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 uppercase tracking-tight">Core Metadata</h3>
                                            <p className="text-xs text-slate-400">Public identification of this API resource</p>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Route Summary / Name</label>
                                            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-1 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                                                <input
                                                    value={currentEndpoint.summary || ""}
                                                    onChange={(e) => updateField("summary", e.target.value)}
                                                    placeholder="Route Summary (e.g. Fetch user details)"
                                                    className="w-full bg-transparent px-5 py-4 text-sm font-bold text-slate-800 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Detailed Description</label>
                                            <div className="bg-slate-50 rounded-[24px] border border-slate-200 p-1 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                                                <textarea
                                                    value={currentEndpoint.description || ""}
                                                    onChange={(e) => updateField("description", e.target.value)}
                                                    placeholder="Detailed description with markdown support..."
                                                    className="w-full bg-transparent px-6 py-6 text-sm text-slate-600 outline-none h-48 resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                    </div>
                </div>

                {/* History Sidebar */}
                {showVersions && (
                    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col animate-slideInRight shadow-2xl z-50">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900">Version History</h3>
                            <button onClick={() => setShowVersions(false)} className="text-slate-400 hover:text-slate-600">×</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {versions.map((v) => (
                                <div key={v.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Version {v.version_number}</span>
                                        <button
                                            onClick={() => confirm("Restore this version?") && restoreMutation.mutate(v.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 bg-white shadow-sm rounded-lg text-slate-500 hover:text-blue-600 transition-all"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-600 mb-3 font-medium">{v.change_summary || "Automated snapshot"}</p>
                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-200/50">
                                        <span className="text-[10px] text-slate-400">{v.created_by_name}</span>
                                        <span className="text-[10px] text-slate-400">{formatRelativeTime(v.created_at)}</span>
                                    </div>
                                </div>
                            ))}
                            {versions.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                                    <AlertCircle className="w-8 h-8 text-slate-300" />
                                    <p className="text-xs text-slate-400">No previous versions available for this endpoint.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ParameterList({ title, items, onChange }) {
    const [isBulkEntry, setIsBulkEntry] = useState(false);
    const [bulkText, setBulkText] = useState("");
    const [hideAutoGenerated, setHideAutoGenerated] = useState(false);

    const handleBulkSave = () => {
        const lines = bulkText.split('\n');
        const next = [...items];
        lines.forEach(line => {
            const [name, value] = line.split(':').map(s => s.trim());
            if (name) {
                const existingIndex = next.findIndex(i => i.name?.toLowerCase() === name.toLowerCase());
                if (existingIndex > -1) {
                    next[existingIndex] = { ...next[existingIndex], value: value || next[existingIndex].value };
                } else {
                    next.push({ name, value: value || "", type: "string", description: "", enabled: true });
                }
            }
        });
        onChange(next);
        setIsBulkEntry(false);
        setBulkText("");
    };

    const toggleItem = (index) => {
        const next = [...items];
        next[index] = { ...next[index], enabled: !next[index].enabled };
        onChange(next);
    };

    // Auto-generated headers simulation if needed
    const autoHeaders = hideAutoGenerated ? [] : [
        { name: "Postman-Token", value: "<calculated when request is sent>", auto: true },
        { name: "Content-Length", value: "<calculated when request is sent>", auto: true },
        { name: "Host", value: "<calculated when request is sent>", auto: true },
        { name: "User-Agent", value: "APIFlowRuntime/1.0", auto: true },
        { name: "Accept", value: "*/*", auto: true },
        { name: "Connection", value: "keep-alive", auto: true }
    ];

    const displayItems = [...items, ...autoHeaders];

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm font-sans mb-8">
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h4 className="text-xs font-bold text-slate-700">{title}</h4>
                    {title.toLowerCase().includes('header') && (
                        <button 
                            onClick={() => setHideAutoGenerated(!hideAutoGenerated)}
                            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-700 font-medium transition-colors"
                        >
                            <Layers className={`w-3 h-3 ${hideAutoGenerated ? '' : 'text-blue-500'}`} />
                            {hideAutoGenerated ? "Show auto-generated headers" : "Hide auto-generated headers"}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsBulkEntry(!isBulkEntry)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                    >
                        {isBulkEntry ? "Key-Value Edit" : "Bulk Edit"}
                    </button>
                    <button
                        onClick={() => onChange([...items, { name: "", value: "", type: "string", enabled: true, description: "" }])}
                        className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                    >
                        <Plus className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            </div>

            {isBulkEntry ? (
                <div className="p-4 bg-white animate-fadeIn">
                    <textarea 
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                        placeholder="Key: Value&#10;Key: Value"
                        className="w-full h-48 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm font-mono focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                    />
                    <div className="mt-3 flex justify-end">
                        <button onClick={handleBulkSave} className="bg-blue-600 text-white text-[11px] font-bold uppercase py-2 px-6 rounded-lg shadow-lg shadow-blue-500/20">Save Bulk</button>
                    </div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/30">
                                <th className="w-10 px-4 py-2"></th>
                                <th className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-100">Key</th>
                                <th className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Value</th>
                                <th className="w-10 px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayItems.map((item, i) => {
                                const isAuto = item.auto;
                                return (
                                    <tr key={i} className={`group hover:bg-slate-50/50 transition-colors ${!item.enabled && !isAuto ? 'opacity-50' : ''}`}>
                                        <td className="px-4 py-2.5">
                                            <input 
                                                type="checkbox" 
                                                checked={item.enabled !== false} 
                                                disabled={isAuto}
                                                onChange={() => toggleItem(i)}
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-100 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                        </td>
                                        <td className="px-2 py-2.5 border-r border-slate-100 relative group/cell">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={item.name}
                                                    readOnly={isAuto}
                                                    onChange={e => {
                                                        const next = [...items];
                                                        next[i] = { ...item, name: e.target.value };
                                                        onChange(next);
                                                    }}
                                                    placeholder="Key"
                                                    className={`w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-300 ${isAuto ? 'text-slate-400 font-normal italic' : 'text-slate-800'}`}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-2 py-2.5">
                                            <input
                                                value={item.value}
                                                readOnly={isAuto}
                                                onChange={e => {
                                                    const next = [...items];
                                                    next[i] = { ...item, value: e.target.value };
                                                    onChange(next);
                                                }}
                                                placeholder="Value"
                                                className={`w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-300 ${isAuto ? 'text-slate-400 font-normal' : 'text-slate-800'}`}
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            {!isAuto && (
                                                <button 
                                                    onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                                                    className="p-1 text-slate-300 hover:text-red-500 transition-all rounded hover:bg-red-50 opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {!isBulkEntry && (
                                <tr className="border-t border-slate-100">
                                    <td className="w-10 px-4 py-2.5"></td>
                                    <td className="px-2 py-2.5 border-r border-slate-100">
                                        <input
                                            placeholder="Key"
                                            onFocus={() => onChange([...items, { name: "", value: "", enabled: true }])}
                                            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-200"
                                        />
                                    </td>
                                    <td className="px-2 py-2.5">
                                        <input
                                            placeholder="Value"
                                            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-200"
                                        />
                                    </td>
                                    <td className="w-10 px-4 py-2.5"></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            {displayItems.length === 0 && !isBulkEntry && (
                <div className="p-8 text-center text-slate-400 text-[11px] uppercase font-bold tracking-widest opacity-50">
                    No items defined yet
                </div>
            )}
        </div>
    );
}

function SchemaBox({ title, data, onEdit, onAiGenerate, isGenerating, schemas, onSelectSchema, color }) {
    return (
        <div className={`bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[300px] transition-all hover:shadow-xl hover:shadow-blue-500/5 group`}>
            {/* Header Section */}
            <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${color === 'blue' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} />
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</h4>
                </div>
                
                <div className="flex items-center gap-3">
                    {schemas?.length > 0 && (
                        <div className="relative">
                            <select 
                                onChange={(e) => {
                                    const schema = schemas.find(s => s.id === e.target.value);
                                    if (schema) onSelectSchema(schema);
                                    e.target.value = ""; 
                                }}
                                className="appearance-none bg-white border border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest rounded-xl pl-4 pr-10 py-2 outline-none hover:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all cursor-pointer shadow-sm"
                            >
                                <option value="">Import Entity</option>
                                {schemas.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    )}
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 relative overflow-auto bg-slate-50/30">
                {data ? (
                    <div className="p-8">
                        <div className="flex justify-end mb-4 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={onAiGenerate} disabled={isGenerating} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                                <Zap className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                            </button>
                            <button onClick={onEdit} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <pre className="text-[13px] font-mono font-medium text-slate-700 leading-relaxed bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-10 animate-fadeIn">
                        <div className="w-20 h-20 bg-white rounded-3xl border border-dashed border-slate-200 flex items-center justify-center text-slate-200 mb-8">
                            <FileJson className="w-10 h-10" />
                        </div>
                        
                        <div className="text-center mb-10">
                            <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">No schema defined for this section</h5>
                            <p className="text-[11px] text-slate-400 font-medium">Choose a speed-dial option below to generate your structure</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                            <button 
                                onClick={onAiGenerate}
                                disabled={isGenerating}
                                className="group/ai flex flex-col items-center gap-4 bg-white border border-indigo-100 p-6 rounded-[24px] shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300 transition-all outline-none focus:ring-4 focus:ring-indigo-50 disabled:opacity-50 active:scale-[0.98]"
                            >
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover/ai:scale-110 transition-transform">
                                    <Zap className={`w-6 h-6 text-white ${isGenerating ? 'animate-pulse' : ''}`} />
                                </div>
                                <div className="text-center">
                                    <span className="block text-[11px] font-black text-slate-900 uppercase tracking-widest">Magic Generate</span>
                                    <span className="text-[9px] text-indigo-500/60 font-bold uppercase mt-1">AI Powered Mocking</span>
                                </div>
                            </button>

                            <button 
                                onClick={onEdit}
                                className="group/man flex flex-col items-center gap-4 bg-white border border-blue-100 p-6 rounded-[24px] shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 transition-all outline-none focus:ring-4 focus:ring-blue-50 active:scale-[0.98]"
                            >
                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover/man:scale-110 transition-transform">
                                    <Plus className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-center">
                                    <span className="block text-[11px] font-black text-slate-900 uppercase tracking-widest">Create Manual</span>
                                    <span className="text-[9px] text-blue-500/60 font-bold uppercase mt-1">Write your own JSON</span>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
