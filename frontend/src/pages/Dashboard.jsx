import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { projectsApi } from "../lib/api";
import { formatRelativeTime } from "../lib/utils";
import {
  Plus,
  FolderOpen,
  Users,
  Code2,
  ExternalLink,
  Trash2,
  Search,
  Zap
} from "lucide-react";
function Dashboard() {
  const user = { name: "Internal User" };
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await projectsApi.list();
      return res.data;
    }
  });
  const createMutation = useMutation({
    mutationFn: (data) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewUrl("");
    }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => projectsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] })
  });
  const filteredProjects = projects.filter(
    (p) => p.name.toLowerCase().includes(searchFilter.toLowerCase()) || p.description?.toLowerCase().includes(searchFilter.toLowerCase())
  );
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {
          /* Header */
        }
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <span>Welcome back, {user?.name?.split(" ")[0]}</span>
              <span className="text-2xl">👋</span>
            </h1>
            <p className="text-slate-600 mt-1">Manage your API documentation projects</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20 hover:opacity-90 transition-opacity animate-fadeIn"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>

        {
          /* Search */
        }
        <div className="relative mb-6 animate-fadeIn">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search projects..."
            className="w-full max-w-md pl-11 pr-4 h-12 w-full rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-200 transition-all"
          />
        </div>

        {
          /* Create Project Modal */
        }
        {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setShowCreate(false)}>
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 w-full max-w-lg mx-4 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Create New Project</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({ name: newName, description: newDesc, base_url: newUrl });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Name *</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 h-12 w-full rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-200 transition-all"
                  placeholder="E-Commerce API"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-4 h-12 w-full rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-200 transition-all resize-none h-20"
                  placeholder="A brief description of your API..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Base URL</label>
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-4 h-12 w-full rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-200 transition-all font-mono text-sm"
                  placeholder="https://api.example.com/v1"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-12 rounded-xl bg-white text-slate-700 font-medium hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                  {createMutation.isPending ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>}

        {
          /* Projects Grid */
        }
        {isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 animate-shimmer h-48" />)}
        </div> : filteredProjects.length === 0 ? <div className="text-center py-20 animate-fadeIn">
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            {searchFilter ? "No projects found" : "No projects yet"}
          </h3>
          <p className="text-slate-500 mb-6">
            {searchFilter ? "Try a different search term" : "Create your first API documentation project"}
          </p>
          {!searchFilter && <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-6 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Create Project
          </button>}
        </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project, i) => <Link
            key={project.id}
            to={`/project/${project.id}`}
            className="group bg-white border border-slate-200 shadow-sm rounded-2xl p-6 hover:border-blue-200 transition-all duration-300 hover:-translate-y-1 animate-fadeIn"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm("Delete this project?")) {
                      deleteMutation.mutate(project.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors mb-1">
              {project.name}
            </h3>
            <p className="text-sm text-slate-500 line-clamp-2 mb-4">
              {project.description || "No description"}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                {project.endpoint_count || 0} endpoints
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {project.member_count || 0} members
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Updated {formatRelativeTime(project.updated_at)}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${project.member_role === "owner" ? "bg-blue-50 text-blue-600" : "bg-white text-slate-600"}`}>
                {project.member_role || "member"}
              </span>
            </div>
          </Link>)}
        </div>}
      </div>
    </div>
  );
}
export {
  Dashboard as default
};
