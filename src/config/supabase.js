'use strict';

const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('./env');

const cliente = createClient(supabase.url, supabase.serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = cliente;
