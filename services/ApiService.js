import AsyncStorage from '@react-native-async-storage/async-storage';

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
    
    // Check if response is HTML (usually means CORS error or server error)
    if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
      throw new Error(`Server returned HTML instead of JSON. This usually means a CORS issue or the endpoint doesn't exist. Endpoint: ${endpoint}`);
    }
    
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || 'Invalid response format' };
    }

    if (!res.ok) {
      const errMsg = data.message || data.error || `Request failed with status ${res.status}`;
      throw new Error(errMsg);
    }

    return data;
  }

  // Helper method to make API calls with CORS handling
  static async makeApiCall(url, options = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        },
        // Add CORS mode to handle cross-origin requests
        mode: 'cors',
        credentials: 'omit'
      });
      
      return await this.handleApiResponse(res, url);
    } catch (err) {
      // Handle network errors and CORS issues
      if (err.message.includes('CORS') || err.message.includes('HTML')) {
        throw new Error(`Backend connection issue: ${err.message}. Please check if the backend is running and CORS is properly configured.`);
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
      console.log('Fetching books from:', url);
      const response = await this.makeApiCall(url, {
        method: 'GET'
      });
      
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
      console.error('Books API failed, using fallback data:', err.message);
      // Return fallback data for testing
      const fallbackData = {
        success: true,
        data: {
          books: [
            {
              id: '1',
              title: 'The Great Gatsby',
              author: 'F. Scott Fitzgerald',
              subject: 'Fiction',
              ddc: '813.52',
              location: 'A-1-01',
              availability: 'available',
              totalCopies: 2,
              availableCopies: 1,
              isbn: '978-0743273565',
              publicationYear: 1925,
              publisher: 'Scribner',
              description: 'A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.'
            },
            {
              id: '2',
              title: 'To Kill a Mockingbird',
              author: 'Harper Lee',
              subject: 'Fiction',
              ddc: '813.54',
              location: 'A-1-02',
              availability: 'available',
              totalCopies: 3,
              availableCopies: 2,
              isbn: '978-0446310789',
              publicationYear: 1960,
              publisher: 'Grand Central Publishing',
              description: 'The story of young Scout Finch and her father Atticus in a racially divided Alabama town.'
            },
            {
              id: '3',
              title: '1984',
              author: 'George Orwell',
              subject: 'Fiction',
              ddc: '823.912',
              location: 'A-1-03',
              availability: 'unavailable',
              totalCopies: 1,
              availableCopies: 0,
              isbn: '978-0451524935',
              publicationYear: 1949,
              publisher: 'Signet Classic',
              description: 'A dystopian novel about totalitarianism and surveillance society.'
            }
          ],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalBooks: 3,
            hasNext: false,
            hasPrev: false
          }
        }
      };
      
      // Cache the fallback data
      this.catalogCache = fallbackData;
      this.catalogCacheTime = now;
      
      return fallbackData;
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
    
    // If all endpoints fail, return fallback data
    console.log('All book endpoints failed, using fallback data');
    console.log('=== End getBookById Debug ===');
    return {
      success: true,
      data: {
        id: bookId,
        title: 'Sample Book Title',
        author: 'Sample Author',
        subject: 'Sample Subject',
        ddc: '000.000',
        location: 'A-1-01',
        availability: 'available',
        totalCopies: 3,
        availableCopies: 2,
        isbn: '978-0-000000-0-0',
        publicationYear: 2024,
        publisher: 'Sample Publisher',
        description: 'This is a sample book description for testing purposes. The backend endpoint is not yet implemented or is not responding.'
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
   * Get user's borrowed books
   */
  static async getUserBooks(userId, params = {}) {
    // If userId is not provided or is "current-user-id", try to get it from stored user data
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

    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.includeHistory) queryParams.append('includeHistory', params.includeHistory);

    const url = `${this.API_BASE}/api/mobile/users/${encodeURIComponent(actualUserId)}/books?${queryParams.toString()}`;
    
    try {
      console.log('Attempting to fetch user books from:', url);
      const response = await this.makeApiCall(url, {
        method: 'GET'
      });
      console.log('User books API response:', response);
      return response;
    } catch (err) {
      console.error('User books API failed, using fallback data:', err.message);
      // Return fallback data for testing
      return {
        success: true,
        data: {
          borrowedBooks: [
            {
              id: 'borrow_1',
              bookId: '1',
              bookTitle: 'The Great Gatsby',
              bookAuthor: 'F. Scott Fitzgerald',
              bookCover: '',
              borrowDate: '2024-01-01T10:00:00Z',
              dueDate: '2024-01-15T10:00:00Z',
              returnDate: null,
              status: 'borrowed',
              daysRemaining: 5,
              isOverdue: false,
              fineAmount: 0,
              fineStatus: 'none',
              renewalCount: 0,
              maxRenewals: 2
            }
          ],
          returnedBooks: [
            {
              id: 'borrow_2',
              bookId: '2',
              bookTitle: 'To Kill a Mockingbird',
              bookAuthor: 'Harper Lee',
              bookCover: '',
              borrowDate: '2023-12-01T10:00:00Z',
              dueDate: '2023-12-15T10:00:00Z',
              returnDate: '2023-12-10T10:00:00Z',
              status: 'returned',
              daysRemaining: 0,
              isOverdue: false,
              fineAmount: 0,
              fineStatus: 'none',
              renewalCount: 1,
              maxRenewals: 2
            }
          ],
          overdueBooks: []
        }
      };
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
        expectedReturnDate: reserveData.expectedReturnDate
        // No condition assessment required - backend will handle it
      };
      const response = await this.makeApiCall(url, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      return response;
    } catch (err) {
      console.error('Error in reserveBook:', err);
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
      console.error('Dashboard stats API failed, using fallback data:', err.message);
      // Return fallback data for testing
      return {
        success: true,
        data: {
          borrowedCount: 0,
          overdueCount: 0,
          pendingRequestsCount: 0,
          recommendationsCount: 0,
          totalFines: 0
        }
      };
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
      console.error('Recent activity API failed, using fallback data:', err.message);
      // Return fallback data for testing
      return {
        success: true,
        data: {
          activities: []
        }
      };
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

  // Fallback data for getBooks when backend is unavailable
  static getFallbackBooks() {
    return {
      success: true,
      data: [
        {
          id: 1,
          title: "Mathematics 101",
          author: "John Doe",
          subject: "Mathematics",
          ddc: "510.1",
          isbn: "978-1234567890",
          publisher: "Math Publishers",
          publicationYear: 2023,
          description: "Introduction to mathematics for beginners",
          totalCopies: 3,
          availableCopies: 2,
          coverImage: null
        },
        {
          id: 2,
          title: "Physics Fundamentals",
          author: "Jane Smith",
          subject: "Physics",
          ddc: "530.1",
          isbn: "978-0987654321",
          publisher: "Science Press",
          publicationYear: 2022,
          description: "Basic physics concepts and principles",
          totalCopies: 2,
          availableCopies: 1,
          coverImage: null
        },
        {
          id: 3,
          title: "Literature Classics",
          author: "William Shakespeare",
          subject: "Literature",
          ddc: "820.1",
          isbn: "978-1122334455",
          publisher: "Classic Books",
          publicationYear: 2021,
          description: "Collection of classic literature works",
          totalCopies: 4,
          availableCopies: 3,
          coverImage: null
        }
      ]
    };
  }

  // Fallback data for getBookById when backend is unavailable
  static getFallbackBookById(bookId) {
    const fallbackBooks = {
      1: {
        id: 1,
        title: "Mathematics 101",
        author: "John Doe",
        subject: "Mathematics",
        ddc: "510.1",
        isbn: "978-1234567890",
        publisher: "Math Publishers",
        publicationYear: 2023,
        description: "Introduction to mathematics for beginners. This book covers fundamental mathematical concepts including algebra, geometry, and calculus. Perfect for students starting their mathematical journey.",
        totalCopies: 3,
        availableCopies: 2,
        coverImage: null,
        copies: [
          {
            id: 101,
            copyNumber: "MATH-001",
            status: "available",
            location: "Shelf A-1",
            condition: "good"
          },
          {
            id: 102,
            copyNumber: "MATH-002",
            status: "borrowed",
            borrowedBy: {
              id: "user123",
              name: "John Smith"
            },
            dueDate: "2025-05-01T00:00:00Z",
            location: "Shelf A-1",
            condition: "good"
          },
          {
            id: 103,
            copyNumber: "MATH-003",
            status: "available",
            location: "Shelf A-1",
            condition: "excellent"
          }
        ]
      },
      2: {
        id: 2,
        title: "Physics Fundamentals",
        author: "Jane Smith",
        subject: "Physics",
        ddc: "530.1",
        isbn: "978-0987654321",
        publisher: "Science Press",
        publicationYear: 2022,
        description: "Basic physics concepts and principles. This comprehensive guide covers mechanics, thermodynamics, electromagnetism, and modern physics. Essential reading for physics students.",
        totalCopies: 2,
        availableCopies: 1,
        coverImage: null,
        copies: [
          {
            id: 201,
            copyNumber: "PHYS-001",
            status: "available",
            location: "Shelf B-2",
            condition: "good"
          },
          {
            id: 202,
            copyNumber: "PHYS-002",
            status: "borrowed",
            borrowedBy: {
              id: "user456",
              name: "Alice Johnson"
            },
            dueDate: "2025-04-20T00:00:00Z",
            location: "Shelf B-2",
            condition: "fair"
          }
        ]
      },
      3: {
        id: 3,
        title: "Literature Classics",
        author: "William Shakespeare",
        subject: "Literature",
        ddc: "820.1",
        isbn: "978-1122334455",
        publisher: "Classic Books",
        publicationYear: 2021,
        description: "Collection of classic literature works including plays, sonnets, and poems. A timeless collection that showcases the brilliance of Shakespeare's writing.",
        totalCopies: 4,
        availableCopies: 3,
        coverImage: null,
        copies: [
          {
            id: 301,
            copyNumber: "LIT-001",
            status: "available",
            location: "Shelf C-3",
            condition: "excellent"
          },
          {
            id: 302,
            copyNumber: "LIT-002",
            status: "available",
            location: "Shelf C-3",
            condition: "good"
          },
          {
            id: 303,
            copyNumber: "LIT-003",
            status: "borrowed",
            borrowedBy: {
              id: "user789",
              name: "Bob Wilson"
            },
            dueDate: "2025-04-25T00:00:00Z",
            location: "Shelf C-3",
            condition: "good"
          },
          {
            id: 304,
            copyNumber: "LIT-004",
            status: "available",
            location: "Shelf C-3",
            condition: "good"
          }
        ]
      }
    };

    return {
      success: true,
      data: fallbackBooks[bookId] || fallbackBooks[1] // Default to first book if ID not found
    };
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

  // Change Password
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
