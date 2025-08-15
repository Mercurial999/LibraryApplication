import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Book from '../../bookModels/book';
import { useRouter } from 'expo-router';

// Dummy data for demonstration
const initialBooks = [
  new Book(1, 'Example Book 1', 'Author 1', 'Subject 1', '000.000', 'A-3-02', 'Available: 1 copy'),
  new Book(2, 'Example Book 2', 'Author 2', 'Subject 2', '001.000', 'A-3-03', 'Unavailable'),
  new Book(3, 'Example Book 3', 'Author 3', 'Subject 3', '002.000', 'A-3-04', 'Available: 1 copy'),
];

const BookCatalogScreen = () => {
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('title');
  const [books, setBooks] = useState(initialBooks);
  const router = useRouter();

  // Filter books based on search and filterBy
  const filteredBooks = books.filter(book => {
    const value = book[filterBy]?.toLowerCase() || '';
    return value.includes(search.toLowerCase());
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>OPAC Catalog</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={`Search by ${filterBy}...`}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.filterRow}>
          {['title', 'author', 'subject', 'ddc'].map(key => (
            <TouchableOpacity
              key={key}
              style={[styles.filterButton, filterBy === key && styles.filterButtonActive]}
              onPress={() => setFilterBy(key)}
            >
              <Text style={filterBy === key ? styles.filterTextActive : styles.filterText}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList
        data={filteredBooks}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookCard}
            onPress={() => router.push({ pathname: '/book-catalog/details', params: { id: item.id } })}
          >
            <Text style={styles.bookTitle}>{item.title}</Text>
            <Text style={styles.bookAuthor}>{item.author}</Text>
            <Text style={item.availability.includes('Available') ? styles.available : styles.unavailable}>
              {item.availability}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  searchRow: { marginBottom: 10 },
  searchInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  filterButton: { padding: 8, borderRadius: 8, backgroundColor: '#eee', marginRight: 5 },
  filterButtonActive: { backgroundColor: '#3498db' },
  filterText: { color: '#333' },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  bookCard: { padding: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10 },
  bookTitle: { fontWeight: 'bold', fontSize: 16 },
  bookAuthor: { color: '#555' },
  available: { color: 'green', marginTop: 5 },
  unavailable: { color: 'red', marginTop: 5 },
});

export default BookCatalogScreen;