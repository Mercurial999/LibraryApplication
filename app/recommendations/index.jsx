import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';

const categories = ['Fiction', 'Non-Fiction', 'Academic', 'Reference'];

const recommendations = [
  { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', coverUrl: '', ddc: '813.52', shelf: 'F-FIT', status: 'Available', description: 'A classic American novel about the Jazz Age and the American Dream.' },
  { id: 2, title: 'To Kill a Mockingbird', author: 'Harper Lee', coverUrl: '', ddc: '813.54', shelf: 'F-LEE', status: 'Available', description: 'A powerful story about racial injustice and moral growth in the American South.' },
  { id: 3, title: '1984', author: 'George Orwell', coverUrl: '', ddc: '823.912', shelf: 'F-ORW', status: 'Borrowed', description: 'A dystopian novel about totalitarianism and surveillance society.' },
  { id: 4, title: 'Pride and Prejudice', author: 'Jane Austen', coverUrl: '', ddc: '823.7', shelf: 'F-AUS', status: 'Available', description: 'A romantic novel of manners set in Georgian-era England.' },
  { id: 5, title: 'The Hobbit', author: 'J.R.R. Tolkien', coverUrl: '', ddc: '823.912', shelf: 'F-TOL', status: 'Available', description: 'A fantasy novel about a hobbit\'s journey to reclaim treasure.' },
  { id: 6, title: 'Encyclopedia Britannica', author: 'Various', coverUrl: '', ddc: '031', shelf: 'REF-ENC', status: 'Available', description: 'Comprehensive reference work covering all branches of knowledge.' },
  { id: 7, title: 'Mathematics: A Very Short Introduction', author: 'Timothy Gowers', coverUrl: '', ddc: '510', shelf: 'AC-MAT', status: 'Available', description: 'An accessible introduction to the fundamental concepts of mathematics.' },
  { id: 8, title: 'The Art of War', author: 'Sun Tzu', coverUrl: '', ddc: '355.02', shelf: 'NF-MIL', status: 'Available', description: 'Ancient Chinese text on military strategy and tactics.' },
];

const RecommendationsScreen = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const router = useRouter();

  // Filter recommendations based on selected category
  const filteredRecommendations = recommendations.filter(book => {
    if (selectedCategory === 'Fiction') {
      return book.ddc.startsWith('8') || book.ddc.startsWith('F');
    } else if (selectedCategory === 'Non-Fiction') {
      return !book.ddc.startsWith('8') && !book.ddc.startsWith('F');
    } else if (selectedCategory === 'Academic') {
      return book.ddc.startsWith('3') || book.ddc.startsWith('5') || book.ddc.startsWith('6') || book.ddc.startsWith('7');
    } else if (selectedCategory === 'Reference') {
      return book.ddc.startsWith('0') || book.ddc.startsWith('REF');
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <Header 
        title="Recommended Books"
        subtitle="Discover books tailored for you"
        onMenuPress={() => setSidebarVisible(true)}
      />
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)}
        currentRoute="/recommendations"
      />
      <View style={styles.content}>
        <View style={styles.categoryRow}>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <FlatList
          data={filteredRecommendations}
          renderItem={({ item }) => (
            <View style={styles.bookCard}>
              <Text style={styles.bookTitle}>{item.title}</Text>
              <Text style={styles.bookAuthor}>by {item.author}</Text>
              <Text style={styles.bookDescription}>{item.description}</Text>
              <View style={styles.bookInfo}>
                <Text style={styles.bookInfoText}>DDC: {item.ddc}</Text>
                <Text style={styles.bookInfoText}>Shelf: {item.shelf}</Text>
                <View style={[
                  styles.statusBadge,
                  item.status === 'Available' ? styles.statusAvailable : styles.statusBorrowed
                ]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No books available in {selectedCategory}</Text>
              <Text style={styles.emptyStateSubtext}>Try selecting a different category</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  categoryRow: { flexDirection: 'row', marginBottom: 20 },
  categoryButton: { flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#eee' },
  categoryButtonActive: { borderBottomColor: '#3498db' },
  categoryText: { color: '#666' },
  categoryTextActive: { color: '#3498db', fontWeight: 'bold' },
  bookCard: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 16 },
  bookTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  bookAuthor: { fontSize: 14, color: '#666', marginBottom: 4 },
  bookDescription: { fontSize: 14, color: '#888', lineHeight: 20 },
  bookInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' },
  bookInfoText: { fontSize: 12, color: '#555' },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  statusAvailable: { backgroundColor: '#e0f2f7', borderColor: '#a7dbd8', borderWidth: 1 },
  statusBorrowed: { backgroundColor: '#fdeff0', borderColor: '#f5b7b1', borderWidth: 1 },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default RecommendationsScreen;