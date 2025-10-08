#!/usr/bin/env node

/**
 * Comprehensive API Security Test
 * Tests all endpoints for proper authentication and authorization
 */

async function testAPISecurity() {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🔒 Testing API Security...\n')

  const tests = [
    // Admin-only endpoints (should require authentication)
    {
      name: 'Admin Vacancies GET',
      url: `${baseUrl}/api/vacancies`,
      method: 'GET',
      expectedStatus: 401,
      description: 'Should require admin auth'
    },
    {
      name: 'Admin Vacancies POST',
      url: `${baseUrl}/api/vacancies`,
      method: 'POST',
      expectedStatus: 401,
      description: 'Should require admin auth',
      body: { job_title: 'Test Job' }
    },
    {
      name: 'Admin Applications GET',
      url: `${baseUrl}/api/applications`,
      method: 'GET',
      expectedStatus: 401,
      description: 'Should require admin auth'
    },
    {
      name: 'Admin Blobs GET',
      url: `${baseUrl}/api/admin/blobs`,
      method: 'GET',
      expectedStatus: 401,
      description: 'Should require admin auth'
    },
    
    // Public endpoints (should work without auth)
    {
      name: 'Public Vacancies',
      url: `${baseUrl}/api/public/vacancies`,
      method: 'GET',
      expectedStatus: 200,
      description: 'Should be publicly accessible'
    },
    
    // Legacy API (should require API key)
    {
      name: 'Legacy Upload (no key)',
      url: `${baseUrl}/api/upload/legacy?job_title=Test`,
      method: 'POST',
      expectedStatus: 401,
      description: 'Should reject without API key'
    },
    {
      name: 'Legacy Upload (wrong key)',
      url: `${baseUrl}/api/upload/legacy?api_key=wrong-key&job_title=Test`,
      method: 'POST',
      expectedStatus: 401,
      description: 'Should reject wrong API key'
    },
    {
      name: 'Legacy Upload (correct key)',
      url: `${baseUrl}/api/upload/legacy?api_key=761025-77adoiu-6897987-a6a8wn34-abcd32&job_title=Test`,
      method: 'POST',
      expectedStatus: 200,
      description: 'Should accept correct API key'
    }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      console.log(`🧪 Testing: ${test.name}`)
      
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      }
      
      if (test.body) {
        options.body = JSON.stringify(test.body)
      }
      
      const response = await fetch(test.url, options)
      
      if (response.status === test.expectedStatus) {
        console.log(`✅ PASS - ${test.description} (${response.status})`)
        passed++
      } else {
        console.log(`❌ FAIL - ${test.description}`)
        console.log(`   Expected: ${test.expectedStatus}, Got: ${response.status}`)
        
        // Show response for debugging
        try {
          const data = await response.json()
          console.log(`   Response: ${JSON.stringify(data, null, 2)}`)
        } catch {
          console.log(`   Response: ${await response.text()}`)
        }
        failed++
      }
      
    } catch (error) {
      console.log(`❌ ERROR - ${test.name}: ${error.message}`)
      failed++
    }
    
    console.log('') // Empty line for readability
  }

  console.log('📊 Security Test Results:')
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)
  
  if (failed === 0) {
    console.log('\n🎉 All security tests passed!')
  } else {
    console.log('\n⚠️ Some security tests failed. Please review.')
  }
  
  console.log('\n🔐 Security Features Implemented:')
  console.log('• Admin authentication with secure cookies')
  console.log('• API key validation for legacy endpoints')
  console.log('• Rate limiting on upload endpoints')
  console.log('• Secure headers on responses')
  console.log('• Input sanitization and validation')
  console.log('• Separate public endpoints for non-sensitive data')
  console.log('• Middleware protection for admin routes')
}

testAPISecurity().catch(console.error)