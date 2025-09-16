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
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  DUPLICATE_RESERVATION: 'DUPLICATE_RESERVATION',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  OVERDUE_BOOKS: 'OVERDUE_BOOKS',
  BOOK_REPORTED_LOST: 'BOOK_REPORTED_LOST',
  BOOK_REPORTED_DAMAGED: 'BOOK_REPORTED_DAMAGED',
  BOOK_LOST: 'BOOK_LOST',
  BOOK_DAMAGED: 'BOOK_DAMAGED',
  COPY_LOST: 'COPY_LOST',
  COPY_DAMAGED: 'COPY_DAMAGED',
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
  [ErrorTypes.DUPLICATE_REQUEST]: 'You already have a pending borrow request for this book.',
  [ErrorTypes.DUPLICATE_RESERVATION]: 'You already have an active reservation for this book. Check My Reservations.',
  [ErrorTypes.ACCOUNT_SUSPENDED]: 'Your account is currently suspended. Please contact the library.',
  [ErrorTypes.OVERDUE_BOOKS]: 'You have overdue books. Please return them before borrowing new ones.',
  [ErrorTypes.BOOK_REPORTED_LOST]: 'This title is reported lost under your account. Please resolve the report with the library desk before borrowing again.',
  [ErrorTypes.BOOK_REPORTED_DAMAGED]: 'This title has a pending damage report on your account. Please resolve it before borrowing again.',
  [ErrorTypes.BOOK_LOST]: 'This book is marked as lost and cannot be borrowed.',
  [ErrorTypes.BOOK_DAMAGED]: 'This book is marked as damaged and cannot be borrowed.',
  [ErrorTypes.COPY_LOST]: 'The selected copy is marked as lost. Please select another copy.',
  [ErrorTypes.COPY_DAMAGED]: 'The selected copy is marked as damaged. Please select another copy.',
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
    'DUPLICATE_REQUEST',
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
  } else if (errorMessage.includes('BOOK_REPORTED_LOST') || errorMessage.includes('REPORTED_LOST')) {
    return UserFriendlyMessages[ErrorTypes.BOOK_REPORTED_LOST];
  } else if (errorMessage.includes('BOOK_REPORTED_DAMAGED') || errorMessage.includes('REPORTED_DAMAGED')) {
    return UserFriendlyMessages[ErrorTypes.BOOK_REPORTED_DAMAGED];
  } else if (errorMessage.includes('COPY_LOST') || errorMessage.includes('BOOK_COPY_LOST') || errorMessage.includes('BOOK_LOST')) {
    return UserFriendlyMessages[ErrorTypes.COPY_LOST];
  } else if (errorMessage.includes('COPY_DAMAGED') || errorMessage.includes('BOOK_COPY_DAMAGED') || errorMessage.includes('BOOK_DAMAGED')) {
    return UserFriendlyMessages[ErrorTypes.COPY_DAMAGED];
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
    // Prefer error.code in message so upstream handlers can detect by code
    const err = new Error(error.code ? String(error.code).toUpperCase() : (error.message || 'ERROR'));
    // Preserve original user message for UI mapping if needed
    err.userMessage = error.message;
    err.errorCode = error.code || undefined;
    return err;
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
  const isUserFacing = shouldShowErrorToUser(error);
  // Avoid console.error for user-facing errors to reduce Metro symbolication noise
  try {
    const msg = typeof error === 'string' ? error : (error?.message || String(error));
    if (!isUserFacing) {
      console.error('Error occurred:', msg);
    }
  } catch (_) {
    if (!isUserFacing) {
      console.error('Error occurred');
    }
  }
  
  if (isUserFacing) {
    // Show user-friendly error
    const message = getUserFriendlyErrorMessage(error);
    showAlert(defaultTitle, message);
  } else {
    // For code errors, log minimal and show generic message
    try {
      const msg = typeof error === 'string' ? error : (error?.message || String(error));
      console.error('Code error (not showing to user):', msg);
    } catch (_) {
      console.error('Code error (not showing to user)');
    }
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
