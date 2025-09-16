/**
 * Renewal utility functions for different user types
 */

export const RENEWAL_PERIODS = {
  STUDENT: {
    days: 3,
    description: '3 days'
  },
  TEACHER: {
    days: 30, // 1 month (30 days)
    description: '1 month'
  }
};

/**
 * Get renewal period based on user role
 * @param {string} userRole - User role ('STUDENT' or 'TEACHER')
 * @returns {Object} Renewal period object with days and description
 */
export const getRenewalPeriod = (userRole) => {
  const role = String(userRole || '').toUpperCase();
  
  switch (role) {
    case 'STUDER':
    case 'STUDENT':
      return RENEWAL_PERIODS.STUDENT;
    case 'TEACHER':
      return RENEWAL_PERIODS.TEACHER;
    default:
      // Default to student period for unknown roles
      console.warn('Unknown user role for renewal period:', userRole, 'defaulting to student period');
      return RENEWAL_PERIODS.STUDENT;
  }
};

/**
 * Calculate new due date after renewal
 * @param {string} currentDueDate - Current due date (ISO string)
 * @param {string} userRole - User role
 * @returns {Date} New due date after renewal
 */
export const calculateRenewalDueDate = (currentDueDate, userRole) => {
  const renewalPeriod = getRenewalPeriod(userRole);
  const currentDate = new Date(currentDueDate);
  const newDueDate = new Date(currentDate);
  newDueDate.setDate(currentDate.getDate() + renewalPeriod.days);
  return newDueDate;
};

/**
 * Get renewal period description for display
 * @param {string} userRole - User role
 * @returns {string} Human-readable renewal period description
 */
export const getRenewalPeriodDescription = (userRole) => {
  const renewalPeriod = getRenewalPeriod(userRole);
  return renewalPeriod.description;
};

/**
 * Check if user can renew (not overdue)
 * @param {string} dueDate - Due date (ISO string)
 * @param {string} userRole - User role
 * @returns {boolean} True if user can renew
 */
export const canRenew = (dueDate, userRole) => {
  const renewalPeriod = getRenewalPeriod(userRole);
  const currentDate = new Date();
  const due = new Date(dueDate);
  
  // Calculate grace period (4th day for students, 1 day for teachers)
  const gracePeriod = userRole?.toUpperCase() === 'TEACHER' ? 1 : 4;
  const graceDate = new Date(due);
  graceDate.setDate(due.getDate() + gracePeriod);
  
  return currentDate <= graceDate;
};

/**
 * Get days until overdue
 * @param {string} dueDate - Due date (ISO string)
 * @param {string} userRole - User role
 * @returns {number} Days until overdue (negative if already overdue)
 */
export const getDaysUntilOverdue = (dueDate, userRole) => {
  const currentDate = new Date();
  const due = new Date(dueDate);
  const gracePeriod = userRole?.toUpperCase() === 'TEACHER' ? 1 : 4;
  const graceDate = new Date(due);
  graceDate.setDate(due.getDate() + gracePeriod);
  
  const diffTime = graceDate - currentDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export default {
  RENEWAL_PERIODS,
  getRenewalPeriod,
  calculateRenewalDueDate,
  getRenewalPeriodDescription,
  canRenew,
  getDaysUntilOverdue
};
