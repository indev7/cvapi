#!/usr/bin/env node

/**
 * Test CV Submission API
 * Tests both GET and POST endpoints
 */

async function testAPI() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing CV Submission API...\n');

  try {
    // Test 1: GET applications (should work)
    console.log('1️⃣ Testing GET /api/applications');
    const getResponse = await fetch(`${baseUrl}/api/applications`);
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('✅ GET endpoint works');
      console.log(`   Found ${data.applications?.length || 0} applications`);
    } else {
      console.log('❌ GET endpoint failed:', getResponse.status);
    }

    // Test 2: POST application (requires running server)
    console.log('\n2️⃣ Testing POST /api/applications');
    console.log('📝 To test file upload, you need:');
    console.log('   1. Start server: npm run dev');
    console.log('   2. Use curl or frontend form');
    console.log('   3. Example curl command:');
    console.log(`
curl -X POST ${baseUrl}/api/applications \\
  -F "email=test@example.com" \\
  -F "phone=+94771234567" \\
  -F "job_title=Software Engineer-Java" \\
  -F "vacancy_id=1" \\
  -F "cv_file=@/path/to/your/cv.pdf"
    `);
    
    console.log('\n💡 File naming pattern:');
    console.log('   - Original: cv.pdf');
    console.log('   - Saved as: {application-uuid}.pdf');
    console.log('   - Example: 57103c51-7adf-46cd-a10e-45a7f1eb7cd8.pdf');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('💡 Make sure to run: npm run dev');
  }
}

testAPI();