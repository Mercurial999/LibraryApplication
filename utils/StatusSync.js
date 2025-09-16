import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/ApiService';

/**
 * Real-time status synchronization utility
 * Ensures book statuses are updated across all pages in real-time
 */
class StatusSync {
  static instance = null;
  static listeners = new Set();
  static syncInterval = null;
  static SYNC_INTERVAL = 10000; // 10 seconds - more responsive for status changes

  static getInstance() {
    if (!this.instance) {
      this.instance = new StatusSync();
    }
    return this.instance;
  }

  // Add a listener for status updates
  static addListener(callback) {
    this.listeners.add(callback);
    console.log('📡 StatusSync: Added listener, total listeners:', this.listeners.size);
  }

  // Remove a listener
  static removeListener(callback) {
    this.listeners.delete(callback);
    console.log('📡 StatusSync: Removed listener, total listeners:', this.listeners.size);
  }

  // Start real-time synchronization
  static startSync() {
    if (this.syncInterval) {
      console.log('📡 StatusSync: Already running');
      return;
    }

    console.log('📡 StatusSync: Starting real-time status synchronization');
    this.syncInterval = setInterval(async () => {
      try {
        await this.performSync();
      } catch (error) {
        console.error('📡 StatusSync: Error during sync:', error);
      }
    }, this.SYNC_INTERVAL);
  }

