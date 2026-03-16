-- =====================================================
-- APIFlow Docs — Seed Data
-- =====================================================

-- Create demo user (password: demo123)
INSERT INTO users (id, email, password_hash, name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'demo@apiflow.dev', '$2b$10$rIC/gBxVd1HJoGfY1E3pCOYJhKXIIBYBZCHJhRhQLr3pZVl1bXbDi', 'Demo User', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'alice@apiflow.dev', '$2b$10$rIC/gBxVd1HJoGfY1E3pCOYJhKXIIBYBZCHJhRhQLr3pZVl1bXbDi', 'Alice Dev', 'developer'),
  ('33333333-3333-3333-3333-333333333333', 'bob@apiflow.dev', '$2b$10$rIC/gBxVd1HJoGfY1E3pCOYJhKXIIBYBZCHJhRhQLr3pZVl1bXbDi', 'Bob Engineer', 'developer');

-- Create demo project
INSERT INTO projects (id, name, slug, description, base_url, owner_id, is_public) VALUES
  ('aaaa1111-aaaa-1111-aaaa-111111111111', 'E-Commerce API', 'e-commerce-api', 'Complete REST API for an e-commerce platform', 'https://api.example.com/v1', '11111111-1111-1111-1111-111111111111', true);

-- Add members
INSERT INTO project_members (project_id, user_id, role) VALUES
  ('aaaa1111-aaaa-1111-aaaa-111111111111', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaa1111-aaaa-1111-aaaa-111111111111', '22222222-2222-2222-2222-222222222222', 'editor'),
  ('aaaa1111-aaaa-1111-aaaa-111111111111', '33333333-3333-3333-3333-333333333333', 'viewer');

-- Create API groups
INSERT INTO apis (id, project_id, name, description, tag, sort_order) VALUES
  ('bbbb1111-bbbb-1111-bbbb-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'Users API', 'User management endpoints', 'users', 1),
  ('bbbb2222-bbbb-2222-bbbb-222222222222', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'Products API', 'Product catalog endpoints', 'products', 2),
  ('bbbb3333-bbbb-3333-bbbb-333333333333', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'Orders API', 'Order management endpoints', 'orders', 3);

-- Create endpoints
INSERT INTO endpoints (id, api_id, project_id, path, method, summary, description, request_body, response_schema, headers, query_params, auth_type, status_codes, tags, created_by) VALUES
  ('cccc1111-cccc-1111-cccc-111111111111', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111',
   '/users', 'GET', 'List all users', 'Returns a paginated list of users',
   NULL,
   '{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"email":{"type":"string"}}}}'::jsonb,
   '[{"name":"Authorization","type":"string","required":true}]'::jsonb,
   '[{"name":"page","type":"integer","default":1},{"name":"limit","type":"integer","default":20}]'::jsonb,
   'Bearer', 
   '[{"code":200,"description":"Success"},{"code":401,"description":"Unauthorized"}]'::jsonb,
   ARRAY['users'], '11111111-1111-1111-1111-111111111111'),

  ('cccc2222-cccc-2222-cccc-222222222222', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111',
   '/users', 'POST', 'Create a user', 'Creates a new user account',
   '{"type":"object","required":["name","email","password"],"properties":{"name":{"type":"string"},"email":{"type":"string","format":"email"},"password":{"type":"string","minLength":8}}}'::jsonb,
   '{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"email":{"type":"string"},"created_at":{"type":"string"}}}'::jsonb,
   '[{"name":"Authorization","type":"string","required":true},{"name":"Content-Type","value":"application/json"}]'::jsonb,
   '[]'::jsonb,
   'Bearer',
   '[{"code":201,"description":"Created"},{"code":400,"description":"Bad Request"},{"code":409,"description":"Conflict"}]'::jsonb,
   ARRAY['users'], '11111111-1111-1111-1111-111111111111'),

  ('cccc3333-cccc-3333-cccc-333333333333', 'bbbb2222-bbbb-2222-bbbb-222222222222', 'aaaa1111-aaaa-1111-aaaa-111111111111',
   '/products', 'GET', 'List products', 'Returns a list of products with filtering',
   NULL,
   '{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"price":{"type":"number"},"category":{"type":"string"}}}}'::jsonb,
   '[{"name":"Authorization","type":"string","required":true}]'::jsonb,
   '[{"name":"category","type":"string"},{"name":"min_price","type":"number"},{"name":"max_price","type":"number"}]'::jsonb,
   'Bearer',
   '[{"code":200,"description":"Success"}]'::jsonb,
   ARRAY['products'], '22222222-2222-2222-2222-222222222222'),

  ('cccc4444-cccc-4444-cccc-444444444444', 'bbbb3333-bbbb-3333-bbbb-333333333333', 'aaaa1111-aaaa-1111-aaaa-111111111111',
   '/orders', 'POST', 'Create an order', 'Places a new order',
   '{"type":"object","required":["product_id","quantity"],"properties":{"product_id":{"type":"string"},"quantity":{"type":"integer","minimum":1},"shipping_address":{"type":"string"}}}'::jsonb,
   '{"type":"object","properties":{"id":{"type":"string"},"status":{"type":"string"},"total":{"type":"number"},"created_at":{"type":"string"}}}'::jsonb,
   '[{"name":"Authorization","type":"string","required":true},{"name":"Content-Type","value":"application/json"}]'::jsonb,
   '[]'::jsonb,
   'Bearer',
   '[{"code":201,"description":"Created"},{"code":400,"description":"Bad Request"},{"code":404,"description":"Product Not Found"}]'::jsonb,
   ARRAY['orders'], '11111111-1111-1111-1111-111111111111');

-- Create mock configs
INSERT INTO mock_configs (endpoint_id, status_code, response_body, delay_ms) VALUES
  ('cccc1111-cccc-1111-cccc-111111111111', 200, '[{"id":"usr_1","name":"John Doe","email":"john@example.com"},{"id":"usr_2","name":"Jane Smith","email":"jane@example.com"}]'::jsonb, 100),
  ('cccc2222-cccc-2222-cccc-222222222222', 201, '{"id":"usr_3","name":"New User","email":"new@example.com","created_at":"2024-01-01T00:00:00Z"}'::jsonb, 200),
  ('cccc3333-cccc-3333-cccc-333333333333', 200, '[{"id":"prod_1","name":"Widget","price":29.99,"category":"electronics"},{"id":"prod_2","name":"Gadget","price":49.99,"category":"electronics"}]'::jsonb, 100),
  ('cccc4444-cccc-4444-cccc-444444444444', 201, '{"id":"ord_1","status":"pending","total":79.98,"created_at":"2024-01-01T00:00:00Z"}'::jsonb, 300);

-- Create share link
INSERT INTO share_links (project_id, token, permission, created_by) VALUES
  ('aaaa1111-aaaa-1111-aaaa-111111111111', 'demo-share-token-123', 'read', '11111111-1111-1111-1111-111111111111');

-- Create environment
INSERT INTO environments (project_id, name, variables) VALUES
  ('aaaa1111-aaaa-1111-aaaa-111111111111', 'Development', '{"BASE_URL":"http://localhost:3000/api","API_KEY":"dev-key-123","AUTH_TOKEN":"Bearer dev-token"}'::jsonb),
  ('aaaa1111-aaaa-1111-aaaa-111111111111', 'Production', '{"BASE_URL":"https://api.example.com/v1","API_KEY":"prod-key-456","AUTH_TOKEN":"Bearer prod-token"}'::jsonb);
