import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Book from '../../bookModels/book';
import { useLocalSearchParams } from 'expo-router';

// Dummy data (should be replaced with real data/fetch)
const books = [
  new Book(1, 'Example Book 1', 'Author 1', 'Subject 1', '000.000', 'A-3-02', 'Available: 1 copy'),
  new Book(2, 'Example Book 2', 'Author 2', 'Subject 2', '001.000', 'A-3-03', 'Unavailable'),
  new Book(3, 'Example Book 3', 'Author 3', 'Subject 3', '002.000', 'A-3-04', 'Available: 1 copy'),
];

const BookDetailsScreen = () => {
  const { id } = useLocalSearchParams();
  const book = books.find(b => b.id === Number(id));

  if (!book) {
    return (
      <View style={styles.container}>
        <Text>Book not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{book.title}</Text>
      <Text>Author: {book.author}</Text>
      <Text>Subject: {book.subject}</Text>
      <Text>DDC: {book.ddc}</Text>
      <Text>Shelf Loc: {book.shelfLocation}</Text>
      <Text style={book.availability.includes('Available') ? styles.available : styles.unavailable}>
        {book.availability}
      </Text>
      {/* Add more details as needed */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  available: { color: 'green', marginTop: 10 },
  unavailable: { color: 'red', marginTop: 10 },
});

export default BookDetailsScreen;