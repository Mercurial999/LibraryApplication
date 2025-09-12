import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleBackendError } from '../utils/ErrorHandler';

export default class ApiService {
  static API_BASE = "https://kcmi-library-system.vercel.app";
  
  // Authentication token storage
  static authToken = null;
  
  // Cache for catalog data
  static catalogCache = null;
  static catalogCacheTime = null;
  static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Clear catalog cache
  static clearCatalogCache() {
    this.catalogCache = null;
    this.catalogCacheTime = null;
    console.log('Catalog cache cleared');
  }
  
  // Set authentication token
  static setAuthToken(token) {
    this.authToken = token;
  }
  
  // Load authentication token from AsyncStorage
  static async loadAuthToken() {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        this.authToken = token;
        console.log('Loaded auth token from storage');
      }
      return token;
    } catch (err) {
      console.error('Error loading auth token:', err);
      return null;
    }
  }
  
  // Get authentication headers
  static async getAuthHeaders() {
    // Try to load token from storage if not in memory
    if (!this.authToken) {
      await this.loadAuthToken();
    }
    
    const headers = { 'Content-Type': 'application/json' };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
      console.log('Adding auth token to headers:', this.authToken.substring(0, 20) + '...');
    } else {
      console.log('No auth token available');
    }
    return headers;
  }

  // Check if we have a valid token
  static hasValidToken() {
    return !!this.authToken;
  }

  // Get current user ID from stored user data
  static async getCurrentUserId() {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        return userData.id;
      }
      return null;
    } catch (err) {
      console.error('Error getting current user ID:', err);
      return null;
    }
  }

  // Get user's overdue transactions and fines
  static async getOverdueTransactions() {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${this.API_BASE}/api/mobile/users/${userId}/overdue-transactions`,
        {
          headers: await this.getAuthHeaders(),
        }
      );

      return await this.handleApiResponse(response, 'overdue-transactions');
    } catch (err) {
      console.error('❌ Error fetching overdue transactions:', err);
      throw err;
    }
  }

  // Get user's fines (overdue and other charges)
  static async getFines() {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${this.API_BASE}/api/mobile/users/${userId}/fines`,
        {
          headers: await this.getAuthHeaders(),
        }
      );

      return await this.handleApiResponse(response, 'fines');
    } catch (err) {
      console.error('❌ Error fetching fines:', err);
      throw err;
    }
  }

  // Get overdue notification status for a transaction
  static async getOverdueNotificationStatus(transactionId) {
    try {
      const response = await fetch(
        `${this.API_BASE}/api/overdue-transactions/${transactionId}/notification-status`,
        {
          headers: await this.getAuthHeaders(),
        }
      );

      return await this.handleApiResponse(response, 'overdue-notification-status');
    } catch (err) {
      console.error('❌ Error checking overdue notification status:', err);
      throw err;
    }
  }

  // Send overdue notification (for librarians)
  static async sendOverdueNotification(transactionId) {
    try {
      const response = await fetch(
        `${this.API_BASE}/api/overdue-transactions/${transactionId}/notify`,
        {
          method: 'POST',
          headers: await this.getAuthHeaders(),
        }
      );

      return await this.handleApiResponse(response, 'send-overdue-notification');
    } catch (err) {
      console.error('❌ Error sending overdue notification:', err);
      throw err;
    }
  }

  // Helper method to handle API responses and CORS issues
  static async handleApiResponse(res, endpoint) {
    const text = await res.text().catch(() => '');
    
    console.log(`🔍 API Response Debug for ${endpoint}:`);
    console.log(`Status: ${res.status}`);
    console.log(`Headers:`, res.headers);
    console.log(`Response text (first 200 chars):`, text.substring(0, 200));
    
    // Check if response is HTML (usually means CORS error or server error)
    if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
      console.error(`❌ Server returned HTML instead of JSON for ${endpoint}`);
      const err = new Error(`Server returned HTML instead of JSON. This usually means a CORS issue or the endpoint doesn't exist. Endpoint: ${endpoint}`);
      err.errorCode = 'HTML_RESPONSE';
      throw err;
    }
    
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error(`❌ JSON Parse Error for ${endpoint}:`, parseError);
      console.error(`Raw response:`, text);
      data = { message: text || 'Invalid response format' };
    }

    if (!res.ok) {
      console.error(`❌ API Error for ${endpoint}:`, data);
      
      // Handle backend error response format
      if (data.error && typeof data.error === 'object') {
        const enhancedError = handleBackendError(data);
        throw enhancedError;
      }
      
      // Handle different error formats
      let errMsg;
      let errCode;
      if (typeof data === 'string') {
        errMsg = data;
      } else if (data.message) {
        errMsg = data.message;
      } else if (data.error) {
        errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      } else {
        errMsg = `Request failed with status ${res.status}`;
      }
      const err = new Error(errMsg);
      if (errCode) err.errorCode = errCode;
      throw err;
    }

    console.log(`✅ API Success for ${endpoint}:`, data);
    return data;
  }

  // Helper method to make API calls with CORS handling
  static async makeApiCall(url, options = {}) {
    try {
      console.log(`🌐 Making API call to: ${url}`);
      console.log(`📋 Options:`, options);
      
      const headers = await this.getAuthHeaders();
      console.log(`🔑 Auth headers:`, headers);
      
      // Use standard CORS mode - the backend is already configured correctly
      console.log(`🔄 Using CORS mode: cors`);
      const res = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        },
        mode: 'cors', // Use standard CORS mode only
        credentials: 'omit'
      });
      
      console.log(`📡 Fetch response received for ${url}`);
      return await this.handleApiResponse(res, url);
    } catch (err) {
      console.error(`❌ Fetch error for ${url}:`, err);
      // Handle network errors and CORS issues
      if (err.message.includes('CORS') || err.message.includes('HTML') || err.message.includes('Failed to fetch')) {
        throw new Error(`CORS/Network issue: ${err.message}. The backend may not be configured to allow requests from this origin.`);
      }
      throw err;
    }
  }

  // Helper method to make multipart/form-data calls (do not set Content-Type)
  static async makeMultipartCall(url, formData, method = 'POST') {
    try {
      // Build auth headers but do NOT include Content-Type so RN sets boundary
      const authHeaders = await this.getAuthHeaders();
      const { ['Content-Type']: _omit, ...headers } = authHeaders;
      const res = await fetch(url, {
        method,
        headers,
        body: formData,
        mode: 'cors',
        credentials: 'omit'
      });
      return await this.handleApiResponse(res, url);
    } catch (err) {
      if (err.message.includes('CORS') || err.message.includes('HTML')) {
        throw new Error(`Backend connection issue: ${err.message}. Please check if the backend is running and CORS is properly configured.`);
      }
      throw err;
    }
  }

  /**
   * Register a borrower on the backend.
   * borrower: { fullName, email, role, gradeLevel, academicLevel, password }
   */
  static async registerBorrower(borrower) {
    const url = `${this.API_BASE}/api/users`; // backend expects base origin + /api/users
    try {
      // Always send JSON + base64 (works for both web and device with current backend)
      const upperRole = String(borrower.role || '').toUpperCase();
      const upperAcademic = borrower.academicLevel
        ? String(borrower.academicLevel).toUpperCase()
        : null;

      const payload = {
        firstName: borrower.firstName,
        middleInitial: borrower.middleInitial,
        lastName: borrower.lastName,
        email: borrower.email,
        role: upperRole,
        academicLevelType: upperAcademic,
        gradeLevel: borrower.gradeLevel || null,
        department: borrower.department || null,
        password: borrower.password || null,
        // Prefer Cloudinary public_id or HTTPS URL when provided by frontend
        studentPhoto: borrower.studentPhoto || null,
        idPhoto: borrower.idPhoto || null,
        status: 'PENDING',
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => '');
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        const errMsg = data.message || data.error || `Request failed with status ${res.status}`;
        throw new Error(errMsg);
      }
      return data;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Upload an image via backend helper: POST /api/upload (multipart/form-data)
   * form fields: file (blob), type (studentPhoto|idPhoto), userId (optional during registration)
   * Returns: { success, data: { url, publicId } }
   */
  static async uploadImage(fileObject, type = 'studentPhoto', userId = null) {
    const url = `${this.API_BASE}/api/upload`;
    const formData = new FormData();
    // React Native File shape
    const file = {
      uri: fileObject.uri,
      name: fileObject.name || `upload_${Date.now()}.jpg`,
      type: fileObject.type || 'image/jpeg'
    };
    formData.append('file', file);
    formData.append('type', type);
    if (userId) formData.append('userId', String(userId));

    return await this.makeMultipartCall(url, formData, 'POST');
  }

  static async approveUser(userId, method = 'POST') {
    const url = `${this.API_BASE}/api/users/${encodeURIComponent(userId)}/approve`;
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const text = await res.text().catch(() => '');
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
    if (!res.ok) {
      const errMsg = data.message || data.error || text || `Request failed with status ${res.status}`;
      throw new Error(errMsg);
    }
    return data;
  }

  static async rejectUser(userId, reason = '', method = 'POST') {
    const url = `${this.API_BASE}/api/users/${encodeURIComponent(userId)}/reject`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const text = await res.text().catch(() => '');
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
    if (!res.ok) {
      const errMsg = data.message || data.error || text || `Request failed with status ${res.status}`;
      throw new Error(errMsg);
    }
    return data;
  }

  /**
   * Test if the backend is reachable
   */
  static async testBackendConnectivity() {
    try {
      console.log('Testing backend connectivity...');
      const response = await fetch(`${this.API_BASE}/api/auth/login`, {
        method: 'OPTIONS',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
      });
      console.log('Backend connectivity test result:', response.status);
      return response.status < 500; // Consider it reachable if not a server error
    } catch (err) {
      console.error('Backend connectivity test failed:', err.message);
      return false;
    }
  }

  /**
   * Test if the book catalog endpoint is working
   */
  static async testBookCatalog() {
    try {
      console.log('Testing book catalog endpoint...');
      const response = await this.getBooks({ limit: 100 }); // Get all books for testing
      console.log('Book catalog test successful:', response);
      return true;
    } catch (err) {
      console.error('Book catalog test failed:', err);
      return false;
    }
  }

  // ===== NEW MOBILE-SPECIFIC API METHODS =====

  // Get book details with copy information
  static async getBookDetails(bookId) {
    try {
      const response = await fetch(`${this.API_BASE}/api/mobile/books/${bookId}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      return await this.handleApiResponse(response, `/api/mobile/books/${bookId}`);
    } catch (error) {
      console.error('Error fetching book details:', error);
      throw error;
    }
  }

  // Get user's books with copy information
  static async getUserBooks(userId = null, status = 'all', includeHistory = false) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User ID is required');
      }

      const params = new URLSearchParams();
      if (status && status !== 'all') {
        params.append('status', status);
      }
      if (includeHistory) {
        params.append('includeHistory', 'true');
      }

      const response = await fetch(`${this.API_BASE}/api/mobile/users/${currentUserId}/books?${params}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      return await this.handleApiResponse(response, `/api/mobile/users/${currentUserId}/books`);
    } catch (error) {
      console.error('Error fetching user books:', error);
      throw error;
    }
  }

  // Get user profile with QR code
  static async getUserProfile(userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User ID is required');
      }

      const response = await fetch(`${this.API_BASE}/api/mobile/users/${currentUserId}/profile`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      return await this.handleApiResponse(response, `/api/mobile/users/${currentUserId}/profile`);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Get dashboard statistics
  static async getDashboardStats(userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User ID is required');
      }

      const response = await fetch(`${this.API_BASE}/api/mobile/users/${currentUserId}/dashboard-stats`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      return await this.handleApiResponse(response, `/api/mobile/users/${currentUserId}/dashboard-stats`);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // Get recent activity
  static async getRecentActivity(userId = null, limit = 10) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User ID is required');
      }

      const params = new URLSearchParams();
      params.append('limit', limit.toString());

      const response = await fetch(`${this.API_BASE}/api/mobile/users/${currentUserId}/recent-activity?${params}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      return await this.handleApiResponse(response, `/api/mobile/users/${currentUserId}/recent-activity`);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  }

  // Get user reservations
  static async getUserReservations(userId = null, status = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User ID is required');
      }

      const params = new URLSearchParams();
      if (status) {
        params.append('status', status);
      }

      const response = await fetch(`${this.API_BASE}/api/mobile/users/${currentUserId}/reservations?${params}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      return await this.handleApiResponse(response, `/api/mobile/users/${currentUserId}/reservations`);
    } catch (error) {
      console.error('Error fetching user reservations:', error);
      throw error;
    }
  }

  // ===== BOOK CATALOG API METHODS =====

  /**
   * Get all books with pagination and filtering
   */
  static async getBooks(params = {}) {
    const forceRefresh = params.forceRefresh || false;
    
    // Check if we have valid cached data (unless force refresh is requested)
    const now = Date.now();
    if (!forceRefresh && this.catalogCache && this.catalogCacheTime && (now - this.catalogCacheTime) < this.CACHE_DURATION) {
      console.log('Using cached catalog data');
      return this.catalogCache;
    }

    if (forceRefresh) {
      console.log('Force refresh requested - bypassing cache');
    }

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.filterBy) queryParams.append('filterBy', params.filterBy);
    if (params.availability) queryParams.append('availability', params.availability);
    if (params.status) queryParams.append('status', params.status);
    if (params.condition) queryParams.append('condition', params.condition);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `${this.API_BASE}/api/books?${queryParams.toString()}`;
    
    try {
      console.log('🔍 Fetching books from:', url);
      console.log('📋 Query params:', queryParams.toString());
      
      const response = await this.makeApiCall(url, {
        method: 'GET'
      });
      
      console.log('✅ API Response received:', response);
      
      // Cache the response if it's successful
      if (response.success) {
        // Log basic info for monitoring
        if (response.data && response.data.books) {
          console.log(`📚 Fetched ${response.data.books.length} books from backend`);
        }
        
        this.catalogCache = response;
        this.catalogCacheTime = now;
      }
      
      return response;
    } catch (err) {
      console.error('❌ Books API failed:', err.message);
      console.error('❌ Full error:', err);
      
      // Check if it's a CORS error
      if (err.message.includes('CORS') || err.message.includes('Failed to fetch')) {
        console.log('🚨 CORS ERROR DETECTED!');
        console.log('📋 Backend team needs to configure CORS to allow localhost:8081');
        console.log('📄 See BACKEND_REQUIREMENTS.md for details');
        console.log('🧪 Use API_TEST_SCRIPT.js to test fixes');
        
        return {
        success: true,
        data: {
            books: [],
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalBooks: 0,
              hasNext: false,
              hasPrev: false
            }
          },
          error: {
            type: 'CORS_ERROR',
            message: 'Backend CORS configuration needed. See BACKEND_REQUIREMENTS.md'
          }
        };
      }
      
      // Check if it's a network error
      if (err.message.includes('Network')) {
        console.log('🌐 Network error detected, returning empty results');
        return {
          success: true,
          data: {
            books: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
              totalBooks: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      };
      }
      
      // For other errors, still return empty results but log the error
      console.log('⚠️ API error, returning empty results:', err.message);
      return {
        success: true,
        data: {
          books: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalBooks: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      };
    }
  }

  /**
   * Get a specific book by ID
   */
  static async getBookById(bookId) {
    console.log('=== getBookById Debug ===');
    console.log('Looking for book ID:', bookId);
    console.log('Catalog cache exists:', !!this.catalogCache);
    console.log('Catalog cache time:', this.catalogCacheTime);
    
    // First, try to get the book from cached catalog data
    try {
      console.log('Trying to get book from cached catalog data...');
      if (this.catalogCache && this.catalogCache.data && this.catalogCache.data.books) {
        console.log('Available books in cache:', this.catalogCache.data.books.map(b => ({ id: b.id, title: b.title })));
        const book = this.catalogCache.data.books.find(b => b.id === bookId);
        if (book) {
          console.log('Found book in cached catalog data:', book.title);
          return {
            success: true,
            data: book
          };
        } else {
          console.log('Book not found in cached catalog data');
        }
      } else {
        console.log('No cached catalog data available');
        console.log('Catalog cache structure:', this.catalogCache);
      }
      
      // If not in cache, try to get fresh catalog data
      console.log('Book not in cache, fetching fresh catalog data...');
      const catalogResponse = await this.getBooks({ limit: 100 }); // Get all books
      console.log('Fresh catalog response success:', catalogResponse.success);
      if (catalogResponse.success && catalogResponse.data && catalogResponse.data.books) {
        console.log('Available books in fresh data:', catalogResponse.data.books.map(b => ({ id: b.id, title: b.title })));
        const book = catalogResponse.data.books.find(b => b.id === bookId);
        if (book) {
          console.log('Found book in fresh catalog data:', book.title);
          return {
            success: true,
            data: book
          };
        } else {
          console.log('Book not found in fresh catalog data either');
        }
      } else {
        console.log('Fresh catalog data not available');
      }
    } catch (err) {
      console.log('Failed to get book from catalog:', err.message);
    }

    console.log('=== Trying individual endpoints ===');
    // If not found in catalog, try different endpoint structures
    const endpoints = [
      `${this.API_BASE}/api/books/${encodeURIComponent(bookId)}`,
      `${this.API_BASE}/api/book/${encodeURIComponent(bookId)}`,
      `${this.API_BASE}/books/${encodeURIComponent(bookId)}`,
      `${this.API_BASE}/book/${encodeURIComponent(bookId)}`
    ];
    
    // Try both GET and POST methods for each endpoint
    for (const url of endpoints) {
      for (const method of ['GET', 'POST']) {
        try {
          console.log(`Trying book endpoint: ${method} ${url}`);
          const response = await this.makeApiCall(url, {
            method: method
          });
          console.log(`Success with book endpoint: ${method} ${url}`);
          return response;
        } catch (err) {
          console.log(`Failed with book endpoint: ${method} ${url}`, err.message);
          // Continue to next method/endpoint
        }
      }
    }
    
    // If all endpoints fail, throw error
    console.log('All book endpoints failed');
    console.log('=== End getBookById Debug ===');
    throw new Error('Book not found - all endpoints failed');
  }

  /**
   * Get borrowed books (books with borrowed copies) for reservation
   */
  static async getBorrowedBooks(params = {}) {
    try {
      console.log('🔍 Fetching borrowed books for reservation...');
      
      // Get all books and filter for those with borrowed copies
      const response = await this.getBooks({
        ...params,
        forceRefresh: true,
        limit: params.limit || 1000
      });

      if (response.success && response.data && response.data.books) {
        // Filter to only show books that have at least one borrowed copy
        const borrowedBooks = response.data.books.filter(book => 
          book.availableCopies < book.totalCopies && book.totalCopies > 0
        );
        
        console.log(`📚 Found ${borrowedBooks.length} books with borrowed copies out of ${response.data.books.length} total books`);
        
    return {
      success: true,
      data: {
            books: borrowedBooks,
            pagination: {
              ...response.data.pagination,
              totalBooks: borrowedBooks.length
            }
          }
        };
      }
      
      return {
        success: true,
        data: {
          books: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalBooks: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      };
    } catch (error) {
      console.error('Error fetching borrowed books:', error);
      throw error;
    }
  }

  /**
   * Get available books (for direct borrowing)
   */
  static async getAvailableBooks(params = {}) {
    try {
      console.log('🔍 Fetching available books for borrowing...');
      
      const response = await this.getBooks({
        ...params,
        availability: 'available',
        forceRefresh: true,
        limit: params.limit || 1000
      });

      if (response.success && response.data && response.data.books) {
        console.log(`📚 Found ${response.data.books.length} available books`);
        return response;
      }
      
      return {
        success: true,
        data: {
          books: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalBooks: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      };
    } catch (error) {
      console.error('Error fetching available books:', error);
      throw error;
    }
  }

  /**
   * Get available copies for a specific book
   */
  static async getBookCopies(bookId) {
    console.log('⚠️ getBookCopies is deprecated - copy data is already included in book responses');
    console.log('📚 Copy information is available in the main book data from getBooks/getBookById');
    return {
      success: true,
      data: {
        copies: []
      }
    };
  }

  /**
   * Search books with advanced criteria
   */
  static async searchBooks(searchParams) {
    const queryParams = new URLSearchParams();
    if (searchParams.q) queryParams.append('q', searchParams.q);
    if (searchParams.filters) queryParams.append('filters', JSON.stringify(searchParams.filters));
    if (searchParams.sortBy) queryParams.append('sortBy', searchParams.sortBy);
    if (searchParams.sortOrder) queryParams.append('sortOrder', searchParams.sortOrder);

    const url = `${this.API_BASE}/api/books/search?${queryParams.toString()}`;
    
    try {
      return await this.makeApiCall(url, {
        method: 'GET'
      });
    } catch (err) {
      throw err;
    }
  }

  // ===== MY BOOKS API METHODS =====

  /**
   * Get user's books (supports both old and new call signatures)
   * Old: getUserBooks(userId, status='all', includeHistory=false)
   * New: getUserBooks(userId, { status?: string, includeHistory?: boolean })
   */
  static async getUserBooks(userId, statusOrParams = 'all', includeHistoryMaybe = false) {
    // Resolve userId from storage when needed
    let actualUserId = userId;
    if (!actualUserId || actualUserId === 'current-user-id') {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          actualUserId = userData.id;
          console.log('Using user ID from storage:', actualUserId);
        }
      } catch (err) {
        console.error('Error getting user ID from storage:', err);
      }
    }

    if (!actualUserId) {
      console.error('No user ID available for getUserBooks');
      throw new Error('User ID not available');
    }

    // Support both signatures
    let status = 'all';
    let includeHistory = false;
    if (typeof statusOrParams === 'object' && statusOrParams !== null) {
      status = statusOrParams.status || 'all';
      includeHistory = Boolean(statusOrParams.includeHistory);
    } else {
      status = typeof statusOrParams === 'string' ? statusOrParams : 'all';
      includeHistory = Boolean(includeHistoryMaybe);
    }

    const queryParams = new URLSearchParams();
    if (status && status !== 'all') queryParams.append('status', status);
    if (includeHistory) queryParams.append('includeHistory', 'true');

    const url = `${this.API_BASE}/api/mobile/users/${encodeURIComponent(actualUserId)}/books?${queryParams.toString()}`;
    try {
      console.log('Attempting to fetch user books from:', url);
      const response = await this.makeApiCall(url, { method: 'GET' });
      console.log('User books API response:', response);
      return response;
    } catch (err) {
      console.error('User books API failed:', err.message);
      throw err;
    }
  }

  /**
   * Borrow a book
   */
  static async borrowBook(userId, bookId, borrowData = {}) {
    try {
      const url = `${this.API_BASE}/api/mobile/users/${userId}/books/${bookId}/borrow`;
      
      // NEW: Include copyId and condition assessment data as required by backend
      const requestBody = {
        copyId: borrowData.copyId, // ← REQUIRED: Specific copy to borrow
        expectedReturnDate: borrowData.expectedReturnDate,
        initialCondition: borrowData.initialCondition, // ← REQUIRED: Book condition on borrow
        conditionNotes: borrowData.conditionNotes || 'Condition assessed during borrowing' // ← OPTIONAL: Borrow notes
      };

      const response = await this.makeApiCall(url, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      return response;
    } catch (err) {
      console.error('Error in borrowBook:', err);
      throw err;
    }
  }

  static async returnBook(userId, bookId, returnData = {}) {
    try {
      const url = `${this.API_BASE}/api/mobile/users/${userId}/books/${bookId}/return`;
      const requestBody = {
        copyId: returnData.copyId, // ← REQUIRED: Specific copy to return
        returnDate: new Date().toISOString(),
        condition: returnData.condition, // ← REQUIRED: Book condition on return
        notes: returnData.notes || 'Returned via mobile app' // ← OPTIONAL: Return notes
      };
      const response = await this.makeApiCall(url, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      return response;
    } catch (err) {
      console.error('Error in returnBook:', err);
      throw err;
    }
  }

  static async reserveBook(userId, bookId, reserveData = {}) {
    try {
      const url = `${this.API_BASE}/api/mobile/users/${userId}/books/${bookId}/reserve`;
      const requestBody = {
        expectedReturnDate: reserveData.expectedReturnDate,
        initialCondition: reserveData.initialCondition || 'GOOD',
        conditionNotes: reserveData.conditionNotes || null
      };
      const response = await this.makeApiCall(url, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      return response;
    } catch (err) {
      console.error('Error in reserveBook:', err);
      
      // Enhance error messages for better user experience
      if (err.message && err.message.includes('BORROW_LIMIT')) {
        throw new Error('You have reached your maximum borrowing limit. Please return some books before making new reservations.');
      } else if (err.message && err.message.includes('BOOK_UNAVAILABLE')) {
        throw new Error('This book is no longer available for reservation.');
      } else if (err.message && err.message.includes('ALREADY_RESERVED')) {
        throw new Error('You have already reserved this book.');
      } else if (err.message && err.message.includes('ACCOUNT_SUSPENDED')) {
        throw new Error('Your account is currently suspended. Please contact the library.');
      } else if (err.message && err.message.includes('OVERDUE_BOOKS')) {
        throw new Error('You have overdue books. Please return them before making new reservations.');
      } else if (err.message && (err.message.includes('CORS') || err.message.includes('Failed to fetch'))) {
        throw new Error('Network connection issue. Please check your internet connection and try again.');
      }
      
      // For other errors, throw the original error
      throw err;
    }
  }

  // List reservations for a user with optional status filter
  static async listReservations(userId = null, status = 'all') {
    const currentUserId = userId || await this.getCurrentUserId();
    if (!currentUserId) throw new Error('User ID is required');
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const url = `${this.API_BASE}/api/mobile/users/${currentUserId}/reservations?${params}`;
    return await this.makeApiCall(url, { method: 'GET' });
  }

  // Cancel a reservation
  static async cancelReservation(userId = null, reservationId, reason = '') {
    const currentUserId = userId || await this.getCurrentUserId();
    if (!currentUserId) throw new Error('User ID is required');
    const url = `${this.API_BASE}/api/mobile/users/${currentUserId}/reservations/${reservationId}`;
    try {
      const headers = await this.getAuthHeaders();
      // Attempt 1: DELETE with JSON body (per current guide)
      const res1 = await fetch(url, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ reason: reason || 'No longer needed' })
      });
      if (res1.ok) return await this.handleApiResponse(res1, url);

      // Attempt 2: DELETE without body (some deployments reject DELETE bodies)
      const res2 = await fetch(url, { method: 'DELETE', headers });
      if (res2.ok) return await this.handleApiResponse(res2, url);

      // Attempt 3: Fallback to admin PATCH to set status=CANCELLED
      try {
        const adminUrl = `${this.API_BASE}/api/book-reservations/${encodeURIComponent(reservationId)}`;
        const res3 = await this.makeApiCall(adminUrl, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'CANCELLED', notes: reason || 'Cancelled by user', librarianId: currentUserId })
        });
        return res3;
      } catch (fallbackErr) {
        // if fallback also fails, throw original error
        const text = await res1.text().catch(() => '');
        const err = new Error(`Cancel failed. Server responded ${res1.status}. ${text || ''}`.trim());
        err.original = fallbackErr;
        throw err;
      }
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      throw err;
    }
  }

  /**
   * Renew a borrowed book
   */
  static async renewBook(userId, bookId, renewData = {}) {
    const url = `${this.API_BASE}/api/mobile/users/${encodeURIComponent(userId)}/books/${encodeURIComponent(bookId)}/renew`;
    
    try {
      const requestBody = {
        copyId: renewData.copyId // ← REQUIRED: Specific copy to renew
      };
      
      return await this.makeApiCall(url, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Report a book as lost or damaged
   */
  static async reportBook(userId, bookId, reportData) {
    const url = `${this.API_BASE}/api/mobile/users/${encodeURIComponent(userId)}/books/${encodeURIComponent(bookId)}/report`;
    
    try {
      return await this.makeApiCall(url, {
        method: 'POST',
        body: JSON.stringify(reportData)
      });
    } catch (err) {
      throw err;
    }
  }

  // ===== LOST/DAMAGED REPORTS (current backend implementation) =====
  static async createLostDamagedReport(payload) {
    // payload: { reportType: 'LOST'|'DAMAGED', bookId, bookCopyId, userId, transactionId, reportedBy, description, replacementCost, fineAmount }
    const url = `${this.API_BASE}/api/lost-damaged-reports`;
    return await this.makeApiCall(url, { method: 'POST', body: JSON.stringify(payload) });
  }

  static async listLostDamagedReports(query = {}) {
    const params = new URLSearchParams();
    if (query.status) params.append('status', query.status);
    if (query.reportType) params.append('reportType', query.reportType);
    if (query.userId) params.append('userId', query.userId);
    const url = `${this.API_BASE}/api/lost-damaged-reports?${params.toString()}`;
    return await this.makeApiCall(url, { method: 'GET' });
  }

  // ===== AUTHENTICATION METHODS =====

  /**
   * User login
   */
  static async login(credentials) {
    const url = `${this.API_BASE}/api/auth/login`;
    
    try {
      console.log('Attempting login with credentials:', { username: credentials.username, password: '***' });
      const data = await this.makeApiCall(url, {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      console.log('Login response:', data);

      // Store the auth token if login is successful
      if (data.data && data.data.token) {
        this.setAuthToken(data.data.token);
        console.log('Token set successfully, length:', data.data.token.length);
      } else {
        console.log('No token found in response');
      }

      return data;
    } catch (err) {
      if (__DEV__) {
        console.warn('Login error:', err?.message || err);
      }
      throw err;
    }
  }

  /**
   * Get user dashboard statistics
   */
  static async getUserDashboardStats(userId) {
    let actualUserId = userId;
    if (!actualUserId || actualUserId === 'current-user-id') {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          actualUserId = userData.id;
        }
      } catch (err) {
        console.error('Error getting user ID from storage:', err);
      }
    }

    if (!actualUserId) {
      throw new Error('User ID not available');
    }

    const url = `${this.API_BASE}/api/mobile/users/${encodeURIComponent(actualUserId)}/dashboard-stats`;
    
    try {
      const response = await this.makeApiCall(url, {
        method: 'GET'
      });
      return response;
    } catch (err) {
      console.error('Dashboard stats API failed:', err.message);
      throw err;
    }
  }

  /**
   * Get user recent activity
   */
  static async getUserRecentActivity(userId, limit = 5) {
    let actualUserId = userId;
    if (!actualUserId || actualUserId === 'current-user-id') {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          actualUserId = userData.id;
        }
      } catch (err) {
        console.error('Error getting user ID from storage:', err);
      }
    }

    if (!actualUserId) {
      throw new Error('User ID not available');
    }

    const url = `${this.API_BASE}/api/mobile/users/${encodeURIComponent(actualUserId)}/recent-activity?limit=${limit}`;
    
    try {
      const response = await this.makeApiCall(url, {
        method: 'GET'
      });
      return response;
    } catch (err) {
      console.error('Recent activity API failed:', err.message);
      throw err;
    }
  }

  /**
   * Get current user data
   */
  static async getCurrentUser() {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        return JSON.parse(userDataString);
      }
      return null;
    } catch (err) {
      console.error('Error getting current user data:', err);
      return null;
    }
  }


  // ===== BORROWING REQUEST API METHODS =====

  /**
   * Create a borrow request for an available book
   */
  static async createBorrowRequest(bookId, borrowData = {}) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const url = `${this.API_BASE}/api/mobile/users/${userId}/books/${bookId}/borrow-request`;
      
      const requestBody = {
        copyId: borrowData.copyId, // Required: Specific copy to borrow
        expectedReturnDate: borrowData.expectedReturnDate,
        initialCondition: borrowData.initialCondition || 'GOOD',
        conditionNotes: borrowData.conditionNotes || null,
        requestNotes: borrowData.requestNotes || null
      };

      console.log('📝 Creating borrow request:', requestBody);

      const response = await this.makeApiCall(url, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      // If the backend doesn't return copyId or bookId, add them from the request data
      if (response.success && response.data) {
        if (!response.data.copyId && requestBody.copyId) {
          console.log('📋 Backend response missing copyId, adding from request:', requestBody.copyId);
          response.data.copyId = requestBody.copyId;
        }
        if (!response.data.bookId && bookId) {
          console.log('📋 Backend response missing bookId, adding from request:', bookId);
          response.data.bookId = bookId;
        }
      }

      return response;
    } catch (err) {
      console.error('Error creating borrow request:', err);
      
      // Enhance error messages for better user experience
      if (err.message && err.message.includes('BORROW_LIMIT')) {
        throw new Error('You have reached your maximum borrowing limit. Please return some books before requesting new ones.');
      } else if (err.message && err.message.includes('BOOK_UNAVAILABLE')) {
        throw new Error('This book is no longer available for borrowing.');
      } else if (err.message && err.message.includes('INVALID_COPY')) {
        throw new Error('The selected copy is no longer available.');
      } else if (err.message && err.message.includes('ALREADY_BORROWED')) {
        throw new Error('You have already borrowed this book.');
      } else if (err.message && err.message.includes('ACCOUNT_SUSPENDED')) {
        throw new Error('Your account is currently suspended. Please contact the library.');
      } else if (err.message && err.message.includes('OVERDUE_BOOKS')) {
        throw new Error('You have overdue books. Please return them before borrowing new ones.');
      } else if (err.message && (err.message.includes('CORS') || err.message.includes('Failed to fetch'))) {
        throw new Error('Network connection issue. Please check your internet connection and try again.');
      }
      
      // For other errors, throw the original error
      throw err;
    }
  }

  /**
   * Get user's borrow requests
   */
  static async getBorrowRequests(status = 'all') {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Use the correct API endpoint for borrow requests
      const params = new URLSearchParams();
      if (status && status !== 'all') {
        params.append('status', String(status).toUpperCase());
      }
      // Ensure results are scoped to the current user
      params.append('userId', userId);

      const url = `${this.API_BASE}/api/borrow-requests?${params.toString()}`;
      
      const response = await this.makeApiCall(url, {
        method: 'GET'
      });

      // Transform and filter response to current user + pending
      if (response && Array.isArray(response)) {
        const rows = response
          .filter(r => String(r.userId) === String(userId))
          .map(request => ({
            id: request.id,
            bookId: request.bookId,
            copyId: request.copyId,
            userId: request.userId,
            status: String(request.status || '').toUpperCase(),
            dateRequested: request.dateRequested,
            book: request.book
          }));
        return { success: true, data: { requests: rows } };
      }

      // If response is object with data array, normalize and filter as well
      if (response && Array.isArray(response.data)) {
        const rows = response.data
          .filter(r => String(r.userId) === String(userId))
          .map(r => ({ ...r, status: String(r.status || '').toUpperCase() }));
        return { success: true, data: { requests: rows } };
      }

      return response;
    } catch (err) {
      console.error('Error fetching borrow requests:', err);
      throw err;
    }
  }

  /**
   * Create a reservation for a borrowed book
   */
  static async createReservation(bookId, reservationData = {}) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const url = `${this.API_BASE}/api/mobile/users/${userId}/books/${bookId}/reserve`;
      
      const requestBody = {
        expectedReturnDate: reservationData.expectedReturnDate,
        initialCondition: reservationData.initialCondition || 'GOOD',
        conditionNotes: reservationData.conditionNotes || null
      };

      console.log('📝 Creating reservation:', requestBody);

      const response = await this.makeApiCall(url, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      return response;
    } catch (err) {
      console.error('Error creating reservation:', err);
      
      // Enhance error messages for better user experience
      const upperMsg = String(err?.message || '').toUpperCase();
      if (upperMsg.includes('BOOK_AVAILABLE')) {
        throw new Error('Book has available copies. Please borrow it directly.');
      }
      if (upperMsg.includes('DUPLICATE_RESERVATION')) {
        throw new Error('You already have an active reservation for this book. Check My Reservations.');
      }
      if (err.message && err.message.includes('BORROW_LIMIT')) {
        throw new Error('You have reached your maximum borrowing limit. Please return some books before making new reservations.');
      } else if (err.message && err.message.includes('BOOK_UNAVAILABLE')) {
        throw new Error('This book is no longer available for reservation.');
      } else if (err.message && err.message.includes('ALREADY_RESERVED')) {
        throw new Error('You have already reserved this book.');
      } else if (err.message && err.message.includes('ACCOUNT_SUSPENDED')) {
        throw new Error('Your account is currently suspended. Please contact the library.');
      } else if (err.message && err.message.includes('OVERDUE_BOOKS')) {
        throw new Error('You have overdue books. Please return them before making new reservations.');
      } else if (err.message && (err.message.includes('CORS') || err.message.includes('Failed to fetch'))) {
        throw new Error('Network connection issue. Please check your internet connection and try again.');
      }
      
      // For other errors, throw the original error
      throw err;
    }
  }

  /**
   * Get user's reservations
   */
  static async getUserReservations(status = 'all') {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const params = new URLSearchParams();
      if (status && status !== 'all') {
        params.append('status', status);
      }

      const url = `${this.API_BASE}/api/mobile/users/${userId}/reservations?${params.toString()}`;
      
      const response = await this.makeApiCall(url, {
        method: 'GET'
      });

      return response;
    } catch (err) {
      console.error('Error fetching user reservations:', err);
      throw err;
    }
  }

  /**
   * Cancel a reservation
   */
  static async cancelReservation(reservationId, reason = '') {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const url = `${this.API_BASE}/api/mobile/users/${userId}/reservations/${reservationId}`;
      
      const requestBody = {
        reason: reason
      };

      console.log('📝 Cancelling reservation:', requestBody);

      const response = await this.makeApiCall(url, {
        method: 'DELETE',
        body: JSON.stringify(requestBody)
      });

      return response;
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      throw err;
    }
  }

  /**
   * Cancel a borrow request
   */
  static async cancelBorrowRequest(requestId, reason = 'Cancelled by user') {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const url = `${this.API_BASE}/api/mobile/users/${userId}/borrow-requests`;
      
      const requestBody = {
        requestId: requestId,
        reason: reason
      };

      const response = await this.makeApiCall(url, {
        method: 'DELETE',
        body: JSON.stringify(requestBody)
      });

      return response;
    } catch (err) {
      console.error('Error cancelling borrow request:', err);
      throw err;
    }
  }

  /**
   * Get user's book requests (for teachers)
   */
  static async getBookRequests(status = 'all', userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) throw new Error('User ID is required');
      
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (currentUserId) params.append('userId', currentUserId);
      
      const url = `${this.API_BASE}/api/book-requests?${params.toString()}`;
      
      const response = await this.makeApiCall(url, {
        method: 'GET'
      });

      // Handle different response formats
      if (Array.isArray(response)) {
        return { success: true, data: response };
      } else if (response && Array.isArray(response.data)) {
        return { success: true, data: response.data };
      } else if (response && response.success) {
        return response;
      } else {
        return { success: true, data: [] };
      }
    } catch (err) {
      console.error('Error fetching book requests:', err);
      throw err;
    }
  }

  /**
   * Create a book request (for teachers)
   */
  static async createBookRequest(bookData) {
    try {
      const url = `${this.API_BASE}/api/book-requests`;
      
      // Validate required fields
      if (!bookData.userId) throw new Error('User ID is required');
      if (!bookData.bookTitle || bookData.bookTitle.trim().length === 0) {
        throw new Error('Book title is required');
      }
      if (!bookData.author || bookData.author.trim().length === 0) {
        throw new Error('Author is required');
      }
      if (!bookData.publisher || bookData.publisher.trim().length === 0) {
        throw new Error('Publisher is required');
      }
      if (!bookData.justification || bookData.justification.trim().length === 0) {
        throw new Error('Justification is required');
      }

      const requestBody = {
        userId: bookData.userId,
        bookTitle: bookData.bookTitle.trim(),
        author: bookData.author.trim(),
        isbn: bookData.isbn?.trim() || undefined,
        publisher: bookData.publisher.trim(),
        edition: bookData.edition?.trim() || undefined,
        estimatedPrice: bookData.estimatedPrice ? parseFloat(bookData.estimatedPrice) : 0,
        justification: bookData.justification.trim(),
        priority: bookData.priority || 'MEDIUM'
      };

      const response = await this.makeApiCall(url, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      return response;
    } catch (err) {
      console.error('Error creating book request:', err);
      throw err;
    }
  }

  /**
   * Cancel a book request (for teachers)
   */
  static async cancelBookRequest(requestId) {
    try {
      const url = `${this.API_BASE}/api/book-requests/${requestId}`;
      
      const response = await this.makeApiCall(url, {
        method: 'DELETE'
      });

      return response;
    } catch (err) {
      console.error('Error cancelling book request:', err);
      throw err;
    }
  }

  // ===== FINES API METHODS =====

  // Get user's overdue fines dashboard
  static async getOverdueFines(userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) throw new Error('User ID is required');
      const res = await fetch(`${this.API_BASE}/api/mobile/users/${currentUserId}/overdue-fines`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });
      return await this.handleApiResponse(res, '/api/mobile/.../overdue-fines');
    } catch (error) {
      console.error('Error fetching overdue fines:', error);
      throw error;
    }
  }

  // Get fine details
  static async getFineDetails(userId = null, fineId) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) throw new Error('User ID is required');
      const response = await fetch(`${this.API_BASE}/api/mobile/users/${currentUserId}/fines/${fineId}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      return await this.handleApiResponse(response, `/api/mobile/.../fines/${fineId}`);
    } catch (error) {
      console.error('Error fetching fine details:', error);
      throw error;
    }
  }

  // Process a fine payment (backend to implement)
  static async processFinePayment(userId = null, fineId, payment) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) throw new Error('User ID is required');
      const res = await fetch(`${this.API_BASE}/api/mobile/users/${currentUserId}/fines/${fineId}/pay`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(payment)
      });
      return await this.handleApiResponse(res, '/api/mobile/.../fines/:id/pay');
    } catch (error) {
      console.error('Error processing fine payment:', error);
      throw error;
    }
  }

  // Get user's fine payment history
  static async getPaymentHistory(userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) throw new Error('User ID is required');
      const res = await fetch(`${this.API_BASE}/api/mobile/users/${currentUserId}/fines/payment-history`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });
      return await this.handleApiResponse(res, '/api/mobile/.../fines/payment-history');
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  // Get overdue books that might generate fines
  static async getOverdueBooks(userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User ID is required');
      }

      // Get user's borrowed books and check for overdue ones
      const userBooks = await this.getUserBooks(currentUserId);
      
      const now = new Date();
      const overdueBooks = userBooks.filter(book => {
        if (book.dueDate && book.status === 'borrowed') {
          const dueDate = new Date(book.dueDate);
          return dueDate < now;
        }
        return false;
      });

      return overdueBooks;
    } catch (error) {
      console.error('Error fetching overdue books:', error);
      throw error;
    }
  }

  // Calculate fine amount for overdue books
  static calculateFineAmount(dueDate, finePerDay = 1.00) {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = now - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays) * finePerDay;
  }

  // ===== LOAN RENEWAL & INCIDENT (SPEC-COMPLIANT) =====

  /**
   * Create a renewal request for a loan (PENDING)
   * POST /api/loans/[loanId]/renew
   */
  static async createLoanRenewal(loanId, requestedBy, notes = '') {
    try {
      if (!loanId) throw new Error('Missing loanId');
      const url = `${this.API_BASE}/api/loans/${encodeURIComponent(loanId)}/renew`;
      const body = { requestedBy, notes };
      const res = await this.makeApiCall(url, { method: 'POST', body: JSON.stringify(body) });
      if (res?.success !== true) {
        const err = res?.error?.message || 'Failed to create renewal request';
        throw new Error(err);
      }
      return res;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Create a lost/damage incident report for a loan (PENDING)
   * POST /api/loans/[loanId]/incident
   */
  static async reportLoanIncident(loanId, payload) {
    try {
      if (!loanId) throw new Error('Missing loanId');
      const url = `${this.API_BASE}/api/loans/${encodeURIComponent(loanId)}/incident`;
      const res = await this.makeApiCall(url, { method: 'POST', body: JSON.stringify(payload) });
      if (res?.success !== true) {
        const err = res?.error?.message || 'Failed to submit incident report';
        throw new Error(err);
      }
      return res;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Mobile API: Create renewal request for a specific book (per user)
   * POST /api/mobile/users/[id]/books/[bookId]/renew
   */
  static async createMobileRenewal(userId, bookId, options) {
    if (!userId) throw new Error('Missing userId');
    if (!bookId) throw new Error('Missing bookId');
    const url = `${this.API_BASE}/api/mobile/users/${encodeURIComponent(userId)}/books/${encodeURIComponent(bookId)}/renew`;
    const copyId = typeof options === 'object' ? options?.copyId : undefined;
    const reason = typeof options === 'object' ? options?.reason : undefined;
    const notes = typeof options === 'object' ? options?.notes : undefined;
    const body = {};
    if (copyId) body.copyId = copyId;
    if (reason) body.reason = reason;
    if (notes) body.notes = notes;
    if (!body.copyId) {
      console.warn('createMobileRenewal called without copyId. Backend requires copyId.');
    }
    const res = await this.makeApiCall(url, { method: 'POST', body: JSON.stringify(body) });
    return res;
  }

  /**
   * Mobile API: Create lost/damage report for a specific book (per user)
   * POST /api/mobile/users/[id]/books/[bookId]/report
   */
  static async reportMobileIncident(userId, bookId, { type, description } = {}) {
    if (!userId) throw new Error('Missing userId');
    if (!bookId) throw new Error('Missing bookId');
    const url = `${this.API_BASE}/api/mobile/users/${encodeURIComponent(userId)}/books/${encodeURIComponent(bookId)}/report`;
    const payload = {
      reportType: type, // 'LOST' | 'DAMAGED'
      description
    };
    const res = await this.makeApiCall(url, { method: 'POST', body: JSON.stringify(payload) });
    return res;
  }

  // Fetch renewal requests for current user (type=renewals)
  static async getUserRenewalRequests(userId = null) {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      if (!currentUserId) throw new Error('User ID is required');
      const primaryUrl = `${this.API_BASE}/api/mobile/users/${encodeURIComponent(currentUserId)}/requests?type=renewals`;
      const primaryRes = await this.makeApiCall(primaryUrl, { method: 'GET' });
      // Normalize and return if we have rows
      const primaryRows = Array.isArray(primaryRes)
        ? primaryRes
        : (primaryRes?.data?.renewals || primaryRes?.renewals || []);
      if (primaryRows && primaryRows.length >= 1) {
        return primaryRes;
      }
      // Fallback: admin list (ALL) then filter by userId
      const fallbackUrl = `${this.API_BASE}/api/renewal-requests?status=ALL`;
      const fallbackRes = await this.makeApiCall(fallbackUrl, { method: 'GET' }).catch(() => ({ success: false }));
      const allRows = Array.isArray(fallbackRes)
        ? fallbackRes
        : (Array.isArray(fallbackRes?.data) ? fallbackRes.data : (fallbackRes?.data?.renewals || fallbackRes?.renewals || []));
      const mine = (allRows || []).filter(r => {
        const rowUserId = r.userId || r.user_id || r.userid || r.user;
        return String(rowUserId) === String(currentUserId);
      });
      return { success: true, data: { renewals: mine } };
    } catch (err) {
      const message = String(err?.message || '').toUpperCase();
      // If endpoint is missing or server returned HTML/CORS issue, fall back gracefully
      if (message.includes('HTML') || message.includes('ENDPOINT') || message.includes('CORS')) {
        return { success: true, data: { renewals: [] }, error: { type: 'ENDPOINT_MISSING' } };
      }
      console.error('Error fetching renewal requests:', err);
      throw err;
    }
  }

  // Send OTP for password change
  static async sendPasswordChangeOTP(userEmail = null) {
    try {
      console.log('Sending OTP for password change...');
      
      let email = userEmail;
      
      // If no email provided, try to get it from user data
      if (!email) {
        const userData = await this.getCurrentUser();
        email = userData?.email;
      }
      
      // If still no email, try to get it from the backend user profile
      if (!email) {
        try {
          const profileResponse = await this.getUserProfile();
          if (profileResponse.success && profileResponse.data?.email) {
            email = profileResponse.data.email;
          }
        } catch (profileErr) {
          console.log('Could not fetch user profile:', profileErr);
        }
      }
      
      if (!email) {
        throw new Error('User email not found. Please provide your email address.');
      }

      const res = await fetch(`${this.API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email
        })
      });

      const data = await this.handleApiResponse(res, 'send-otp');
      console.log('✅ OTP sent successfully to:', email);
      
      return {
        success: true,
        message: data.message || `OTP sent to ${email}`,
        data: { ...data, email }
      };
    } catch (err) {
      console.error('❌ Error sending OTP:', err);
      return {
        success: false,
        message: err.message || 'Failed to send OTP'
      };
    }
  }

  // Verify OTP and change password
  static async verifyOTPAndChangePassword(otp, newPassword, userEmail = null) {
    try {
      console.log('Verifying OTP and changing password...');
      
      let email = userEmail;
      
      // If no email provided, try to get it from user data
      if (!email) {
        const userData = await this.getCurrentUser();
        email = userData?.email;
      }
      
      // If still no email, try to get it from the backend user profile
      if (!email) {
        try {
          const profileResponse = await this.getUserProfile();
          if (profileResponse.success && profileResponse.data?.email) {
            email = profileResponse.data.email;
          }
        } catch (profileErr) {
          console.log('Could not fetch user profile:', profileErr);
        }
      }
      
      if (!email) {
        throw new Error('User email not found. Please provide your email address.');
      }

      const res = await fetch(`${this.API_BASE}/api/auth/verify-otp-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          otp,
          newPassword,
          confirmPassword: newPassword
        })
      });

      const data = await this.handleApiResponse(res, 'verify-otp-reset');
      console.log('✅ Password changed successfully');
      
      return {
        success: true,
        message: data.message || 'Password changed successfully',
        data
      };
    } catch (err) {
      console.error('❌ Error changing password:', err);
      return {
        success: false,
        message: err.message || 'Failed to change password'
      };
    }
  }

  // Legacy change password method (keeping for backward compatibility)
  static async changePassword(currentPassword, newPassword) {
    try {
      console.log('Attempting to change password...');
      
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const res = await fetch(`${this.API_BASE}/api/mobile/users/${userId}/change-password`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await this.handleApiResponse(res, 'change-password');
      console.log('✅ Password changed successfully');
      
      return {
        success: true,
        message: data.message || 'Password changed successfully',
        data
      };
    } catch (err) {
      console.error('❌ Error changing password:', err);
      return {
        success: false,
        message: err.message || 'Failed to change password'
      };
    }
  }
}
