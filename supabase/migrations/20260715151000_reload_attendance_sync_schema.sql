-- Force PostgREST to expose the attendance synchronization RPC immediately.
notify pgrst, 'reload schema';