  // Stop real-time synchronization
  static stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('📡 StatusSync: Stopped real-time status synchronization');
    }
  }

  // Perform a sync operation
  static async performSync() {
    try {
      console.log('📡 StatusSync: Performing status sync...');
      
      // Check if we have a valid auth token before making API calls
      if (!ApiService.hasValidToken()) {
        console.log('📡 StatusSync: No valid auth token, stopping sync');
        this.stopSync();
        return;
      }

      const userId = await ApiService.getCurrentUserId();
      if (!userId) {
        console.log('📡 StatusSync: No user ID, skipping sync');
        return;
      }

      // Sync user's borrowed books status
      const borrowedBooksResponse = await ApiService.getUserBooks(userId, { 
        status: 'all', 
        includeHistory: true 
      });

      // Sync pending requests status
      const pendingRequestsResponse = await ApiService.getBorrowRequests('all');

      // Sync reservations status
      const reservationsResponse = await ApiService.getUserReservations('all');

      // Extract copy-specific and book-specific status information
      const statusData = this.extractCopyStatuses({
        borrowedBooks: borrowedBooksResponse,
        pendingRequests: pendingRequestsResponse,
        reservations: reservationsResponse
      });

      // Notify all listeners with updated data
      const syncData = {
        borrowedBooks: borrowedBooksResponse,
        pendingRequests: pendingRequestsResponse,
        reservations: reservationsResponse,
        copyStatuses: statusData.copyStatuses,
        bookStatuses: statusData.bookStatuses,
        timestamp: Date.now()
      };

      console.log('📡 StatusSync: Notifying listeners with updated data including copy statuses');
      this.listeners.forEach(callback => {
        try {
          callback(syncData);
        } catch (error) {
          console.error('📡 StatusSync: Error in listener callback:', error);
        }
      });

      // Update local cache with fresh data
      await this.updateLocalCache(syncData);

    } catch (error) {
      console.error('📡 StatusSync: Error during sync operation:', error);
      
      // If it's an authentication error, stop the sync to prevent repeated errors
      if (error.message && (
        error.message.includes('not authenticated') || 
        error.message.includes('User not authenticated') ||
        error.message.includes('Authentication failed') ||
        error.message.includes('Invalid token')
      )) {
        console.log('📡 StatusSync: Authentication error detected, stopping sync');
        this.stopSync();
        return;
      }
      
      // For other errors, just log them but don't stop the sync
      console.log('📡 StatusSync: Non-authentication error, continuing sync');
    }
  }

  // Extract copy-specific status information
  static extractCopyStatuses(data) {
    const copyStatuses = {
      borrowed: new Set(),
      pending: new Set(),
      reserved: new Set(),
      available: new Set()
    };
    
    const bookStatuses = {
      borrowed: new Set(),
      pending: new Set(),
      reserved: new Set()
    };

    try {
      // Extract borrowed copy IDs and book IDs (currently borrowed books)
      // Handle different response formats from getUserBooks
      let borrowedBooks = [];
      if (data.borrowedBooks?.success && data.borrowedBooks.data?.borrowedBooks) {
        borrowedBooks = data.borrowedBooks.data.borrowedBooks;
      } else if (Array.isArray(data.borrowedBooks)) {
        borrowedBooks = data.borrowedBooks;
      } else if (data.borrowedBooks?.data && Array.isArray(data.borrowedBooks.data)) {
        borrowedBooks = data.borrowedBooks.data;
      }

      borrowedBooks.forEach(book => {
        const copyId = book.copyId || book.copy_id || book.copy?.id || book.bookCopyId;
        const bookId = book.id || book.bookId || book.book_id;
        
        if (copyId) {
          copyStatuses.borrowed.add(String(copyId));
          console.log('📡 StatusSync: Added borrowed copy ID:', String(copyId));
        }
        if (bookId) {
          bookStatuses.borrowed.add(String(bookId));
          console.log('📡 StatusSync: Added borrowed book ID:', String(bookId));
        }
      });

      // Extract pending request copy IDs and book IDs (only if NOT already borrowed)
      // Since we now have a proper borrow-requests API, we should get actual pending requests
      if (data.pendingRequests?.success && data.pendingRequests.data?.requests) {
        data.pendingRequests.data.requests.forEach(request => {
          const copyId = request.copyId || request.copy_id;
          const bookId = request.bookId || request.book_id;
          const status = String(request.status || '').toUpperCase();
          
          // Only process if status is actually PENDING (exclude CANCELLED, APPROVED, etc.)
          if (status === 'PENDING') {
            if (copyId) {
              // Only add to pending if not already borrowed (approved requests)
              if (!copyStatuses.borrowed.has(String(copyId))) {
                copyStatuses.pending.add(String(copyId));
                console.log('📡 StatusSync: Added pending copy ID:', String(copyId));
              } else {
                console.log('📡 StatusSync: Skipped pending copy ID (already borrowed):', String(copyId));
              }
            }
            if (bookId) {
              // Only add to pending if not already borrowed (approved requests)
              if (!bookStatuses.borrowed.has(String(bookId))) {
                bookStatuses.pending.add(String(bookId));
                console.log('📡 StatusSync: Added pending book ID:', String(bookId));
              } else {
                console.log('📡 StatusSync: Skipped pending book ID (already borrowed):', String(bookId));
              }
            }
          } else if (status === 'CANCELLED') {
            // Remove from pending if cancelled
            if (copyId) {
              copyStatuses.pending.delete(String(copyId));
              console.log('📡 StatusSync: Removed cancelled copy ID from pending:', String(copyId));
            }
            if (bookId) {
              bookStatuses.pending.delete(String(bookId));
              console.log('📡 StatusSync: Removed cancelled book ID from pending:', String(bookId));
            }
          } else {
            console.log('📡 StatusSync: Skipped non-pending request:', { copyId, bookId, status });
          }
        });
      }

      // Extract reserved copy IDs and book IDs (only if NOT already borrowed)
      if (data.reservations?.success && data.reservations.data?.reservations) {
        data.reservations.data.reservations.forEach(reservation => {
          const copyId = reservation.copyId || reservation.copy_id;
          const bookId = reservation.bookId || reservation.book_id;
          const status = String(reservation.status || '').toUpperCase();
          
          // Only process active reservations
          if (status === 'ACTIVE' || status === 'READY' || status === 'PENDING') {
            if (copyId) {
              // Only add to reserved if not already borrowed
              if (!copyStatuses.borrowed.has(String(copyId))) {
                copyStatuses.reserved.add(String(copyId));
                console.log('📡 StatusSync: Added reserved copy ID:', String(copyId));
              } else {
                console.log('📡 StatusSync: Skipped reserved copy ID (already borrowed):', String(copyId));
              }
            }
            if (bookId) {
              // Only add to reserved if not already borrowed
              if (!bookStatuses.borrowed.has(String(bookId))) {
                bookStatuses.reserved.add(String(bookId));
                console.log('📡 StatusSync: Added reserved book ID:', String(bookId));
              } else {
                console.log('📡 StatusSync: Skipped reserved book ID (already borrowed):', String(bookId));
              }
            }
          }
        });
      }

      console.log('📡 StatusSync: Extracted copy statuses (with priority logic):', {
        borrowed: copyStatuses.borrowed.size,
        pending: copyStatuses.pending.size,
        reserved: copyStatuses.reserved.size,
        note: 'Borrowed status takes priority over pending/reserved'
      });
      
      console.log('📡 StatusSync: Extracted book statuses (with priority logic):', {
        borrowed: bookStatuses.borrowed.size,
        pending: bookStatuses.pending.size,
        reserved: bookStatuses.reserved.size,
        note: 'Borrowed status takes priority over pending/reserved'
      });

    } catch (error) {
      console.error('📡 StatusSync: Error extracting copy statuses:', error);
    }

    return { copyStatuses, bookStatuses };
  }

  // Update local cache with fresh data
  static async updateLocalCache(syncData) {
    try {
      const cacheKey = 'status_sync_cache';
      const cacheData = {
        ...syncData,
        lastUpdated: Date.now()
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('📡 StatusSync: Updated local cache');
    } catch (error) {
      console.error('📡 StatusSync: Error updating local cache:', error);
    }
  }

  // Get cached data
  static async getCachedData() {
    try {
      const cacheKey = 'status_sync_cache';
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('📡 StatusSync: Error getting cached data:', error);
      return null;
    }
  }

  // Force a manual sync
  static async forceSync() {
    console.log('📡 StatusSync: Force sync requested');
    await this.performSync();
  }

  // Clear pending copy IDs when requests are approved
  static async clearPendingCopyIds(approvedCopyIds) {
    try {
      if (!Array.isArray(approvedCopyIds)) return;
      
      console.log('📡 StatusSync: Clearing pending copy IDs for approved requests:', approvedCopyIds);
      
      // Notify listeners to clear pending status for approved copies
      const syncData = {
        clearPending: approvedCopyIds,
        timestamp: Date.now()
      };

      this.listeners.forEach(callback => {
        try {
          callback(syncData);
        } catch (error) {
          console.error('📡 StatusSync: Error in clear pending callback:', error);
        }
      });

    } catch (error) {
      console.error('📡 StatusSync: Error clearing pending copy IDs:', error);
    }
  }

  // Clear pending book IDs when requests are approved
  static async clearPendingBookIds(approvedBookIds) {
    try {
      if (!Array.isArray(approvedBookIds)) return;
      
      console.log('📡 StatusSync: Clearing pending book IDs for approved requests:', approvedBookIds);
      
      // Notify listeners to clear pending status for approved books
      const syncData = {
        clearPendingBooks: approvedBookIds,
        timestamp: Date.now()
      };

      this.listeners.forEach(callback => {
        try {
          callback(syncData);
        } catch (error) {
          console.error('📡 StatusSync: Error in clear pending books callback:', error);
        }
      });

    } catch (error) {
      console.error('📡 StatusSync: Error clearing pending book IDs:', error);
    }
  }

  // Clear all listeners and stop sync
  static cleanup() {
    this.stopSync();
    this.listeners.clear();
    console.log('📡 StatusSync: Cleaned up all listeners and stopped sync');
  }
}

export default StatusSync;
