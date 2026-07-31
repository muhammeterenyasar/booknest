import axios from 'axios';
import { GoogleBookVolume } from '../types';

// In-memory cache to prevent redundant API calls
const apiCache = new Map<string, GoogleBookVolume[]>();

// Curated offline fallback volumes
const FALLBACK_BOOKS: GoogleBookVolume[] = [
  {
    id: 'fallback_pride_and_prejudice',
    title: 'Pride and Prejudice',
    authors: ['Jane Austen'],
    publisher: 'T. Egerton',
    publishedDate: '1813-01-28',
    description: 'A classic romantic novel following Elizabeth Bennet and Fitzwilliam Darcy as they navigate manners, upbringing, morality, and marriage in Regency England.',
    pageCount: 432,
    categories: ['Classic Literature', 'Romance'],
    thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
    language: 'en',
  },
  {
    id: 'fallback_dune',
    title: 'Dune',
    authors: ['Frank Herbert'],
    publisher: 'Chilton Books',
    publishedDate: '1965-08-01',
    description: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family in an interstellar feudal empire.',
    pageCount: 688,
    categories: ['Sci-Fi', 'Classics'],
    thumbnail: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=600',
    language: 'en',
  },
  {
    id: 'fallback_frankenstein',
    title: 'Frankenstein',
    authors: ['Mary Shelley'],
    publisher: 'Lackington, Hughes, Harding, Mavor & Jones',
    publishedDate: '1818-01-01',
    description: 'The story of Victor Frankenstein, a young scientist who creates a sapient creature in an unorthodox scientific experiment.',
    pageCount: 280,
    categories: ['Gothic Fiction', 'Horror', 'Classic Literature'],
    thumbnail: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600',
    language: 'en',
  },
  {
    id: 'fallback_meditations',
    title: 'Meditations',
    authors: ['Marcus Aurelius'],
    publisher: 'Stoic Classics',
    publishedDate: '0180-01-01',
    description: 'A series of personal writings by Marcus Aurelius, Roman Emperor from AD 161 to 180, recording his private notes to himself and ideas on Stoic philosophy.',
    pageCount: 254,
    categories: ['Philosophy', 'Stoicism', 'Classic Literature'],
    thumbnail: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=600',
    language: 'en',
  },
  {
    id: 'fallback_1984',
    title: '1984',
    authors: ['George Orwell'],
    publisher: 'Secker & Warburg',
    publishedDate: '1949-06-08',
    description: 'A dystopian social science fiction novel and cautionary tale about totalitarianism, mass surveillance, and repressive regimentation of persons and behaviors.',
    pageCount: 328,
    categories: ['Dystopian', 'Classic Literature', 'Sci-Fi'],
    thumbnail: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600',
    language: 'en',
  },
  {
    id: 'fallback_great_gatsby',
    title: 'The Great Gatsby',
    authors: ['F. Scott Fitzgerald'],
    publisher: 'Charles Scribner\'s Sons',
    publishedDate: '1925-04-10',
    description: 'The story of the mysteriously wealthy Jay Gatsby and his love for Daisy Buchanan in Jazz Age Long Island.',
    pageCount: 208,
    categories: ['Classic Literature', 'Modern Fiction'],
    thumbnail: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600',
    language: 'en',
  },
  {
    id: 'fallback_hobbit',
    title: 'The Hobbit',
    authors: ['J.R.R. Tolkien'],
    publisher: 'George Allen & Unwin',
    publishedDate: '1937-09-21',
    description: 'The quest of home-loving Bilbo Baggins to win a share of the treasure guarded by Smaug the dragon.',
    pageCount: 310,
    categories: ['Fantasy', 'Classic Literature'],
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600',
    language: 'en',
  },
];

// Helper to search Open Library API (Free open book database & cover server)
async function searchOpenLibrary(query: string): Promise<GoogleBookVolume[]> {
  try {
    const res = await axios.get(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=15`,
      { timeout: 6000 }
    );

    if (res.data && Array.isArray(res.data.docs) && res.data.docs.length > 0) {
      return res.data.docs.map((doc: any, index: number) => {
        const coverId = doc.cover_i;
        const thumbnail = coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
          : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600';

        const rawKey = doc.key ? doc.key.replace('/works/', '') : `ol_${index}`;
        const subjects = Array.isArray(doc.subject) ? doc.subject.slice(0, 3) : ['Literature'];

        return {
          id: 'ol_' + rawKey,
          title: doc.title || 'Untitled Work',
          authors: Array.isArray(doc.author_name) ? doc.author_name : ['Unknown Author'],
          publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : 'Open Library',
          publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
          description: subjects.length > 0 ? `Genres / Topics: ${subjects.join(', ')}` : 'Classic literature record from Open Library database.',
          pageCount: doc.number_of_pages_median || 320,
          categories: subjects,
          thumbnail,
          language: Array.isArray(doc.language) ? doc.language[0] : 'en',
          infoLink: doc.key ? `https://openlibrary.org${doc.key}` : undefined,
        };
      });
    }
  } catch (err: any) {
    console.warn('OpenLibrary search note:', err.message || err);
  }
  return [];
}

export async function searchGoogleBooks(query: string): Promise<GoogleBookVolume[]> {
  const normalizedQuery = query ? query.trim().toLowerCase() : '';
  if (!normalizedQuery) return FALLBACK_BOOKS;

  // 1. Check in-memory cache
  if (apiCache.has(normalizedQuery)) {
    return apiCache.get(normalizedQuery)!;
  }

  // 2. Try Open Library API first (Unlimited free search & cover API)
  const openLibResults = await searchOpenLibrary(query);
  if (openLibResults.length > 0) {
    apiCache.set(normalizedQuery, openLibResults);
    return openLibResults;
  }

  // 3. Try Google Books API as secondary provider
  try {
    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=15`,
      { timeout: 6000 }
    );

    if (response.data && Array.isArray(response.data.items) && response.data.items.length > 0) {
      const books: GoogleBookVolume[] = response.data.items.map((item: any) => {
        const info = item.volumeInfo || {};
        const imageLinks = info.imageLinks || {};

        let thumbnail = imageLinks.thumbnail || imageLinks.smallThumbnail || '';
        if (thumbnail && thumbnail.startsWith('http:')) {
          thumbnail = thumbnail.replace('http:', 'https:');
        }

        return {
          id: item.id,
          title: info.title || 'Untitled Book',
          authors: info.authors || ['Unknown Author'],
          publisher: info.publisher,
          publishedDate: info.publishedDate,
          description: info.description || 'No description available.',
          pageCount: info.pageCount || 0,
          categories: info.categories || [],
          thumbnail: thumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600',
          language: info.language,
          infoLink: info.infoLink,
        };
      });

      apiCache.set(normalizedQuery, books);
      return books;
    }
  } catch (error: any) {
    console.warn('Google Books API note:', error.message || error);
  }

  // 4. Fallback search on curated book list if external APIs are unreachable
  const matchingFallbacks = FALLBACK_BOOKS.filter(
    (b) =>
      b.title.toLowerCase().includes(normalizedQuery) ||
      b.authors.some((a) => a.toLowerCase().includes(normalizedQuery)) ||
      b.categories.some((c) => c.toLowerCase().includes(normalizedQuery)) ||
      b.description.toLowerCase().includes(normalizedQuery)
  );

  const results = matchingFallbacks.length > 0 ? matchingFallbacks : FALLBACK_BOOKS;
  apiCache.set(normalizedQuery, results);
  return results;
}


