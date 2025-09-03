# 📊 Dashboard API Integration Guide

## Overview
The mobile dashboard now requires real data from the backend instead of dummy data. This guide outlines the API endpoints that need to be implemented to provide user statistics and recent activity data.

## 🔗 Required API Endpoints

### 1. User Dashboard Statistics
**Endpoint:** `GET /api/mobile/users/{userId}/dashboard-stats`

**Purpose:** Get user's dashboard statistics for the Quick Overview section.

**Response Format:**
```json
{
  "success": true,
  "data": {
    "borrowedCount": 3,
    "overdueCount": 1,
    "pendingRequestsCount": 2,
    "recommendationsCount": 5,
    "totalFines": 2.50
  }
}
```

**Implementation Notes:**
- `borrowedCount`: Number of books currently borrowed by the user
- `overdueCount`: Number of books that are overdue
- `pendingRequestsCount`: Number of pending book requests
- `recommendationsCount`: Number of book recommendations available
- `totalFines`: Total amount of fines owed by the user

### 2. User Recent Activity
**Endpoint:** `GET /api/mobile/users/{userId}/recent-activity?limit={limit}`

**Purpose:** Get user's recent library activities for the Recent Activity section.

**Query Parameters:**
- `limit` (optional): Number of activities to return (default: 5)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "activity_1",
        "type": "borrowed",
        "title": "The Great Gatsby",
        "subtitle": "Due in 5 days",
        "status": "Borrowed",
        "icon": "📚",
        "date": "2024-01-01T10:00:00Z"
      },
      {
        "id": "activity_2",
        "type": "returned",
        "title": "To Kill a Mockingbird",
        "subtitle": "Returned successfully",
        "status": "Completed",
        "icon": "✅",
        "date": "2023-12-10T10:00:00Z"
      },
      {
        "id": "activity_3",
        "type": "overdue",
        "title": "1984",
        "subtitle": "Overdue - Fine: $2.50",
        "status": "Overdue",
        "icon": "⏰",
        "date": "2023-12-15T10:00:00Z"
      }
    ]
  }
}
```

**Activity Types:**
- `borrowed`: Book borrowing activity
- `returned`: Book return activity
- `overdue`: Overdue book activity
- `requested`: Book request activity
- `renewed`: Book renewal activity

## 🔄 Fallback Implementation

If the specific dashboard endpoints are not available, the mobile app will fall back to using the existing `getUserBooks` endpoint and create activity data from the user's book history.

**Current Fallback Logic:**
1. Fetch user books with `includeHistory=true`
2. Convert borrowed books to activities
3. Convert returned books to activities
4. Convert overdue books to activities
5. Display up to 5 most recent activities

## 📱 Mobile App Features

### Real-time Data Display
- **User Information**: Displays actual user name, ID, and role from stored user data
- **Statistics Cards**: Shows real counts for borrowed books, overdue items, pending requests, and recommendations
- **Recent Activity**: Displays actual library activities with proper icons and status colors
- **Pull-to-Refresh**: Users can refresh dashboard data by pulling down

### Loading States
- Loading indicator while fetching data
- Error handling with retry functionality
- Empty state for when no activity exists

### Status Colors
- **Borrowed**: Blue (#3b82f6)
- **Completed**: Green (#10b981)
- **Overdue**: Red (#ef4444)
- **Pending**: Orange (#f59e0b)

## 🚀 Implementation Priority

### High Priority (Required for full functionality)
1. **Dashboard Statistics Endpoint** - Provides accurate counts for the Quick Overview section
2. **Recent Activity Endpoint** - Provides detailed activity history

### Medium Priority (Enhancement)
1. **Real-time Updates** - WebSocket or polling for live updates
2. **Activity Notifications** - Push notifications for new activities

## 🔧 Testing

### Test Data Requirements
- User with borrowed books
- User with overdue books
- User with pending requests
- User with returned books history
- User with no activity (empty state)

### API Testing
```bash
# Test dashboard stats
curl -H "Authorization: Bearer {token}" \
  https://kcmi-library-system.vercel.app/api/mobile/users/{userId}/dashboard-stats

# Test recent activity
curl -H "Authorization: Bearer {token}" \
  https://kcmi-library-system.vercel.app/api/mobile/users/{userId}/recent-activity?limit=5
```

## 📋 Checklist

- [ ] Implement `/api/mobile/users/{userId}/dashboard-stats` endpoint
- [ ] Implement `/api/mobile/users/{userId}/recent-activity` endpoint
- [ ] Add proper authentication and authorization
- [ ] Add error handling and validation
- [ ] Test with various user scenarios
- [ ] Update API documentation
- [ ] Deploy to production

## 🎯 Expected Results

Once implemented, the mobile dashboard will display:
- ✅ Real user statistics instead of dummy numbers
- ✅ Actual recent library activities
- ✅ Proper user information in the sidebar
- ✅ Dynamic loading states and error handling
- ✅ Pull-to-refresh functionality

The dashboard will provide users with accurate, real-time information about their library usage and activity history.
