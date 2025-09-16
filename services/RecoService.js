import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

const KEY = 'reco_recent_actions_v1';
const LIMIT = 10;

// Enhanced action logging with more detailed information
export async function logAction(action) {
  try {
    // Get current user ID to ensure data isolation
    const user = await ApiService.getCurrentUser();
    if (!user || !user.id) {
      console.warn('Cannot log action: No authenticated user');
      return;
    }

    const userKey = `${KEY}_${user.id}`;
    const now = new Date().toISOString();
    const raw = await AsyncStorage.getItem(userKey);
    const arr = raw ? JSON.parse(raw) : [];
    const item = {
      t: now,
      userId: user.id, // Store user ID for additional verification
      type: action.type, // 'borrow' | 'reserve' | 'view' | 'search'
      bookId: action.bookId,
      title: action.title || null,
      category: action.category || null,
      author: action.author || null,
      publisher: action.publisher || null,
      subject: action.subject || null,
      shelfPrefix: action.shelfPrefix || null,
      shelfLocation: action.shelfLocation || null,
      ddcClassification: action.ddcClassification || null,
      publicationYear: action.publicationYear || null,
      rating: action.rating || null, // User rating if available
      duration: action.duration || null, // How long they kept the book
    };
    const next = [item, ...arr].slice(0, LIMIT);
    await AsyncStorage.setItem(userKey, JSON.stringify(next));
  } catch (error) {
    console.error('Error logging recommendation action:', error);
  }
}

// Get local hints for fallback recommendations
export async function getHints() {
  try {
    // Get current user ID to ensure data isolation
    const user = await ApiService.getCurrentUser();
    if (!user || !user.id) {
      console.warn('Cannot get hints: No authenticated user');
      return { 
        categories: [], 
        authors: [], 
        publishers: [],
        subjects: [],
        shelfPrefixes: [], 
        shelfLocations: [],
        ddcPrefixes: []
      };
    }

    const userKey = `${KEY}_${user.id}`;
    const raw = await AsyncStorage.getItem(userKey);
    const arr = raw ? JSON.parse(raw) : [];
    
    // Filter actions to ensure they belong to current user
    const userActions = arr.filter(a => a.userId === user.id);
    
    const hints = {
      categories: [], 
      authors: [], 
      publishers: [],
      subjects: [],
      shelfPrefixes: [], 
      shelfLocations: [],
      ddcPrefixes: []
    };
    
    for (const a of userActions) {
      if (a.category) hints.categories.push(a.category);
      if (a.author) hints.authors.push(a.author);
      if (a.publisher) hints.publishers.push(a.publisher);
      if (a.subject) hints.subjects.push(a.subject);
      if (a.shelfPrefix) hints.shelfPrefixes.push(a.shelfPrefix);
      if (a.shelfLocation) hints.shelfLocations.push(a.shelfLocation);
      if (a.ddcClassification) {
        const ddcPrefix = a.ddcClassification.split('.')[0];
        hints.ddcPrefixes.push(ddcPrefix);
      }
    }
    
    // de-dup and weight by recency implicitly by order
    const dedup = (xs) => Array.from(new Set(xs));
    return {
      ...hints,
      categories: dedup(hints.categories),
      authors: dedup(hints.authors),
      publishers: dedup(hints.publishers),
      subjects: dedup(hints.subjects),
      shelfPrefixes: dedup(hints.shelfPrefixes),
      shelfLocations: dedup(hints.shelfLocations),
      ddcPrefixes: dedup(hints.ddcPrefixes)
    };
  } catch {
    return { 
      categories: [], 
      authors: [], 
      publishers: [],
      subjects: [],
      shelfPrefixes: [], 
      shelfLocations: [],
      ddcPrefixes: []
    };
  }
}

