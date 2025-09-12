/**
 * Error Handler Utility
 * Centralizes error handling logic for user-friendly error messages
 */

export const ErrorTypes = {
  BORROW_LIMIT: 'BORROW_LIMIT',
  BOOK_UNAVAILABLE: 'BOOK_UNAVAILABLE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_COPY: 'INVALID_COPY',
  ALREADY_BORROWED: 'ALREADY_BORROWED',
  ALREADY_RESERVED: 'ALREADY_RESERVED',
  DUPLICATE_RESERVATION: 'DUPLICATE_RESERVATION',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  OVERDUE_BOOKS: 'OVERDUE_BOOKS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR'
};

export const UserFriendlyMessages = {
  [ErrorTypes.BORROW_LIMIT]: 'You have reached your maximum borrowing limit. Please return some books before requesting new ones.',
  [ErrorTypes.BOOK_UNAVAILABLE]: 'This book is no longer available for borrowing.',
  [ErrorTypes.USER_NOT_FOUND]: 'User account not found. Please log in again.',
  [ErrorTypes.INVALID_COPY]: 'The selected copy is no longer available.',
  [ErrorTypes.ALREADY_BORROWED]: 'You have already borrowed this book.',
  [ErrorTypes.ALREADY_RESERVED]: 'You have already reserved this book.',
  [ErrorTypes.DUPLICATE_RESERVATION]: 'You already have an active reservation for this book. Check My Reservations.',
  [ErrorTypes.ACCOUNT_SUSPENDED]: 'Your account is currently suspended. Please contact the library.',
  [ErrorTypes.OVERDUE_BOOKS]: 'You have overdue books. Please return them before borrowing new ones.',
  [ErrorTypes.NETWORK_ERROR]: 'Network connection issue. Please check your internet connection and try again.',
  [ErrorTypes.AUTHENTICATION_ERROR]: 'Authentication failed. Please log in again.'
};

/**
 * Check if an error should be shown to the user
 * @param {Error} error - The error object
 * @returns {boolean} - True if error should be shown to user
 */
export const shouldShowErrorToUser = (error) => {
  if (!error || !error.message) return false;
  
  const errorMessage = error.message.toUpperCase();
  
  // System/Logic errors that should be shown to users
  const userFriendlyErrorKeywords = [
    'BORROW_LIMIT',
    'BOOK_UNAVAILABLE',
    'USER_NOT_FOUND',
    'INVALID_COPY',
    'ALREADY_BORROWED',
    'ALREADY_RESERVED',
    'DUPLICATE_RESERVATION',
    'ACCOUNT_SUSPENDED',
    'OVERDUE_BOOKS',
    'MAXIMUM',
    'LIMIT',
    'UNAVAILABLE',
    'NETWORK CONNECTION ISSUE',
    'AUTHENTICATION FAILED'
  ];
  
  return userFriendlyErrorKeywords.some(keyword => 
    errorMessage.includes(keyword)
  );
};

/**
 * Get user-friendly error message
 * @param {Error} error - The error object
 * @returns {string} - User-friendly error message
 */
export const getUserFriendlyErrorMessage = (error) => {
  if (!error || !error.message) {
    return 'Something went wrong. Please try again later.';
  }
  
  const errorMessage = error.message.toUpperCase();
  
  // Check for specific error types
  if (errorMessage.includes('BORROW_LIMIT')) {
    return UserFriendlyMessages[ErrorTypes.BORROW_LIMIT];
  } else if (errorMessage.includes('BOOK_UNAVAILABLE')) {
    return UserFriendlyMessages[ErrorTypes.BOOK_UNAVAILABLE];
  } else if (errorMessage.includes('USER_NOT_FOUND')) {
    return UserFriendlyMessages[ErrorTypes.USER_NOT_FOUND];
  } else if (errorMessage.includes('INVALID_COPY')) {
    return UserFriendlyMessages[ErrorTypes.INVALID_COPY];
  } else if (errorMessage.includes('ALREADY_BORROWED')) {
    return UserFriendlyMessages[ErrorTypes.ALREADY_BORROWED];
  } else if (errorMessage.includes('ALREADY_RESERVED')) {
    return UserFriendlyMessages[ErrorTypes.ALREADY_RESERVED];
  } else if (errorMessage.includes('DUPLICATE_RESERVATION')) {
    return UserFriendlyMessages[ErrorTypes.DUPLICATE_RESERVATION];
  } else if (errorMessage.includes('ACCOUNT_SUSPENDED')) {
    return UserFriendlyMessages[ErrorTypes.ACCOUNT_SUSPENDED];
  } else if (errorMessage.includes('OVERDUE_BOOKS')) {
    return UserFriendlyMessages[ErrorTypes.OVERDUE_BOOKS];
  } else if (errorMessage.includes('CORS') || errorMessage.includes('FAILED TO FETCH')) {
    return UserFriendlyMessages[ErrorTypes.NETWORK_ERROR];
  } else if (errorMessage.includes('AUTHENTICATION')) {
    return UserFriendlyMessages[ErrorTypes.AUTHENTICATION_ERROR];
  }
  
  // If it's a user-friendly error but we don't have a specific message, return the original
  if (shouldShowErrorToUser(error)) {
    return error.message;
  }
  
  // For code errors, return generic message
  return 'Something went wrong. Please try again later.';
};

/**
 * Handle backend API error response
 * @param {Object} apiResponse - The API response object
 * @returns {Error} - Enhanced error object
 */
export const handleBackendError = (apiResponse) => {
  if (!apiResponse || !apiResponse.error) {
    return new Error('Something went wrong. Please try again later.');
  }
  
  const { error } = apiResponse;
  
  // Check if it's a user-friendly error based on backend error type
  if (error.type === 'USER_ERROR' || error.type === 'SYSTEM_ERROR') {
    return new Error(error.message);
  }
  
  // Check error code for user-friendly errors
  if (error.code && shouldShowErrorToUser({ message: error.code })) {
    return new Error(error.message || getUserFriendlyErrorMessage({ message: error.code }));
  }
  
  // For code errors, return generic message
  console.error('Backend code error (not showing to user):', error);
  return new Error('Something went wrong. Please try again later.');
};

/**
 * Handle error for UI display
 * @param {Error} error - The error object
 * @param {Function} showAlert - Function to show alert (e.g., Alert.alert)
 * @param {string} defaultTitle - Default title for the alert
 */
export const handleErrorForUI = (error, showAlert, defaultTitle = 'Error') => {
  console.error('Error occurred:', error);
  
  if (shouldShowErrorToUser(error)) {
    // Show user-friendly error
    const message = getUserFriendlyErrorMessage(error);
    showAlert(defaultTitle, message);
  } else {
    // For code errors, just log them and show generic message
    console.error('Code error (not showing to user):', error);
    showAlert('Error', 'Something went wrong. Please try again later.');
  }
};

/**
 * Enhanced error handling for API calls
 * @param {Error} error - The error object
 * @returns {Error} - Enhanced error with user-friendly message
 */
export const enhanceApiError = (error) => {
  if (!error || !error.message) {
    return new Error('Something went wrong. Please try again later.');
  }
  
  const enhancedMessage = getUserFriendlyErrorMessage(error);
  const enhancedError = new Error(enhancedMessage);
  enhancedError.originalError = error;
  enhancedError.shouldShowToUser = shouldShowErrorToUser(error);
  
  return enhancedError;
};
