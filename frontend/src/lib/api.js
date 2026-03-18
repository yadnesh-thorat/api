import axios from "axios";
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json"
  }
});

var stdin_default = api;

const projectsApi = {
  list: () => api.get("/projects"),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post("/projects", data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getTree: (id) => api.get(`/projects/${id}/tree`),
  addMember: (id, email, role) => api.post(`/projects/${id}/members`, { email, role })
};
const apisApi = {
  list: (projectId) => api.get(`/apis/project/${projectId}`),
  create: (projectId, data) => api.post(`/apis/project/${projectId}`, data),
  update: (id, data) => api.put(`/apis/${id}`, data),
  delete: (id) => api.delete(`/apis/${id}`)
};
const endpointsApi = {
  list: (apiId) => api.get(`/endpoints/api/${apiId}`),
  get: (id) => api.get(`/endpoints/${id}`),
  create: (apiId, data) => api.post(`/endpoints/api/${apiId}`, data),
  update: (id, data) => api.put(`/endpoints/${id}`, data),
  delete: (id) => api.delete(`/endpoints/${id}`)
};
const playgroundApi = {
  test: (data) => api.post("/playground/test", data)
};
const shareApi = {
  create: (projectId, data) => api.post(`/share/project/${projectId}`, data),
  get: (token) => api.get(`/share/${token}`)
};
const searchApi = {
  search: (params) => api.get("/search", { params })
};
const versionsApi = {
  list: (endpointId) => api.get(`/versions/endpoint/${endpointId}`),
  get: (id) => api.get(`/versions/${id}`),
  restore: (id) => api.post(`/versions/${id}/restore`),
  compare: (id1, id2) => api.get(`/versions/compare/${id1}/${id2}`)
};
const aiApi = {
  generateMock: (data) => api.post("/ai/generate-mock", data),
  generateEndpoint: (data) => api.post("/ai/generate-endpoint", data)
};
const exportApi = {
  openapi: (projectId, format = "json") => api.get(`/export/${projectId}/openapi`, { params: { format } }),
  postman: (projectId) => api.get(`/export/${projectId}/postman`),
  importSpec: (projectId, spec) => api.post(`/export/${projectId}/import`, { spec })
};
export {
  aiApi,
  apisApi,

  stdin_default as default,
  endpointsApi,
  exportApi,
  playgroundApi,
  projectsApi,
  searchApi,
  shareApi,
  versionsApi
};
