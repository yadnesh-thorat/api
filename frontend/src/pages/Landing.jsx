import { Link } from "react-router-dom";
import {
  Zap,
  FileCode2,
  Users,
  Share2,
  TestTube2,
  GitBranch,
  Search,
  Server,
  TreePine,
  ArrowRight,
  Code2,
  Globe,
  Shield,
  Sparkles,
  ChevronRight
} from "lucide-react";
const features = [
  { icon: Users, title: "Real-Time Collaboration", desc: "Edit docs simultaneously with live cursors and instant syncing", color: "#6366F1" },
  { icon: FileCode2, title: "API Documentation", desc: "Build beautiful API docs with schemas, headers, and examples", color: "#3B82F6" },
  { icon: Share2, title: "Shareable Links", desc: "Share documentation via public or team-restricted links", color: "#10B981" },
  { icon: TestTube2, title: "API Playground", desc: "Test APIs directly from your documentation like Postman", color: "#F59E0B" },
  { icon: Shield, title: "API Contracts", desc: "Define request/response schemas with auto-validation", color: "#8B5CF6" },
  { icon: GitBranch, title: "Version History", desc: "Track every change with full version timeline and restore", color: "#EC4899" },
  { icon: Search, title: "Smart Search", desc: "Find any API by endpoint, tag, method, or description", color: "#06B6D4" },
  { icon: Server, title: "Mock Server", desc: "Auto-generate mock APIs from your contracts for frontend dev", color: "#EF4444" },
  { icon: TreePine, title: "API Tree View", desc: "Visualize your entire API structure in a navigable tree", color: "#84CC16" }
];
const techStack = [
  { name: "React", desc: "UI Framework" },
  { name: "TypeScript", desc: "Type Safety" },
  { name: "Node.js", desc: "Backend" },
  { name: "PostgreSQL", desc: "Database" },
  { name: "Socket.IO", desc: "Real-time" },
  { name: "Yjs CRDT", desc: "Collaboration" }
];
function Landing() {
  return <div className="min-h-screen">
            {
    /* Hero Section */
  }
            <section className="relative overflow-hidden">
                {
    /* Background effects */
  }
                <div className="absolute inset-0 gradient-mesh" />
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
                    <div className="text-center max-w-4xl mx-auto">
                        {
    /* Badge */
  }
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-600/10 border border-primary-500/20 text-primary-300 text-sm font-medium mb-8 animate-fadeIn">
                            <Sparkles className="w-4 h-4" />
                            Google Docs + Swagger + Postman Combined
                        </div>

                        {
    /* Heading */
  }
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6 animate-fadeIn">
                            <span className="text-white">Collaborative</span>
                            <br />
                            <span className="bg-gradient-to-r from-primary-400 via-purple-400 to-accent-400 bg-clip-text text-transparent">
                                API Documentation
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-surface-400 max-w-2xl mx-auto mb-10 animate-fadeIn leading-relaxed">
                            Write, test, and share API documentation in real-time with your team.
                            Define contracts, generate OpenAPI specs, and test endpoints — all in one platform.
                        </p>

                        {
    /* CTA Buttons */
  }
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeIn">
                            <Link
    to="/register"
    className="group flex items-center gap-2 px-8 py-3.5 rounded-xl gradient-primary text-white font-semibold text-lg shadow-xl shadow-primary-600/25 hover:shadow-primary-500/30 transition-all hover:scale-105"
  >
                                Start Building
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
    to="/login"
    className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-surface-800/60 text-surface-200 font-semibold text-lg border border-surface-700/50 hover:bg-surface-700/60 transition-all"
  >
                                <Code2 className="w-5 h-5" />
                                View Demo
                            </Link>
                        </div>

                        {
    /* Tech Stack Pills */
  }
                        <div className="flex flex-wrap justify-center gap-3 mt-14 animate-fadeIn">
                            {techStack.map((tech) => <div
    key={tech.name}
    className="px-4 py-2 rounded-lg bg-surface-900/80 border border-surface-800/60 text-surface-400 text-sm"
  >
                                    <span className="font-medium text-surface-200">{tech.name}</span>
                                    <span className="mx-1.5 text-surface-700">·</span>
                                    {tech.desc}
                                </div>)}
                        </div>
                    </div>
                </div>
            </section>

            {
    /* Code Preview */
  }
            <section className="max-w-6xl mx-auto px-4 -mt-8 mb-20">
                <div className="glass rounded-2xl p-1 shadow-2xl shadow-black/30">
                    <div className="bg-surface-900 rounded-xl overflow-hidden">
                        {
    /* Editor tab bar */
  }
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-800">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                            </div>
                            <span className="ml-2 text-xs text-surface-500 font-mono">api-documentation.yaml</span>
                            <div className="ml-auto flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-primary-500 border-2 border-surface-900 flex items-center justify-center text-[10px] font-bold text-white">A</div>
                                    <div className="w-6 h-6 rounded-full bg-accent-500 border-2 border-surface-900 flex items-center justify-center text-[10px] font-bold text-white">B</div>
                                    <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-surface-900 flex items-center justify-center text-[10px] font-bold text-white">C</div>
                                </div>
                                <span className="text-xs text-surface-500">3 editing</span>
                            </div>
                        </div>
                        {
    /* Code area */
  }
                        <div className="p-6 font-mono text-sm leading-relaxed">
                            <div className="text-surface-500">openapi: <span className="text-accent-400">"3.1.0"</span></div>
                            <div className="text-surface-500">info:</div>
                            <div className="text-surface-500">  title: <span className="text-primary-400">"E-Commerce API"</span></div>
                            <div className="text-surface-500">  version: <span className="text-accent-400">"1.0.0"</span></div>
                            <div className="text-surface-500 mt-2">paths:</div>
                            <div className="text-surface-500">  <span className="text-yellow-400">/users</span>:</div>
                            <div className="text-surface-500">    post:</div>
                            <div className="text-surface-500">      summary: <span className="text-primary-400">"Create a new user"</span></div>
                            <div className="text-surface-500">      requestBody:</div>
                            <div className="text-surface-500">        content:</div>
                            <div className="text-surface-500">          application/json:</div>
                            <div className="text-surface-500">            schema:</div>
                            <div className="text-surface-500">              type: <span className="text-accent-400">object</span></div>
                            <div className="text-surface-500">              properties:</div>
                            <div className="text-surface-500">                name: {"{"} type: <span className="text-accent-400">string</span> {"}"}</div>
                            <div className="text-surface-500">                email: {"{"} type: <span className="text-accent-400">string</span>, format: <span className="text-purple-400">email</span> {"}"}</div>
                            {
    /* Fake cursor */
  }
                            <div className="relative mt-1">
                                <div className="absolute left-[220px] top-0 w-0.5 h-5 bg-purple-400 animate-pulse" />
                                <div className="absolute left-[215px] -top-4 text-[10px] px-1.5 py-0.5 rounded bg-purple-500 text-white font-sans">Alice</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {
    /* Features Grid */
  }
            <section id="features" className="max-w-7xl mx-auto px-4 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                        Everything You Need
                    </h2>
                    <p className="text-surface-400 text-lg max-w-2xl mx-auto">
                        A complete toolkit for modern API documentation and collaboration
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((feature, i) => <div
    key={feature.title}
    className="group glass rounded-2xl p-6 hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1 cursor-default"
    style={{ animationDelay: `${i * 50}ms` }}
  >
                            <div
    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
    style={{ backgroundColor: `${feature.color}15` }}
  >
                                <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-300 transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-surface-400 text-sm leading-relaxed">
                                {feature.desc}
                            </p>
                        </div>)}
                </div>
            </section>

            {
    /* How it Works */
  }
            <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">How It Works</h2>
                    <p className="text-surface-400 text-lg">Get started in minutes</p>
                </div>

                <div className="space-y-8">
                    {[
    { step: "01", title: "Create a Project", desc: "Set up your API project with a name, base URL, and team members." },
    { step: "02", title: "Define Your APIs", desc: "Add endpoints, request/response schemas, headers, and authentication." },
    { step: "03", title: "Collaborate in Real-Time", desc: "Invite your team to edit documentation simultaneously with live cursors." },
    { step: "04", title: "Test & Export", desc: "Test APIs from the playground, generate OpenAPI specs, and share with stakeholders." }
  ].map((item) => <div key={item.step} className="flex items-start gap-6 group">
                            <div className="shrink-0 w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-600/20 group-hover:scale-110 transition-transform">
                                {item.step}
                            </div>
                            <div className="pt-1">
                                <h3 className="text-xl font-semibold text-white mb-1">{item.title}</h3>
                                <p className="text-surface-400">{item.desc}</p>
                            </div>
                        </div>)}
                </div>
            </section>

            {
    /* CTA Section */
  }
            <section className="max-w-4xl mx-auto px-4 py-20">
                <div className="glass rounded-3xl p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 gradient-mesh opacity-50" />
                    <div className="relative">
                        <Globe className="w-12 h-12 text-primary-400 mx-auto mb-6 animate-float" />
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Ready to Transform Your API Workflow?
                        </h2>
                        <p className="text-surface-400 text-lg mb-8 max-w-xl mx-auto">
                            Join teams building better APIs with collaborative documentation.
                        </p>
                        <Link
    to="/register"
    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl gradient-primary text-white font-semibold text-lg shadow-xl shadow-primary-600/25 hover:shadow-primary-500/30 transition-all hover:scale-105"
  >
                            Get Started Free <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {
    /* Footer */
  }
            <footer className="border-t border-surface-800/50 py-8">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-surface-300">APIFlow Docs</span>
                    </div>
                    <p className="text-surface-500 text-sm">
                        Built with ❤️ using React, Node.js, PostgreSQL, and Socket.IO
                    </p>
                </div>
            </footer>
        </div>;
}
export {
  Landing as default
};
