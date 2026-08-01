// Cliente de Supabase compartido por los modelos (RNF-09)
'use strict';

const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('./env');

// Se usa la service role key porque el backend es quien autoriza (RF-17) y
// necesita saltar RLS. Este modulo nunca debe importarse desde public/.
const cliente = createClient(supabase.url, supabase.serviceRoleKey, {
  auth: {
    // El servidor no mantiene sesiones de Supabase Auth: la sesion es nuestro JWT.
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = cliente;
