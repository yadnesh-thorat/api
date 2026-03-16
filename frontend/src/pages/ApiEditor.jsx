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
    CheckCircle2,
    Circle,
    Info,
    Activity
} from "lucide-react";

export default function ApiEditor({ endpointId, projectId }) {
    const queryClient = useQueryClient();
    const { isConnected, activeUsers, joinDoc, leaveDoc, sendUpdate, onDocUpdate, onDocInit } = useSocket();
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

    // Blueprint Completeness Check
    const qualityChecks = [
        { label: "Valid Method & Path", meta: "Required", status: !!(currentEndpoint.method && currentEndpoint.path) },
        { label: "Security Context", meta: "Best Practice", status: currentEndpoint.auth_type && currentEndpoint.auth_type !== 'None' },
        { label: "Response Schema", meta: "Document Accuracy", status: !!currentEndpoint.response_schema },
        { label: "Success Summary", meta: "Required", status: (currentEndpoint.summary?.length > 10) },
        { label: "Internal Docs", meta: "Developer Context", status: (currentEndpoint.description?.length > 30) },
    ];
    const completionRate = Math.round((qualityChecks.filter(c => c.status).length / qualityChecks.length) * 100);

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
                                        { name: 'User', data: { name: "string", email: "string", active: true } },
                                        { name: 'List', data: { items: [], count: 0 } },
                                        { name: 'Status', data: { ok: true, timestamp: "" } }
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

            {/* Top Toolbar */}
            <div className="sticky top-0 z-40 bg-white border-b border-slate-100 flex flex-col">
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-100 p-1 rounded-xl pr-4">
                            <select
                                value={currentEndpoint.method || "GET"}
                                onChange={(e) => updateField("method", e.target.value)}
                                className={`px-4 h-10 rounded-lg text-xs font-black tracking-widest border-none outline-none appearance-none cursor-pointer bg-white shadow-sm`}
                                style={{ color: methodColor }}
                            >
                                {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <input
                                value={currentEndpoint.path || ""}
                                onChange={(e) => updateField("path", e.target.value)}
                                placeholder="/api/v1/resource"
                                className="bg-transparent border-none focus:ring-0 text-sm font-mono font-bold text-slate-800 w-full min-w-[200px]"
                            />
                        </div>

                        <div className="h-6 w-px bg-slate-200 hidden md:block" />

                        {/* Real-time Presence */}
                        <div className="hidden md:flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {activeUsers.slice(0, 3).map((u) => (
                                    <div key={u.userId} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold shadow-sm" style={{ backgroundColor: u.color }} title={u.name}>
                                        {u.name[0]}
                                    </div>
                                ))}
                                {activeUsers.length > 3 && (
                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                                        +{activeUsers.length - 3}
                                    </div>
                                )}
                            </div>
                            {activeUsers.length > 0 && <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{activeUsers.length} editing</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowVersions(!showVersions)}
                            className={`p-2.5 rounded-xl transition-all ${showVersions ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                            title="Versioning History"
                        >
                            <Clock className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="flex items-center gap-2 px-6 h-11 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saveMutation.isPending ? "Saving..." : "Save Sync"}
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Sub-navigation Tabs */}
                <div className="px-6 flex gap-8 bg-white">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative py-4 text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && <span className="text-[9px] text-blue-400">({tab.count})</span>}
                            {tab.required && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" title="Required fields present" />}
                            {tab.dot && !tab.required && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto bg-slate-50/30">
                    <div className="max-w-6xl mx-auto p-10 space-y-12">

                        {/* Blueprint Health Banner */}
                        <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50 animate-fadeInLow">
                            <div className="p-8 flex flex-col md:flex-row items-center gap-8">
                                <div className="relative w-32 h-32 flex-shrink-0">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * completionRate) / 100} className={`${completionRate === 100 ? 'text-emerald-500' : 'text-blue-600'} transition-all duration-1000 ease-out`} />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-slate-900">{completionRate}%</span>
                                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Health</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">API Blueprint Progress</h3>
                                            <p className="text-xs text-slate-400 font-medium">Follow this checklist to meet high-quality documentation standards</p>
                                        </div>
                                        {completionRate === 100 && (
                                            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest outline outline-1 outline-emerald-100">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Production Ready
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {qualityChecks.map((check, i) => (
                                            <div key={i} className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border transition-all ${check.status ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'}`}>
                                                {check.status ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold leading-tight">{check.label}</span>
                                                    <span className="text-[8px] font-medium opacity-60 uppercase tracking-tighter">{check.meta}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-900 px-8 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Info className="w-3 h-3 text-blue-400" />
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tip: A complete blueprint improves developer experience and SDK generation</p>
                                </div>
                                <Activity className="w-3 h-3 text-slate-500" />
                            </div>
                        </div>

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
    return (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{title}</h4>
                <button
                    onClick={() => onChange([...items, { name: "", type: "string", required: false, description: "" }])}
                    className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm"
                >
                    <Plus className="w-3 h-3" /> Add
                </button>
            </div>
            <div className="divide-y divide-slate-100">
                {items.map((item, i) => (
                    <div key={i} className="p-4 flex flex-col md:flex-row gap-4 items-start group hover:bg-slate-50/50 transition-colors">
                        <div className="flex gap-3 flex-1 w-full">
                            <input
                                value={item.name}
                                onChange={e => {
                                    const next = [...items];
                                    next[i] = { ...item, name: e.target.value };
                                    onChange(next);
                                }}
                                placeholder="Name"
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 h-10 text-sm font-mono font-bold"
                            />
                            <select
                                value={item.type || "string"}
                                onChange={e => {
                                    const next = [...items];
                                    next[i] = { ...item, type: e.target.value };
                                    onChange(next);
                                }}
                                className="w-28 bg-white border border-slate-200 rounded-xl px-2 h-10 text-xs font-semibold"
                            >
                                <option value="string">string</option>
                                <option value="number">number</option>
                                <option value="boolean">boolean</option>
                                <option value="array">array</option>
                                <option value="object">object</option>
                            </select>
                            <label className="flex items-center gap-2 cursor-pointer select-none border border-slate-200 rounded-xl px-3 bg-white">
                                <input
                                    type="checkbox"
                                    checked={item.required}
                                    onChange={e => {
                                        const next = [...items];
                                        next[i] = { ...item, required: e.target.checked };
                                        onChange(next);
                                    }}
                                    className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className={`text-[10px] font-black uppercase tracking-tighter ${item.required ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {item.required && <span className="mr-1 text-red-500">*</span>}
                                    Required
                                </span>
                            </label>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto flex-1">
                            <input
                                value={item.description}
                                onChange={e => {
                                    const next = [...items];
                                    next[i] = { ...item, description: e.target.value };
                                    onChange(next);
                                }}
                                placeholder="Short description of this parameter..."
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 h-10 text-xs"
                            />
                            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="p-3 text-slate-300 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="p-10 text-center text-slate-400 text-xs italic">
                        No {title.toLowerCase()} defined yet.
                    </div>
                )}
            </div>
        </div>
    );
}

function SchemaBox({ title, data, onEdit, color }) {
    return (
        <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-64`}>
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">{title}</h4>
                <button onClick={onEdit} className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Define Object
                </button>
            </div>
            <div className="flex-1 p-5 overflow-auto bg-slate-50/30">
                {data ? (
                    <pre className="text-[11px] font-mono text-slate-600">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-40">
                        <FileJson className="w-8 h-8 text-slate-300" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Schema Defined</p>
                    </div>
                )}
            </div>
        </div>
    );
}
