import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ypjogxdrcargvufgzchn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwam9neGRyY2FyZ3Z1Zmd6Y2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMDQwNjgsImV4cCI6MjA5NTU4MDA2OH0.1IRvCi-RhmrnpA7homFz4bQ3QxxHB440b80dQVq0skk'
)