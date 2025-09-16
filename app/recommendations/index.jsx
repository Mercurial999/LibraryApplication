import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { getFallbackRecommendations, getHints, getIntelligentRecommendations, logUserInteraction, rankRecommendations } from '../../services/RecoService';

const RecommendationsScreen = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [preferences, setPreferences] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [analysis, setAnalysis] = useState({});
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const router = useRouter();

  const loadRecommendations = async () => {
    try {
      setError(null);
      setLoading(true);
      
      let data = await getIntelligentRecommendations();
      let incoming = Array.isArray(data?.recommendations) ? data.recommendations : [];
      const prefs = data?.preferences || {};
      const analysisData = data?.analysis || {};

      // Ensure each recommendation has matchPercentage computed if backend omitted
      let recos = incoming.map((b) => ({
        ...b,
        matchPercentage: typeof b.matchPercentage === 'number' ? b.matchPercentage : (b.totalScore && b.maxPossibleScore ? Math.round((b.totalScore / b.maxPossibleScore) * 100) : 0),
      }));

      // Build hints from local usage and backend preferences to improve scoring
      const localHints = await getHints();
      const prefHints = {
        categories: prefs.topCategories || [],
        authors: prefs.topAuthors || [],
        publishers: prefs.topPublishers || [],
        subjects: prefs.topSubjects || [],
        shelfPrefixes: prefs.topShelfLocations || [],
        shelfLocations: prefs.topShelfLocations || [],
        ddcPrefixes: prefs.topDdcPrefixes || []
      };
      const merge = (a = [], b = []) => Array.from(new Set([...(a || []), ...(b || [])]));
      const mergedHints = {
        categories: merge(localHints.categories, prefHints.categories),
        authors: merge(localHints.authors, prefHints.authors),
        publishers: merge(localHints.publishers, prefHints.publishers),
        subjects: merge(localHints.subjects, prefHints.subjects),
        shelfPrefixes: merge(localHints.shelfPrefixes, prefHints.shelfPrefixes),
        shelfLocations: merge(localHints.shelfLocations, prefHints.shelfLocations),
        ddcPrefixes: merge(localHints.ddcPrefixes, prefHints.ddcPrefixes)
      };

      // If all items are 0% (or missing), re-rank using merged hints to compute percentages
      const allZero = recos.length > 0 && recos.every(b => !b.matchPercentage || b.matchPercentage === 0);
      if (allZero) {
        recos = rankRecommendations(recos, mergedHints, []);
      }

      // Final safety: if still all zero, derive a sensible fallback percentage
      const stillZero = recos.length > 0 && recos.every(b => !b.matchPercentage || b.matchPercentage === 0);
      if (stillZero) {
        recos = recos.map((b) => {
          const availableBoost = (b.availableCopies ?? 0) > 0 ? 25 : 5;
          const year = b.publicationYear ? Number(b.publicationYear) : null;
          const recencyBoost = year && !isNaN(year) ? Math.max(0, 20 - Math.min(20, (new Date().getFullYear() - year) * 2)) : 0;
          const base = 30; // base interest
          const computed = Math.min(95, base + availableBoost + recencyBoost);
          return {
            ...b,
            matchPercentage: computed,
            recommendationType: computed >= 80 ? 'Highly Recommended' : (computed >= 60 ? 'Strong Match' : (computed >= 40 ? 'Good Match' : 'Suggested'))
          };
        });
      }

      // As a final fallback, if still empty, use local fallback recos
      if (recos.length === 0) {
        const fb = await getFallbackRecommendations();
        recos = rankRecommendations(fb.recommendations || [], mergedHints, []);
        data = { ...data, analysis: fb.analysis, preferences: fb.preferences };
      }

      setRecommendations(recos);
      setPreferences(data.preferences || prefs || {});
      setAnalysis(data.analysis || analysisData || {});
      
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError(err.message || 'Failed to load recommendations');
      setRecommendations([]);
      setPreferences({});
      setAnalysis({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecommendations(); }, []);
  useFocusEffect(React.useCallback(() => { loadRecommendations(); return () => {}; }, []));

  const onRefresh = () => { 
    setRefreshing(true); 
    loadRecommendations().finally(() => setTimeout(() => setRefreshing(false), 500)); 
  };

  const handleBookInteraction = async (book, action) => {
    try {
      await logUserInteraction({
        type: action,
        bookId: book.id,
        title: book.title,
        category: book.category,
        author: book.author,
        publisher: book.publisher,
        subject: book.subject,
        shelfLocation: book.shelfLocation,
        ddcClassification: book.ddcClassification,
        publicationYear: book.publicationYear
      });
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  };

  const getRecommendationTypeColor = (type, percentage) => {
    // Use percentage for more accurate color coding
    if (percentage >= 80) return '#10b981'; // Green for highly recommended
    if (percentage >= 60) return '#3b82f6'; // Blue for strong match
    if (percentage >= 40) return '#8b5cf6'; // Purple for good match
    if (percentage >= 20) return '#f59e0b'; // Orange for suggested
    return '#6b7280'; // Gray for low match
  };

  const getRecommendationTypeIcon = (type, percentage) => {
    // Use percentage for more accurate icon selection
    if (percentage >= 80) return 'star';
    if (percentage >= 60) return 'thumb-up';
    if (percentage >= 40) return 'check-circle';
    if (percentage >= 20) return 'lightbulb';
    return 'book';
  };

  let filteredRecommendations = recommendations.filter(book => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'available') return book.availableCopies > 0;
    if (activeFilter === 'highly-recommended') return (book.matchPercentage || 0) >= 80; // Top picks
    if (selectedCategory && book.category !== selectedCategory) return false;
    return true;
  });

  // If Top Picks is empty at 80%, relax to 60% so users see strong matches
  if (activeFilter === 'highly-recommended' && filteredRecommendations.length === 0) {
    filteredRecommendations = recommendations.filter(b => (b.matchPercentage || 0) >= 60);
  }

  const getTopCategories = () => {
    if (preferences.topCategories) {
      return preferences.topCategories.map(item => 
        typeof item === 'string' ? item : item.category
      ).slice(0, 5);
    }
    return [];
  };

  const getTopAuthors = () => {
    if (preferences.topAuthors) {
      return preferences.topAuthors.map(item => 
        typeof item === 'string' ? item : item.author
      ).slice(0, 5);
    }
    return [];
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Recommended for You"
        subtitle="Intelligent suggestions based on your reading patterns"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/recommendations"
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Analysis Summary */}
        {analysis && Object.keys(analysis).length > 0 && (
          <View style={styles.analysisCard}>
            <View style={styles.analysisHeader}>
              <MaterialCommunityIcons name="chart-line" size={20} color="#3b82f6" />
              <Text style={styles.analysisTitle}>Your Reading Analysis</Text>
            </View>
            <View style={styles.analysisStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{analysis.userHistoryCount || 0}</Text>
                <Text style={styles.statLabel}>Books Borrowed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{analysis.recommendationCount || 0}</Text>
                <Text style={styles.statLabel}>Recommendations</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{analysis.averageMatchPercentage || 0}%</Text>
                <Text style={styles.statLabel}>Avg Match</Text>
              </View>
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <TouchableOpacity 
            style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterTab, activeFilter === 'available' && styles.filterTabActive]}
            onPress={() => setActiveFilter('available')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'available' && styles.filterTabTextActive]}>Available</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterTab, activeFilter === 'highly-recommended' && styles.filterTabActive]}
            onPress={() => setActiveFilter('highly-recommended')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'highly-recommended' && styles.filterTabTextActive]}>Top Picks</Text>
          </TouchableOpacity>
        </View>

        {/* Category Filters */}
        {getTopCategories().length > 0 && (
          <View style={styles.categorySection}>
            <Text style={styles.sectionTitle}>Your Favorite Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {getTopCategories().map((category) => (
                <TouchableOpacity 
                  key={category} 
                  style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]} 
                  onPress={() => setSelectedCategory(selectedCategory === category ? null : category)}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recommendations List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Analyzing your reading patterns...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#ef4444" />
            <Text style={styles.emptyStateText}>Unable to load recommendations</Text>
            <Text style={styles.emptyStateSubtext}>{error}</Text>
          </View>
        ) : (
          <View style={styles.recommendationsList}>
            {filteredRecommendations.map((book) => (
              <View key={book.id} style={styles.bookCard}>
                <View style={styles.bookHeader}>
                  <View style={styles.bookTitleContainer}>
                    <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                    <Text style={styles.bookAuthor}>by {book.author}</Text>
                  </View>
                  {book.recommendationType && (
                    <View style={[styles.recommendationBadge, { backgroundColor: getRecommendationTypeColor(book.recommendationType, book.matchPercentage) }]}>
                      <MaterialCommunityIcons 
                        name={getRecommendationTypeIcon(book.recommendationType, book.matchPercentage)} 
                        size={12} 
                        color="#ffffff" 
                      />
                      <Text style={styles.recommendationBadgeText}>
                        {book.matchPercentage ? `${book.matchPercentage}% Match` : book.recommendationType}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.bookMeta}>
                  {book.category && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{book.category}</Text>
                    </View>
                  )}
                  <View style={[styles.availabilityBadge, book.availableCopies > 0 ? styles.availableBadge : styles.unavailableBadge]}>
                    <MaterialCommunityIcons 
                      name={book.availableCopies > 0 ? 'check-circle' : 'close-circle'} 
                      size={12} 
                      color={book.availableCopies > 0 ? '#10b981' : '#ef4444'} 
                    />
                    <Text style={[styles.availabilityBadgeText, { color: book.availableCopies > 0 ? '#10b981' : '#ef4444' }]}>
                      {book.availableCopies > 0 ? 'Available' : 'Unavailable'}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookDetails}>
                  <View style={styles.bookDetailItem}>
                    <MaterialCommunityIcons name="bookshelf" size={14} color="#6b7280" />
                    <Text style={styles.bookDetailText}>{book.shelfLocation || 'N/A'}</Text>
                  </View>
                  <View style={styles.bookDetailItem}>
                    <MaterialCommunityIcons name="tag" size={14} color="#6b7280" />
                    <Text style={styles.bookDetailText}>{book.ddcClassification || '—'}</Text>
                  </View>
                </View>

                {book.recommendationReasons && book.recommendationReasons.length > 0 && (
                  <View style={styles.recommendationReasons}>
                    <Text style={styles.reasonsTitle}>Why we recommend this ({book.matchPercentage}% match):</Text>
                    {book.recommendationReasons.slice(0, 3).map((reason, index) => (
                      <Text key={index} style={styles.reasonText}>• {reason}</Text>
                    ))}
                    {book.matchFactors && book.matchFactors.length > 0 && (
                      <View style={styles.matchBreakdown}>
                        <Text style={styles.matchBreakdownTitle}>Match breakdown:</Text>
                        {book.matchFactors.map((factor, index) => (
                          <Text key={index} style={styles.matchFactorText}>
                            {factor.factor}: +{factor.weight}% ({factor.matched})
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.bookActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.primaryActionButton]}
                    onPress={() => {
                      handleBookInteraction(book, 'view');
                      router.push(`/book-catalog/details?id=${book.id}`);
                    }}
                  >
                    <MaterialCommunityIcons name="eye" size={16} color="#ffffff" />
                    <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {!loading && !error && filteredRecommendations.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="book-open-variant" size={48} color="#6b7280" />
            <Text style={styles.emptyStateText}>No recommendations found</Text>
            <Text style={styles.emptyStateSubtext}>
              {recommendations.length === 0 
                ? "Start borrowing or reserving books to get personalized recommendations based on your reading patterns."
                : "Try adjusting your filters to see more recommendations."
              }
            </Text>
            {analysis.userHistoryCount === 0 && (
              <View style={styles.newUserTip}>
                <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#3b82f6" />
                <Text style={styles.newUserTipText}>
                  As a new user, explore our book catalog to discover books you might enjoy!
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  content: { 
    flex: 1, 
    padding: 16 
  },
  
  // Analysis Card
  analysisCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  analysisStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },

  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },

  // Category Section
  categorySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },

  // Book Cards
  recommendationsList: {
    paddingBottom: 20,
  },
  bookCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 24,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  recommendationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 4,
  },

  // Book Meta
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#eef2ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3730a3',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  availableBadge: {
    backgroundColor: '#dcfce7',
  },
  unavailableBadge: {
    backgroundColor: '#fee2e2',
  },
  availabilityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Book Details
  bookDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bookDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookDetailText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
    fontWeight: '500',
  },

  // Recommendation Reasons
  recommendationReasons: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  reasonsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
    marginBottom: 2,
  },
  matchBreakdown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  matchBreakdownTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  matchFactorText: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 14,
    marginBottom: 1,
  },

  // Book Actions
  bookActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  primaryActionButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 6,
  },
  primaryActionButtonText: {
    color: '#ffffff',
  },

  // Loading and Empty States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  newUserTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  newUserTipText: {
    fontSize: 12,
    color: '#1e40af',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
});

export default RecommendationsScreen;