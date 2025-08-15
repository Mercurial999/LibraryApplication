import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';

const categories = ['Category1', 'Category2', 'Category3'];

const recommendedBooks = [
  { id: 1, title: 'Book Title 1', author: 'Author Name', coverUrl: '', ddc: '000.000', shelf: 'A-23-02', status: 'Available' },
  { id: 2, title: 'Book Title 2', author: 'Author Name', coverUrl: '', ddc: '000.000', shelf: 'A-23-03', status: 'Available' },
  { id: 3, title: 'Book Title 3', author: 'Author Name', coverUrl: '', ddc: '000.000', shelf: 'A-23-04', status: 'Borrowed' },
];

export default function RecommendationsScreen() {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recommended Books</Text>
      <View style={styles.categoryRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryBtn, selectedCategory === cat && styles.categorySelected]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={selectedCategory === cat ? styles.categoryTextSelected : styles.categoryText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={recommendedBooks}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookCard}
            onPress={() => router.push({ pathname: '/recommendations/details', params: { id: item.id } })}
          >
            <View style={styles.coverPlaceholder} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bookTitle}>{item.title}</Text>
              <Text style={styles.bookAuthor}>{item.author}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  categoryRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  categoryBtn: { padding: 8, marginHorizontal: 4, borderRadius: 16, backgroundColor: '#f0f0f0' },
  categorySelected: { backgroundColor: '#3498db' },
  categoryText: { color: '#555' },
  categoryTextSelected: { color: '#fff', fontWeight: 'bold' },
  bookCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', marginBottom: 12, padding: 12, borderRadius: 8 },
  coverPlaceholder: { width: 48, height: 64, backgroundColor: '#ddd', borderRadius: 4, marginRight: 12 },
  bookTitle: { fontWeight: 'bold', fontSize: 16 },
  bookAuthor: { color: '#888' },
});