#!/usr/bin/env node

// Check existing orgs and tenants in the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function checkDatabase() {
  console.log('🔍 Checking existing data in database...\n');
  
  try {
    // Check orgs
    const { data: orgs, error: orgsError } = await supabase
      .from('orgs')
      .select('id, name')
      .limit(5);
    
    if (orgsError) throw orgsError;
    
    console.log('📊 Organizations:');
    orgs.forEach(org => console.log(`  - ${org.id} (${org.name})`));
    
    // Check tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name')
      .limit(5);
    
    if (tenantsError) throw tenantsError;
    
    console.log('\n🏢 Tenants:');
    tenants.forEach(tenant => console.log(`  - ${tenant.id} (${tenant.name})`));
    
    // Check if there are any existing leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, email, org_id, tenant_id')
      .limit(3);
    
    if (leadsError) throw leadsError;
    
    console.log('\n👥 Sample Leads:');
    leads.forEach(lead => console.log(`  - ${lead.id} (${lead.name}) - ${lead.email}`));
    
    // Suggest test values
    if (orgs.length > 0 && tenants.length > 0) {
      console.log('\n💡 Suggested test values:');
      console.log(`  org_id: "${orgs[0].id}"`);
      console.log(`  tenant_id: "${tenants[0].id}"`);
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkDatabase();