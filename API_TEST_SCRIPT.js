// API Test Script - Run this in browser console to test backend APIs
// Copy and paste this entire script into your browser console

console.log('🧪 Starting API Tests...');

const API_BASE = 'https://kcmi-library-system.vercel.app';

// Test 1: Basic connectivity
async function testBasicConnectivity() {
  console.log('\n🔍 Test 1: Basic Connectivity');
  try {
    const response = await fetch(`${API_BASE}/api/books?limit=1`);
    console.log('✅ Status:', response.status);
    console.log('✅ Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('✅ Response (first 500 chars):', text.substring(0, 500));
    
    if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
      console.log('❌ PROBLEM: Server returned HTML instead of JSON');
      console.log('❌ This usually means CORS issue or endpoint doesn\'t exist');
      return false;
    }
    
    try {
      const data = JSON.parse(text);
      console.log('✅ JSON parsed successfully:', data);
      return true;
    } catch (parseError) {
      console.log('❌ JSON Parse Error:', parseError);
      console.log('❌ Raw response:', text);
      return false;
    }
  } catch (error) {
    console.log('❌ Fetch Error:', error.message);
    return false;
  }
}

// Test 2: Books API with availability parameter
async function testBooksAPI() {
  console.log('\n🔍 Test 2: Books API with availability parameter');
  try {
    const response = await fetch(`${API_BASE}/api/books?availability=available&limit=5`);
    console.log('✅ Status:', response.status);
    
    const text = await response.text();
    console.log('✅ Response (first 500 chars):', text.substring(0, 500));
    
    if (text.trim().startsWith('<!DOCTYPE html>')) {
      console.log('❌ PROBLEM: Server returned HTML instead of JSON');
      return false;
    }
    
    const data = JSON.parse(text);
    console.log('✅ Books API Response:', data);
    
    if (data.success && data.data && data.data.books) {
      console.log(`✅ Found ${data.data.books.length} books`);
      if (data.data.books.length > 0) {
        console.log('✅ Sample book:', data.data.books[0]);
      }
      return true;
    } else {
      console.log('❌ Unexpected response structure:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Books API Error:', error.message);
    return false;
  }
}

// Test 3: Book copies API
async function testBookCopiesAPI() {
  console.log('\n🔍 Test 3: Book copies API');
  try {
    // First get a book ID
    const booksResponse = await fetch(`${API_BASE}/api/books?limit=1`);
    const booksData = await booksResponse.json();
    
    if (!booksData.success || !booksData.data || !booksData.data.books || booksData.data.books.length === 0) {
      console.log('❌ No books available to test copies API');
      return false;
    }
    
    const bookId = booksData.data.books[0].id;
    console.log('✅ Testing with book ID:', bookId);
    
    const response = await fetch(`${API_BASE}/api/books/${bookId}/copies`);
    console.log('✅ Status:', response.status);
    
    const text = await response.text();
    console.log('✅ Response (first 500 chars):', text.substring(0, 500));
    
    if (text.trim().startsWith('<!DOCTYPE html>')) {
      console.log('❌ PROBLEM: Server returned HTML instead of JSON');
      return false;
    }
    
    const data = JSON.parse(text);
    console.log('✅ Book copies API Response:', data);
    
    if (data.success && data.data && data.data.copies) {
      console.log(`✅ Found ${data.data.copies.length} copies`);
      if (data.data.copies.length > 0) {
        console.log('✅ Sample copy:', data.data.copies[0]);
      }
      return true;
    } else {
      console.log('❌ Unexpected response structure:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Book copies API Error:', error.message);
    return false;
  }
}

// Test 4: Search API
async function testSearchAPI() {
  console.log('\n🔍 Test 4: Search API');
  try {
    const response = await fetch(`${API_BASE}/api/books/search?q=math&limit=5`);
    console.log('✅ Status:', response.status);
    
    const text = await response.text();
    console.log('✅ Response (first 500 chars):', text.substring(0, 500));
    
    if (text.trim().startsWith('<!DOCTYPE html>')) {
      console.log('❌ PROBLEM: Server returned HTML instead of JSON');
      return false;
    }
    
    const data = JSON.parse(text);
    console.log('✅ Search API Response:', data);
    
    if (data.success && data.data && data.data.books) {
      console.log(`✅ Found ${data.data.books.length} books for search "math"`);
      return true;
    } else {
      console.log('❌ Unexpected response structure:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Search API Error:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running all API tests...\n');
  
  const results = {
    connectivity: await testBasicConnectivity(),
    booksAPI: await testBooksAPI(),
    copiesAPI: await testBookCopiesAPI(),
    searchAPI: await testSearchAPI()
  };
  
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('========================');
  console.log('Basic Connectivity:', results.connectivity ? '✅ PASS' : '❌ FAIL');
  console.log('Books API:', results.booksAPI ? '✅ PASS' : '❌ FAIL');
  console.log('Book Copies API:', results.copiesAPI ? '✅ PASS' : '❌ FAIL');
  console.log('Search API:', results.searchAPI ? '✅ PASS' : '❌ FAIL');
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Backend APIs are working correctly.');
    console.log('💡 The issue is likely in the mobile app implementation.');
  } else {
    console.log('⚠️ Some tests failed. Backend needs fixes.');
    console.log('💡 Check the specific error messages above for details.');
  }
  
  return results;
}

// Auto-run tests
runAllTests();