// Enhanced recommendation ranking with percentage-based matching
export function rankRecommendations(recos, hints, userHistory = []) {
  const calculateMatchPercentage = (book) => {
    let totalScore = 0;
    let maxPossibleScore = 0;
    let matchFactors = [];

    // Category matching (highest weight - 30%)
    maxPossibleScore += 30;
    if (hints.categories.includes(book.category)) {
      const categoryWeight = 30;
      totalScore += categoryWeight;
      matchFactors.push({ factor: 'Category', weight: categoryWeight, matched: book.category });
    }

    // Author matching (high weight - 25%)
    maxPossibleScore += 25;
    if (hints.authors.includes(book.author)) {
      const authorWeight = 25;
      totalScore += authorWeight;
      matchFactors.push({ factor: 'Author', weight: authorWeight, matched: book.author });
    }

    // Publisher matching (medium weight - 15%)
    maxPossibleScore += 15;
    if (hints.publishers.includes(book.publisher)) {
      const publisherWeight = 15;
      totalScore += publisherWeight;
      matchFactors.push({ factor: 'Publisher', weight: publisherWeight, matched: book.publisher });
    }

    // Subject matching (medium weight - 15%)
    maxPossibleScore += 15;
    if (hints.subjects.includes(book.subject)) {
      const subjectWeight = 15;
      totalScore += subjectWeight;
      matchFactors.push({ factor: 'Subject', weight: subjectWeight, matched: book.subject });
    }

    // Shelf location matching (low weight - 8%)
    maxPossibleScore += 8;
    if (hints.shelfPrefixes.includes(book.shelfLocationPrefix) || hints.shelfLocations.includes(book.shelfLocation)) {
      const shelfWeight = 8;
      totalScore += shelfWeight;
      matchFactors.push({ factor: 'Shelf Location', weight: shelfWeight, matched: book.shelfLocation || book.shelfLocationPrefix });
    }

    // DDC classification matching (low weight - 7%)
    maxPossibleScore += 7;
    if (book.ddcClassification) {
      const ddcPrefix = book.ddcClassification.split('.')[0];
      if (hints.ddcPrefixes.includes(ddcPrefix)) {
        const ddcWeight = 7;
        totalScore += ddcWeight;
        matchFactors.push({ factor: 'DDC Classification', weight: ddcWeight, matched: book.ddcClassification });
      }
    }

    // Calculate percentage
    const matchPercentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

    // Determine recommendation type based on percentage
    let recommendationType = 'Suggested';
    if (matchPercentage >= 80) {
      recommendationType = 'Highly Recommended';
    } else if (matchPercentage >= 60) {
      recommendationType = 'Strong Match';
    } else if (matchPercentage >= 40) {
      recommendationType = 'Good Match';
    }

    // Add bonus points for availability and recency
    let bonusScore = 0;
    if ((book.availableCopies ?? 0) > 0) bonusScore += 2;
    if (book.publicationYear) {
      const currentYear = new Date().getFullYear();
      const bookAge = currentYear - book.publicationYear;
      if (bookAge <= 5) bonusScore += 1;
    }

    // Generate recommendation reasons
    const recommendationReasons = generateRecommendationReasons(matchFactors, book, userHistory);

    return {
      ...book,
      matchPercentage: Math.min(100, matchPercentage + bonusScore),
      recommendationType,
      recommendationReasons,
      matchFactors,
      totalScore,
      maxPossibleScore
    };
  };

  // Calculate match percentages for all books
  const booksWithMatch = recos.map(calculateMatchPercentage);
  
  // Sort by match percentage (highest first)
  return booksWithMatch.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

// Generate personalized recommendation reasons
function generateRecommendationReasons(matchFactors, book, userHistory) {
  const reasons = [];
  
  if (matchFactors.length === 0) {
    reasons.push('Based on popular books in our library');
    return reasons;
  }

  // Add reasons based on match factors
  matchFactors.forEach(factor => {
    switch (factor.factor) {
      case 'Category':
        reasons.push(`You've shown interest in ${factor.matched} books`);
        break;
      case 'Author':
        reasons.push(`You've enjoyed books by ${factor.matched}`);
        break;
      case 'Publisher':
        reasons.push(`You've liked books from ${factor.matched}`);
        break;
      case 'Subject':
        reasons.push(`You're interested in ${factor.matched} topics`);
        break;
      case 'Shelf Location':
        reasons.push(`You've borrowed from the ${factor.matched} section`);
        break;
      case 'DDC Classification':
        reasons.push(`You've liked books in the ${factor.matched} classification`);
        break;
    }
  });

  // Add availability reason
  if (book.availableCopies > 0) {
    reasons.push('Currently available for borrowing');
  }

  // Add recency reason
  if (book.publicationYear) {
    const currentYear = new Date().getFullYear();
    const bookAge = currentYear - book.publicationYear;
    if (bookAge <= 2) {
      reasons.push('Recently published');
    }
  }

  return reasons.slice(0, 3); // Limit to 3 reasons
}

// Get intelligent recommendations from backend
export async function getIntelligentRecommendations() {
  try {
    const user = await ApiService.getCurrentUser();
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }

    console.log(`🔍 Fetching recommendations for user: ${user.id}`);

    const response = await fetch(`${ApiService.API_BASE}/api/mobile/users/${user.id}/recommendations`, {
      method: 'GET',
      headers: await ApiService.getAuthHeaders(),
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch recommendations: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to get recommendations');
    }

    console.log(`✅ Received ${data.data?.recommendations?.length || 0} recommendations for user ${user.id}`);
    return data.data;
  } catch (error) {
    console.error('Error fetching intelligent recommendations:', error);
    // Fallback to local hints-based recommendations
    return await getFallbackRecommendations();
  }
}

// Fallback recommendations using local hints
export async function getFallbackRecommendations() {
  try {
    const user = await ApiService.getCurrentUser();
    
    if (!user || !user.id) {
      console.warn('Cannot get fallback recommendations: No authenticated user');
      return { recommendations: [], preferences: {}, analysis: { source: 'no_user' } };
    }

    console.log(`🔄 Getting fallback recommendations for user: ${user.id}`);
    
    const hints = await getHints();

    // Get available books for fallback recommendations
    const response = await fetch(`${ApiService.API_BASE}/api/books?status=ACTIVE&available=true`, {
      method: 'GET',
      headers: await ApiService.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch books for fallback');
    }

    const data = await response.json();
    const books = data.success ? data.data : [];

    // Get user history for better recommendations
    const userHistory = await getUserBorrowingHistory();
    
    console.log(`📚 Found ${books.length} books, ${userHistory.length} user history items, ${hints.categories.length} category hints`);
    
    // Rank books using local hints with percentage-based matching
    const rankedBooks = rankRecommendations(books, hints, userHistory);
    
    return {
      recommendations: rankedBooks.slice(0, 20),
      preferences: {
        topCategories: hints.categories,
        topAuthors: hints.authors,
        topPublishers: hints.publishers,
        topSubjects: hints.subjects,
        topShelfLocations: hints.shelfLocations,
        topDdcPrefixes: hints.ddcPrefixes
      },
      analysis: {
        totalBooksAnalyzed: books.length,
        userHistoryCount: userHistory.length,
        recommendationCount: rankedBooks.length,
        lastUpdated: new Date().toISOString(),
        source: 'fallback',
        userId: user.id,
        averageMatchPercentage: rankedBooks.length > 0 ? Math.round(rankedBooks.reduce((sum, book) => sum + book.matchPercentage, 0) / rankedBooks.length) : 0
      }
    };
  } catch (error) {
    console.error('Error getting fallback recommendations:', error);
    return { recommendations: [], preferences: {}, analysis: { source: 'error' } };
  }
}

// Get user borrowing history for better recommendations
async function getUserBorrowingHistory() {
  try {
    const user = await ApiService.getCurrentUser();
    if (!user || !user.id) {
      console.warn('Cannot get borrowing history: No authenticated user');
      return [];
    }

    console.log(`📖 Fetching borrowing history for user: ${user.id}`);

    const response = await fetch(`${ApiService.API_BASE}/api/borrow-transactions?userId=${user.id}`, {
      method: 'GET',
      headers: await ApiService.getAuthHeaders(),
    });

    if (!response.ok) {
      console.log('Could not fetch borrowing history, using local hints only');
      return [];
    }

    const data = await response.json();
    if (!data.success) return [];

    const history = data.data || [];
    console.log(`📚 Found ${history.length} borrowing history items for user ${user.id}`);
    return history;
  } catch (error) {
    console.error('Error fetching user borrowing history:', error);
    return [];
  }
}

// Log user interaction for better recommendations
export async function logUserInteraction(interaction) {
  try {
    await logAction({
      type: interaction.type,
      bookId: interaction.bookId,
      title: interaction.title,
      category: interaction.category,
      author: interaction.author,
      publisher: interaction.publisher,
      subject: interaction.subject,
      shelfLocation: interaction.shelfLocation,
      ddcClassification: interaction.ddcClassification,
      publicationYear: interaction.publicationYear,
      rating: interaction.rating,
      duration: interaction.duration
    });
  } catch (error) {
    console.error('Error logging user interaction:', error);
  }
}

// Clear recommendation data for a specific user (useful for logout)
export async function clearUserRecommendationData(userId) {
  try {
    if (!userId) {
      console.warn('Cannot clear recommendation data: No user ID provided');
      return;
    }

    const userKey = `${KEY}_${userId}`;
    await AsyncStorage.removeItem(userKey);
    console.log(`🗑️ Cleared recommendation data for user: ${userId}`);
  } catch (error) {
    console.error('Error clearing user recommendation data:', error);
  }
}

// Clear all recommendation data (useful for logout or data cleanup)
export async function clearAllRecommendationData() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const recoKeys = keys.filter(key => key.startsWith(KEY));
    
    if (recoKeys.length > 0) {
      await AsyncStorage.multiRemove(recoKeys);
      console.log(`🗑️ Cleared ${recoKeys.length} recommendation data entries`);
    }
  } catch (error) {
    console.error('Error clearing all recommendation data:', error);
  }
}


