/**
 * Test InsForge database connection
 * Run this in browser console to verify connection
 */
import { insforge } from './insforge';

export async function testConnection() {
  console.log('🧪 Testing InsForge Connection...');
  console.log('Base URL:', import.meta.env.VITE_INSFORGE_BASE_URL);
  console.log('Has Anon Key:', !!import.meta.env.VITE_INSFORGE_ANON_KEY);
  
  try {
    // Test 1: Check if we can query users table
    console.log('\n📊 Test 1: Querying users table...');
    const { data: users, error: usersError } = await insforge.database
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users query failed:', usersError);
    } else {
      console.log('✅ Users query successful:', users);
    }
    
    // Test 2: Check if we can query programs table
    console.log('\n📊 Test 2: Querying programs table...');
    const { data: programs, error: programsError } = await insforge.database
      .from('programs')
      .select('*')
      .limit(3);
    
    if (programsError) {
      console.error('❌ Programs query failed:', programsError);
    } else {
      console.log('✅ Programs query successful:', programs);
    }
    
    // Test 3: Check if we can query content_sections
    console.log('\n📊 Test 3: Querying content_sections table...');
    const { data: content, error: contentError } = await insforge.database
      .from('content_sections')
      .select('*');
    
    if (contentError) {
      console.error('❌ Content sections query failed:', contentError);
    } else {
      console.log('✅ Content sections query successful:', content);
    }
    
    // Test 4: Check if we can query strategic_objectives
    console.log('\n📊 Test 4: Querying strategic_objectives table...');
    const { data: objectives, error: objectivesError } = await insforge.database
      .from('strategic_objectives')
      .select('*');
    
    if (objectivesError) {
      console.error('❌ Strategic objectives query failed:', objectivesError);
    } else {
      console.log('✅ Strategic objectives query successful:', objectives);
    }
    
    console.log('\n✅ Connection test complete!');
    return { success: true };
  } catch (err: any) {
    console.error('❌ Connection test failed:', err);
    return { success: false, error: err.message };
  }
}

// Make it available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).testInsForgeConnection = testConnection;
}

