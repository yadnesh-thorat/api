import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpointsApi } from "../lib/api";
import { getMethodColor } from "../lib/utils";

export default function ApiPreview({ endpointId, baseUrl }) {
    const [codeLang, setCodeLang] = useState("curl");

    const { data: endpoint, isLoading } = useQuery({
        queryKey: ["endpoint", endpointId],
        queryFn: async () => {
            const res = await endpointsApi.get(endpointId);
            return res.data;
        },
        enabled: !!endpointId
    });

    if (isLoading) {
        return <div className="p-8 animate-pulse">
            <div className="h-8 w-1/3 bg-slate-200 rounded mb-4"></div>
            <div className="h-4 w-2/3 bg-slate-200 rounded mb-8"></div>
            <div className="h-32 bg-slate-200 rounded mb-4"></div>
        </div>;
    }

    if (!endpoint) return null;

    const methodColor = getMethodColor(endpoint.method);

    // Prepare code snippet
    const fullUrl = `${baseUrl}${endpoint.path}`;
    const reqBodySnippet = endpoint.request_body ? JSON.stringify(generateExample(endpoint.request_body), null, 2) : "";
    let headers = [];
    if (endpoint.auth_type) {
        if (endpoint.auth_type === 'Bearer') headers.push(['Authorization', 'Bearer <TOKEN>']);
        else if (endpoint.auth_type === 'API Key') headers.push(['x-api-key', '<API_KEY>']);
        else if (endpoint.auth_type === 'Basic') headers.push(['Authorization', 'Basic <CREDENTIALS>']);
    }
    if (endpoint.request_body) headers.push(['Content-Type', 'application/json']);

    const generateSnippet = (lang) => {
        const method = endpoint.method.toUpperCase();
        if (lang === 'curl') {
            let snippet = `curl -X ${method} "${fullUrl}"`;
            headers.forEach(([k, v]) => {
                snippet += ` \\\n     -H "${k}: ${v}"`;
            });
            if (reqBodySnippet && method !== 'GET') {
                snippet += ` \\\n     -d '${reqBodySnippet}'`;
            }
            return snippet;
        }
        if (lang === 'js-fetch') {
            let snippet = `fetch("${fullUrl}", {\n  method: "${method}",\n  headers: {`;
            headers.forEach(([k, v]) => {
                snippet += `\n    "${k}": "${v}",`;
            });
            snippet += "\n  }";
            if (reqBodySnippet && method !== 'GET') {
                snippet += `,\n  body: JSON.stringify(${reqBodySnippet.split('\n').join('\n  ')})`;
            }
            snippet += "\n})\n.then(response => response.json())\n.then(data => console.log(data));";
            return snippet;
        }
        if (lang === 'python-requests') {
            let snippet = `import requests\n\nurl = "${fullUrl}"\n`;
            if (headers.length > 0) {
                snippet += "headers = {\n";
                headers.forEach(([k, v]) => { snippet += `  "${k}": "${v}",\n`; });
                snippet += "}\n\n";
            } else {
                snippet += "headers = {}\n\n";
            }
            if (reqBodySnippet && method !== 'GET') {
                let formattedJson = reqBodySnippet.split('\n').join('\n');
                snippet += `payload = ${formattedJson}\n\n`;
                snippet += `response = requests.request("${method}", url, headers=headers, json=payload)\n`;
            } else {
                snippet += `response = requests.request("${method}", url, headers=headers)\n`;
            }
            snippet += "print(response.json())";
            return snippet;
        }
        return "";
    };

    return (
        <div className="flex-1 overflow-y-auto bg-white animate-fadeIn">
            {/* Upper Hero Section */}
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-10">
                <div className="flex items-center gap-3 mb-4">
                    <span
                        className="px-3 py-1 rounded-md text-sm font-bold font-mono tracking-wider"
                        style={{ color: methodColor, backgroundColor: `${methodColor}15` }}
                    >
                        {endpoint.method}
                    </span>
                    <h2 className="text-xl font-mono text-slate-800 break-all bg-white px-3 py-1 rounded-md border border-slate-200 shadow-sm">
                        {baseUrl}<span className="text-blue-600 font-semibold">{endpoint.path}</span>
                    </h2>
                    {endpoint.is_deprecated && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium border border-yellow-200">
                            Deprecated
                        </span>
                    )}
                </div>

                {endpoint.summary && (
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">{endpoint.summary}</h1>
                )}

                {endpoint.description && (
                    <div className="mt-4 prose prose-slate prose-sm max-w-none text-slate-600">
                        {endpoint.description}
                    </div>
                )}

                {/* Authorization Banner */}
                {endpoint.auth_type && endpoint.auth_type !== 'None' && (
                    <div className="mt-6 inline-flex items-center gap-3 bg-purple-50 border border-purple-200 px-4 py-2.5 rounded-lg shadow-sm">
                        <span className="text-xs font-semibold text-purple-800 uppercase tracking-widest bg-white px-2 py-1 rounded shadow-sm border border-purple-100">Auth Required</span>
                        <span className="text-sm text-purple-900 font-medium">
                            {endpoint.auth_type === 'Bearer' ? 'Requires a Bearer Token in the Authorization header' :
                                endpoint.auth_type === 'API Key' ? 'Requires an API Key in the headers' :
                                    `Requires ${endpoint.auth_type} Authentication`}
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-0">

                {/* Left Column: Tables & Schemas */}
                <div className="p-8 space-y-10 border-r border-slate-200">

                    {/* Path Parameters */}
                    {endpoint.path_params?.length > 0 && (
                        <ParameterTable title="Path Parameters" params={endpoint.path_params} />
                    )}

                    {/* Query Parameters */}
                    {endpoint.query_params?.length > 0 && (
                        <ParameterTable title="Query Parameters" params={endpoint.query_params} />
                    )}

                    {/* Headers */}
                    {endpoint.headers?.length > 0 && (
                        <ParameterTable title="Headers" params={endpoint.headers} />
                    )}

                    {/* Request Body Info */}
                    {endpoint.request_body && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2">Request Schema</h3>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto shadow-sm">
                                <pre className="text-xs text-slate-700 font-mono">
                                    {JSON.stringify(endpoint.request_body, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Column: Code Generation & Responses */}
                <div className="p-8 space-y-10 bg-slate-50/50">

                    {/* Dynamic Code Generator */}
                    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-md border border-slate-800">
                        <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
                            <span className="text-xs font-semibold text-slate-200 tracking-wider">CODE EXAMPLE</span>
                            <select
                                value={codeLang}
                                onChange={e => setCodeLang(e.target.value)}
                                className="bg-slate-900 text-slate-300 text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-slate-500 font-medium"
                            >
                                <option value="curl">cURL</option>
                                <option value="js-fetch">JavaScript (Fetch)</option>
                                <option value="python-requests">Python (Requests)</option>
                            </select>
                        </div>
                        <div className="p-5 overflow-x-auto">
                            <pre className="text-xs text-blue-300 font-mono leading-relaxed">
                                {generateSnippet(codeLang)}
                            </pre>
                        </div>
                    </div>

                    {/* Responses */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Expected Responses</h3>
                        <div className="space-y-4">
                            {(endpoint.status_codes && endpoint.status_codes.length > 0 ? endpoint.status_codes : [{ code: 200, description: "Success" }]).map((status, i) => (
                                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-3">
                                        <span className={`text-sm font-black font-mono px-2 py-1 rounded ${status.code >= 200 && status.code < 300 ? 'bg-green-100 text-green-700' :
                                                status.code >= 400 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                            }`}>{status.code}</span>
                                        <span className="text-sm font-medium text-slate-700">{status.description}</span>
                                    </div>
                                    {status.code >= 200 && status.code < 300 && endpoint.response_schema && (
                                        <div className="bg-slate-900 p-5">
                                            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-3">Example JSON Payload</span>
                                            <pre className="text-xs text-green-400 font-mono overflow-x-auto">
                                                {JSON.stringify(generateExample(endpoint.response_schema), null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function ParameterTable({ title, params }) {
    if (!params || params.length === 0) return null;
    return (
        <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2">{title}</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                            <th className="px-5 py-3 font-semibold w-1/3">Parameter</th>
                            <th className="px-5 py-3 font-semibold w-1/4">Type</th>
                            <th className="px-5 py-3 font-semibold">Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {params.map((p, i) => (
                            <tr key={i} className="bg-white hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-4 align-top">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono text-slate-900 font-bold">{p.name}</span>
                                        {p.required && <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded shadow-sm">REQUIRED</span>}
                                    </div>
                                </td>
                                <td className="px-5 py-4 align-top">
                                    <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 font-medium">
                                        {p.type || "string"}
                                    </span>
                                </td>
                                <td className="px-5 py-4 align-top text-sm text-slate-600">
                                    {p.description || "No description provided."}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function generateExample(schema) {
    if (!schema) return {};
    if (schema.type === "object" && schema.properties) {
        const obj = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
            obj[key] = generateExample(prop);
        }
        return obj;
    }
    if (schema.type === "array") {
        return [generateExample(schema.items)];
    }
    switch (schema.type) {
        case "string":
            if (schema.format === "email") return "user@example.com";
            if (schema.format === "date-time") return (new Date()).toISOString();
            return schema.default || "string_value";
        case "number":
        case "integer":
            return schema.default || schema.minimum || 0;
        case "boolean":
            return schema.default || false;
        default:
            return null;
    }
}
