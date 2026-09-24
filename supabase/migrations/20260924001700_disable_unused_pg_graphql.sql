-- The Inglês Hope application uses Supabase PostgREST via supabase-js and has no GraphQL client.
-- Disable the optional pg_graphql extension to remove an unused public API surface.
DROP EXTENSION IF EXISTS pg_graphql;
