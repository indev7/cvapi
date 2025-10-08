#!/usr/bin/env node

/**
 * Test Legacy API Compatibility
 */

const fs = require('fs')
const path = require('path')

async function testLegacyAPI() {
  const baseUrl = 'http://localhost:3000'
  const apiKey = '761025-77adoiu-6897987-a6a8wn34-abcd32'
  const jobTitle = 'Software Engineer-Java'
  
  console.log('🧪 Testing Legacy API Compatibility...\n')

  try {
    // Test 1: Basic endpoint response
    console.log('1️⃣ Testing legacy endpoint accessibility...')
    
    const testUrl = `${baseUrl}/api/upload/legacy?api_key=${apiKey}&job_title=${encodeURIComponent(jobTitle)}`
    
    console.log(`📤 POST URL: ${testUrl}`)
    console.log(`🔑 API Key: ${apiKey}`)
    console.log(`💼 Job Title: ${jobTitle}`)
    
    // Test with minimal data (no file)
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: '' // Empty body to test basic functionality
    })
    
    console.log(`📊 Response Status: ${response.status}`)
    
    const data = await response.json()
    console.log('📋 Response Data:')
    console.log(JSON.stringify(data, null, 2))
    
    if (data.status === 'success') {
      console.log('\n✅ Legacy API is working!')
      console.log(`📁 Application ID: ${data.fileId}`)
      console.log(`📂 Job Title: ${data.jobTitle}`)
    } else {
      console.log('\n⚠️ API responded but not successful')
    }
    
    // Test 2: Wrong API key
    console.log('\n2️⃣ Testing wrong API key...')
    const wrongKeyUrl = `${baseUrl}/api/upload/legacy?api_key=wrong-key&job_title=${encodeURIComponent(jobTitle)}`
    const wrongResponse = await fetch(wrongKeyUrl, {
      method: 'POST',
      body: ''
    })
    
    console.log(`📊 Wrong Key Status: ${wrongResponse.status}`)
    if (wrongResponse.status === 401) {
      console.log('✅ API key validation working')
    }
    
    console.log('\n📝 Migration Instructions:')
    console.log('1. Change your client webapp URL to:')
    console.log(`   ${baseUrl}/api/upload/legacy`)
    console.log('2. Keep the same API key')
    console.log('3. No other code changes needed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.log('\n💡 Make sure to run: npm run dev')
  }
}

testLegacyAPI()