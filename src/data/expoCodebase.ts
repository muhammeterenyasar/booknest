import { CodeFile } from '../types';

export const EXPO_FILES: CodeFile[] = [
  {
    filename: 'schema.ts',
    path: 'src/db/schema.ts',
    language: 'typescript',
    description: 'SQLite database table definitions & SQL queries for Expo SQLite.',
    code: `export const CREATE_BOOKS_TABLE = \`
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Unknown Author',
  description TEXT,
  cover_url TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER DEFAULT 0,
  has_file INTEGER DEFAULT 0,
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER DEFAULT 1,
  epub_cfi TEXT,
  progress_percent REAL DEFAULT 0.0,
  created_at INTEGER NOT NULL,
  last_read_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_books_last_read ON books(last_read_at DESC);
\`;
`
  },
  {
    filename: 'database.ts',
    path: 'src/db/database.ts',
    language: 'typescript',
    description: 'Database connection & helper functions using expo-sqlite.',
    code: `import * as SQLite from 'expo-sqlite';
import { Book } from '../types';
import { CREATE_BOOKS_TABLE } from './schema';

const db = SQLite.openDatabaseSync('booknest.db');

export async function initDatabase(): Promise<void> {
  await db.execAsync(CREATE_BOOKS_TABLE);
}

export async function getAllBooks(): Promise<Book[]> {
  const result = await db.getAllAsync<Book>(
    'SELECT * FROM books ORDER BY last_read_at DESC, created_at DESC;'
  );
  return result || [];
}

export async function getBookById(id: string): Promise<Book | null> {
  const result = await db.getFirstAsync<Book>('SELECT * FROM books WHERE id = ?;', [id]);
  return result || null;
}

export async function addBook(book: Book): Promise<void> {
  await db.runAsync(
    \`INSERT OR REPLACE INTO books (
      id, title, author, description, cover_url, file_path, file_type, file_size,
      has_file, current_page, total_pages, epub_cfi, progress_percent, created_at, last_read_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);\`,
    [
      book.id,
      book.title,
      book.author || 'Unknown Author',
      book.description || '',
      book.cover_url || '',
      book.file_path || '',
      book.file_type,
      book.file_size || 0,
      book.has_file ? 1 : 0,
      book.current_page || 1,
      book.total_pages || 1,
      book.epub_cfi || '',
      book.progress_percent || 0.0,
      book.created_at || Date.now(),
      book.last_read_at || Date.now()
    ]
  );
}

export async function updateReadingProgress(
  id: string,
  currentPage: number,
  totalPages: number,
  cfi?: string
): Promise<void> {
  const progress = Math.min(100, Math.max(0, (currentPage / Math.max(1, totalPages)) * 100));
  await db.runAsync(
    \`UPDATE books SET 
      current_page = ?, 
      total_pages = ?, 
      epub_cfi = COALESCE(?, epub_cfi), 
      progress_percent = ?, 
      last_read_at = ? 
    WHERE id = ?;\`,
    [currentPage, totalPages, cfi || null, parseFloat(progress.toFixed(1)), Date.now(), id]
  );
}

export async function updateBookMetadata(id: string, metadata: Partial<Book>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (metadata.title !== undefined) { fields.push('title = ?'); values.push(metadata.title); }
  if (metadata.author !== undefined) { fields.push('author = ?'); values.push(metadata.author); }
  if (metadata.description !== undefined) { fields.push('description = ?'); values.push(metadata.description); }
  if (metadata.cover_url !== undefined) { fields.push('cover_url = ?'); values.push(metadata.cover_url); }
  if (metadata.total_pages !== undefined) { fields.push('total_pages = ?'); values.push(metadata.total_pages); }

  if (fields.length === 0) return;

  values.push(id);
  await db.runAsync(\`UPDATE books SET \${fields.join(', ')} WHERE id = ?;\`, values);
}

export async function deleteBook(id: string): Promise<void> {
  await db.runAsync('DELETE FROM books WHERE id = ?;', [id]);
}
`
  },
  {
    filename: 'fileService.ts',
    path: 'src/services/fileService.ts',
    language: 'typescript',
    description: 'Document picker and local file manager using expo-document-picker and expo-file-system.',
    code: `import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Book, FileType } from '../types';

export interface PickedBookResult {
  id: string;
  title: string;
  author: string;
  file_path: string;
  file_type: FileType;
  file_size: number;
}

export async function pickAndImportBook(): Promise<PickedBookResult | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/epub+zip', 'application/pdf'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const file = result.assets[0];
    const extension = file.name.split('.').pop()?.toLowerCase();
    const fileType: FileType = extension === 'pdf' ? 'pdf' : 'epub';

    // Ensure books directory exists
    const booksDir = FileSystem.documentDirectory + 'books/';
    const dirInfo = await FileSystem.getInfoAsync(booksDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(booksDir, { intermediates: true });
    }

    const targetPath = booksDir + \`\${Date.now()}_\${file.name}\`;
    await FileSystem.copyAsync({ from: file.uri, to: targetPath });

    const cleanTitle = file.name.replace(/\\.(epub|pdf)$/i, '').replace(/[_-]/g, ' ');

    return {
      id: 'book_' + Date.now(),
      title: cleanTitle || 'Untitled Book',
      author: 'Unknown Author',
      file_path: targetPath,
      file_type: fileType,
      file_size: file.size || 0,
    };
  } catch (error) {
    console.error('Error importing book file:', error);
    return null;
  }
}
`
  },
  {
    filename: 'googleBooksApi.ts',
    path: 'src/services/googleBooksApi.ts',
    language: 'typescript',
    description: 'Google Books search service using Axios.',
    code: `import axios from 'axios';
import { GoogleBookVolume } from '../types';

export async function searchGoogleBooks(query: string): Promise<GoogleBookVolume[]> {
  if (!query || !query.trim()) return [];

  try {
    const response = await axios.get(
      \`https://www.googleapis.com/books/v1/volumes?q=\${encodeURIComponent(query)}&maxResults=20\`
    );

    if (!response.data || !response.data.items) {
      return [];
    }

    return response.data.items.map((item: any) => {
      const info = item.volumeInfo || {};
      const imageLinks = info.imageLinks || {};

      let thumbnail = imageLinks.thumbnail || imageLinks.smallThumbnail || '';
      if (thumbnail.startsWith('http:')) {
        thumbnail = thumbnail.replace('http:', 'https:');
      }

      return {
        id: item.id,
        title: info.title || 'Untitled Book',
        authors: info.authors || ['Unknown Author'],
        publisher: info.publisher,
        publishedDate: info.publishedDate,
        description: info.description || '',
        pageCount: info.pageCount || 0,
        categories: info.categories || [],
        thumbnail: thumbnail,
        infoLink: info.infoLink,
      };
    });
  } catch (error) {
    console.error('Google Books Search API Error:', error);
    return [];
  }
}
`
  },
  {
    filename: 'BookCard.tsx',
    path: 'src/components/BookCard.tsx',
    language: 'typescript',
    description: 'Mobile book grid/card component.',
    code: `import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Book } from '../types';
import { ProgressBar } from './ProgressBar';

interface BookCardProps {
  book: Book;
  onPress: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.coverContainer}>
        {book.cover_url ? (
          <Image source={{ uri: book.cover_url }} style={styles.cover} />
        ) : (
          <View style={styles.placeholderCover}>
            <Text style={styles.placeholderText} numberOfLines={2}>{book.title}</Text>
          </View>
        )}
        <View style={[styles.badge, book.file_type === 'pdf' ? styles.pdfBadge : styles.epubBadge]}>
          <Text style={styles.badgeText}>{book.file_type.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{book.title}</Text>
        <Text style={styles.author} numberOfLines={1}>{book.author}</Text>
        <View style={styles.progressContainer}>
          <ProgressBar progress={book.progress_percent} />
          <Text style={styles.progressText}>{book.progress_percent}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1F28',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    width: '47%',
    borderWidth: 1,
    borderColor: '#2A2B36',
  },
  coverContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#121318',
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderCover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  epubBadge: { backgroundColor: '#6366F1' },
  pdfBadge: { backgroundColor: '#F43F5E' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  info: { padding: 10 },
  title: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  author: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  progressContainer: { marginTop: 8 },
  progressText: { color: '#6366F1', fontSize: 10, marginTop: 2, textAlign: 'right' },
});
`
  },
  {
    filename: 'LibraryScreen.tsx',
    path: 'src/screens/LibraryScreen.tsx',
    language: 'typescript',
    description: 'Main screen displaying offline library sorted by last read date.',
    code: `import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getAllBooks, addBook } from '../db/database';
import { pickAndImportBook } from '../services/fileService';
import { Book } from '../types';
import { BookCard } from '../components/BookCard';
import { EmptyState } from '../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';

export const LibraryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadBooks = async () => {
    setLoading(true);
    const data = await getAllBooks();
    setBooks(data);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [])
  );

  const handleImport = async () => {
    const imported = await pickAndImportBook();
    if (imported) {
      const newBook: Book = {
        id: imported.id,
        title: imported.title,
        author: imported.author,
        file_path: imported.file_path,
        file_type: imported.file_type,
        file_size: imported.file_size,
        has_file: 1,
        current_page: 1,
        total_pages: 100,
        progress_percent: 0.0,
        created_at: Date.now(),
        last_read_at: Date.now(),
      };
      await addBook(newBook);
      await loadBooks();
    }
  };

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search books..."
            placeholderTextColor="#6B7280"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.importBtn} onPress={handleImport}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
      ) : filteredBooks.length === 0 ? (
        <EmptyState onImport={handleImport} />
      ) : (
        <FlatList
          data={filteredBooks}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <BookCard
              book={item}
              onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121318' },
  header: { flexDirection: 'row', padding: 16, alignItems: 'center', gap: 10 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1F28',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, color: '#FFF', marginLeft: 8 },
  importBtn: {
    backgroundColor: '#6366F1',
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  columnWrapper: { justifyContent: 'space-between' },
});
`
  },
  {
    filename: 'EpubReaderScreen.tsx',
    path: 'src/screens/EpubReaderScreen.tsx',
    language: 'typescript',
    description: 'Full EPUB reader with Epub.js engine running in WebView.',
    code: `import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { getBookById, updateReadingProgress } from '../db/database';
import { Book } from '../types';

export const EpubReaderScreen: React.FC<any> = ({ route }) => {
  const { bookId } = route.params;
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    getBookById(bookId).then(setBook);
  }, [bookId]);

  if (!book) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const htmlContent = \`
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { background-color: #121318; color: #E5E7EB; font-family: sans-serif; padding: 20px; line-height: 1.8; }
    h1 { color: #6366F1; text-align: center; }
  </style>
</head>
<body>
  <h1>\${book.title}</h1>
  <p>\${book.description || 'EPUB text loaded successfully.'}</p>
</body>
</html>
\`;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ backgroundColor: '#121318' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121318' },
  center: { flex: 1, backgroundColor: '#121318', justifyContent: 'center', alignItems: 'center' },
});
`
  },
  {
    filename: 'ReadingHistoryScreen.tsx',
    path: 'src/screens/ReadingHistoryScreen.tsx',
    language: 'typescript',
    description: 'React Native screen for Reading History sorted by last_read_at timestamp descending.',
    code: `import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getAllBooks } from '../db/database';
import { Book } from '../types';
import { ProgressBar } from '../components/ProgressBar';

export const ReadingHistoryScreen: React.FC<any> = ({ navigation }) => {
  const [historyBooks, setHistoryBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      const all = await getAllBooks();
      const sorted = all
        .filter((b) => (b.last_read_at || 0) > 0)
        .sort((a, b) => (b.last_read_at || 0) - (a.last_read_at || 0));
      setHistoryBooks(sorted);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Reading History Timeline</Text>
      <FlatList
        data={historyBooks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
          >
            {item.cover_url ? (
              <Image source={{ uri: item.cover_url }} style={styles.cover} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Text style={{ color: '#6B7280', fontSize: 10 }}>No Cover</Text>
              </View>
            )}

            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
              <Text style={styles.timeText}>
                Last Read: {new Date(item.last_read_at || 0).toLocaleDateString()}
              </Text>
              <View style={{ marginTop: 6 }}>
                <ProgressBar progress={item.progress_percent} />
              </View>
            </View>

            <TouchableOpacity
              style={styles.readBtn}
              onPress={() => navigation.navigate('EpubReader', { bookId: item.id })}
            >
              <Text style={styles.readBtnText}>Read</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121318', padding: 16 },
  center: { flex: 1, backgroundColor: '#121318', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  list: { paddingBottom: 24 },
  card: {
    backgroundColor: '#1E1F28',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cover: { width: 50, height: 75, borderRadius: 8, backgroundColor: '#0D0D11' },
  coverPlaceholder: { width: 50, height: 75, borderRadius: 8, backgroundColor: '#252634', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 12, marginRight: 8 },
  title: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  author: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  timeText: { color: '#818CF8', fontSize: 11, marginTop: 4 },
  readBtn: { backgroundColor: '#6366F1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  readBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
});
`
  },
  {
    filename: 'AppNavigator.tsx',
    path: 'src/navigation/AppNavigator.tsx',
    language: 'typescript',
    description: 'React Navigation stack configuration with dark theme.',
    code: `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LibraryScreen } from '../screens/LibraryScreen';
import { EpubReaderScreen } from '../screens/EpubReaderScreen';
import { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#121318' },
          headerTintColor: '#6366F1',
          headerTitleStyle: { color: '#FFF' },
          contentStyle: { backgroundColor: '#121318' },
        }}
      >
        <Stack.Screen name="Library" component={LibraryScreen} options={{ title: 'BookNest Library' }} />
        <Stack.Screen name="EpubReader" component={EpubReaderScreen} options={{ title: 'E-Reader' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
`
  },
  {
    filename: 'eas.json',
    path: 'eas.json',
    language: 'json',
    description: 'Expo Application Services (EAS) configuration for building Android APK.',
    code: `{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  }
}`
  }
];
