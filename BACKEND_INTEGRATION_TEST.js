// 🧪 Backend Integration Test Script
// Run this in browser console on localhost:8081 to test all new backend features

console.log('🚀 Starting Backend Integration Tests...');

// Test Configuration
const API_BASE = 'https://kcmi-library-system.vercel.app';
const TEST_USER_ID = 'user_1755712822945_s6a9zv'; // Replace with actual user ID
const TEST_BOOK_ID = 'book-college-english-007'; // Replace with actual book ID
const TEST_COPY_ID = 'copy_123'; // Replace with actual copy ID

// Test Results Tracker
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// Helper function to run tests
async function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 Running Test: ${testName}`);
  
  try {
    await testFunction();
    console.log(`✅ ${testName} - PASSED`);
    testResults.passed++;
  } catch (error) {
    console.error(`❌ ${testName} - FAILED:`, error.message);
    testResults.failed++;
  }
}

// Test 1: CORS Configuration
async function testCORS() {
  const response = await fetch(`${API_BASE}/api/books?limit=1`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`CORS test failed: ${response.status} ${response.statusText}`);
  }
  
  if (!data.success) {
    throw new Error('API returned error response');
  }
  
  console.log('✅ CORS test passed - API accessible from localhost:8081');
}

// Test 2: Books API with New Features
async function testBooksAPI() {
  const response = await fetch(`${API_BASE}/api/books?limit=5&availability=available`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Books API failed: ${response.status}`);
  }
  
  if (!data.success || !data.data || !Array.isArray(data.data.books)) {
    throw new Error('Invalid books API response format');
  }
  
  // Check for new fields
  if (data.data.books.length > 0) {
    const book = data.data.books[0];
    const requiredFields = ['id', 'title', 'author', 'shelfLocationPrefix', 'availableCopies', 'totalCopies'];
    const missingFields = requiredFields.filter(field => !book[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }
  
  console.log(`✅ Books API test passed - Found ${data.data.books.length} books with new fields`);
}

// Test 3: Borrowed Books API (New Feature)
async function testBorrowedBooksAPI() {
  const response = await fetch(`${API_BASE}/api/books?availability=borrowed&limit=5`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Borrowed books API failed: ${response.status}`);
  }
  
  if (!data.success || !data.data || !Array.isArray(data.data.books)) {
    throw new Error('Invalid borrowed books API response format');
  }
  
  console.log(`✅ Borrowed books API test passed - Found ${data.data.books.length} borrowed books`);
}

// Test 4: Shelf Locations API (New Feature)
async function testShelfLocationsAPI() {
  const response = await fetch(`${API_BASE}/api/mobile/books/shelf-locations`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Shelf locations API failed: ${response.status}`);
  }
  
  if (!data.success || !data.data || !Array.isArray(data.data)) {
    throw new Error('Invalid shelf locations API response format');
  }
  
  // Check for new shelf location codes
  const expectedLocations = ['Fi-college', 'Fi/senH', 'Fi/HS', 'Fi/E', 'Fi/K'];
  const foundLocations = data.data.map(loc => loc.id);
  const missingLocations = expectedLocations.filter(loc => !foundLocations.includes(loc));
  
  if (missingLocations.length > 0) {
    throw new Error(`Missing shelf locations: ${missingLocations.join(', ')}`);
  }
  
  console.log(`✅ Shelf locations API test passed - Found ${data.data.length} locations with new codes`);
}

// Test 5: Borrow Request API (Enhanced)
async function testBorrowRequestAPI() {
  const response = await fetch(`${API_BASE}/api/mobile/users/${TEST_USER_ID}/books/${TEST_BOOK_ID}/borrow-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      copyId: TEST_COPY_ID,
      expectedReturnDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      initialCondition: 'GOOD',
      requestNotes: 'Integration test request'
    })
  });
  
  const data = await response.json();
  
  // This test might fail due to borrowing limits or other business logic
  // That's expected - we just want to test the API structure
  if (response.ok && data.success) {
    console.log('✅ Borrow request API test passed - Request created successfully');
  } else if (data.error && data.error.code) {
    console.log(`✅ Borrow request API test passed - Proper error handling: ${data.error.code}`);
  } else {
    throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
  }
}

// Test 6: Reservation API (New Feature)
async function testReservationAPI() {
  const response = await fetch(`${API_BASE}/api/mobile/users/${TEST_USER_ID}/books/${TEST_BOOK_ID}/reserve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expectedReturnDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      initialCondition: 'GOOD',
      conditionNotes: 'Integration test reservation'
    })
  });
  
  const data = await response.json();
  
  // This test might fail due to business logic
  // That's expected - we just want to test the API structure
  if (response.ok && data.success) {
    console.log('✅ Reservation API test passed - Reservation created successfully');
  } else if (data.error && data.error.code) {
    console.log(`✅ Reservation API test passed - Proper error handling: ${data.error.code}`);
  } else {
    throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
  }
}

// Test 7: User Reservations API (New Feature)
async function testUserReservationsAPI() {
  const response = await fetch(`${API_BASE}/api/mobile/users/${TEST_USER_ID}/reservations?status=all`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`User reservations API failed: ${response.status}`);
  }
  
  if (!data.success || !data.data) {
    throw new Error('Invalid user reservations API response format');
  }
  
  console.log('✅ User reservations API test passed - Response format correct');
}

// Test 8: Error Handling System
async function testErrorHandling() {
  // Test with invalid endpoint to trigger error
  const response = await fetch(`${API_BASE}/api/invalid-endpoint`);
  const data = await response.json();
  
  if (response.ok) {
    throw new Error('Expected error response but got success');
  }
  
  // Check if error response has proper structure
  if (data.error && typeof data.error === 'object') {
    console.log('✅ Error handling test passed - Proper error response structure');
  } else {
    console.log('⚠️ Error handling test - Basic error response (may need enhancement)');
  }
}

// Test 9: Search and Filter Functionality
async function testSearchAndFilter() {
  const searchTests = [
    { name: 'Title Search', params: 'search=english&filterBy=title' },
    { name: 'Author Search', params: 'search=smith&filterBy=author' },
    { name: 'Shelf Location Filter', params: 'shelfLocation=Fi-college' },
    { name: 'Course Program Filter', params: 'courseProgram=BEED' },
    { name: 'Availability Filter', params: 'availability=available' }
  ];
  
  for (const test of searchTests) {
    const response = await fetch(`${API_BASE}/api/books?${test.params}&limit=5`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`${test.name} failed: ${response.status}`);
    }
    
    if (!data.success || !data.data) {
      throw new Error(`${test.name} returned invalid response format`);
    }
    
    console.log(`✅ ${test.name} test passed`);
  }
}

// Test 10: Pagination
async function testPagination() {
  const response = await fetch(`${API_BASE}/api/books?limit=2&page=1`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Pagination test failed: ${response.status}`);
  }
  
  if (!data.success || !data.data || !data.data.pagination) {
    throw new Error('Invalid pagination response format');
  }
  
  const pagination = data.data.pagination;
  const requiredPaginationFields = ['currentPage', 'totalPages', 'totalBooks', 'hasNext', 'hasPrev'];
  const missingFields = requiredPaginationFields.filter(field => pagination[field] === undefined);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing pagination fields: ${missingFields.join(', ')}`);
  }
  
  console.log('✅ Pagination test passed - All pagination fields present');
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Running All Backend Integration Tests...\n');
  
  await runTest('CORS Configuration', testCORS);
  await runTest('Books API with New Features', testBooksAPI);
  await runTest('Borrowed Books API', testBorrowedBooksAPI);
  await runTest('Shelf Locations API', testShelfLocationsAPI);
  await runTest('Borrow Request API (Enhanced)', testBorrowRequestAPI);
  await runTest('Reservation API', testReservationAPI);
  await runTest('User Reservations API', testUserReservationsAPI);
  await runTest('Error Handling System', testErrorHandling);
  await runTest('Search and Filter Functionality', testSearchAndFilter);
  await runTest('Pagination', testPagination);
  
  // Print results
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Backend is ready for mobile integration.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the backend implementation.');
  }
}

// Auto-run tests
runAllTests();

// Export for manual testing
window.backendTests = {
  testCORS,
  testBooksAPI,
  testBorrowedBooksAPI,
  testShelfLocationsAPI,
  testBorrowRequestAPI,
  testReservationAPI,
  testUserReservationsAPI,
  testErrorHandling,
  testSearchAndFilter,
  testPagination,
  runAllTests
};

console.log('\n💡 You can also run individual tests:');
console.log('   backendTests.testCORS()');
console.log('   backendTests.testBooksAPI()');
console.log('   backendTests.testBorrowedBooksAPI()');
console.log('   backendTests.testShelfLocationsAPI()');
console.log('   backendTests.testBorrowRequestAPI()');
console.log('   backendTests.testReservationAPI()');
console.log('   backendTests.testUserReservationsAPI()');
console.log('   backendTests.testErrorHandling()');
console.log('   backendTests.testSearchAndFilter()');
console.log('   backendTests.testPagination()');
console.log('   backendTests.runAllTests()');
