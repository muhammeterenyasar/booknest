import { Book } from '../types';

// Sample pre-seeded public domain books with working readable EPUB text or metadata
export const INITIAL_SAMPLE_BOOKS: Book[] = [
  {
    id: 'sample-pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    description: 'A romantic novel of manners written by Jane Austen in 1813. The story follows the main character, Elizabeth Bennet, as she deals with issues of manners, upbringing, morality, education, and marriage in the society of the landed gentry of the British Regency.',
    cover_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600',
    file_type: 'epub',
    file_size: 1420500,
    has_file: 1,
    current_page: 18,
    total_pages: 350,
    progress_percent: 5.1,
    created_at: Date.now() - 86400000 * 5,
    last_read_at: Date.now() - 3600000 * 2,
  },
  {
    id: 'sample-frankenstein',
    title: 'Frankenstein; or, The Modern Prometheus',
    author: 'Mary Shelley',
    description: 'Frankenstein tells the story of Victor Frankenstein, a young scientist who creates a sapient creature in an unorthodox scientific experiment.',
    cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600',
    file_type: 'epub',
    file_size: 980200,
    has_file: 1,
    current_page: 42,
    total_pages: 280,
    progress_percent: 15.0,
    created_at: Date.now() - 86400000 * 3,
    last_read_at: Date.now() - 3600000 * 12,
  },
  {
    id: 'sample-gatsby',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    description: 'Set in the Jazz Age on Long Island, near New York City, the novel depicts first-person narrator Nick Carraway\'s interactions with mysterious millionaire Jay Gatsby and Gatsby\'s obsession to reunite with his former lover, Daisy Buchanan.',
    cover_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600',
    file_type: 'pdf',
    file_size: 2150000,
    has_file: 1,
    current_page: 1,
    total_pages: 180,
    progress_percent: 0.5,
    created_at: Date.now() - 86400000 * 1,
    last_read_at: Date.now() - 3600000 * 24,
  }
];

// Default sample EPUB content generated as a lightweight minimal EPUB data URL or fallback HTML string
export const SAMPLE_EPUB_CONTENT = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Pride and Prejudice - Chapter 1</title>
<style>
  body { font-family: Georgia, serif; line-height: 1.8; padding: 20px; color: #333; }
  h1 { text-align: center; color: #1a1a1a; margin-bottom: 2em; }
  p { text-indent: 1.5em; margin-bottom: 1em; font-size: 1.1em; }
</style>
</head>
<body>
<h1>Chapter I</h1>
<p>It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.</p>
<p>However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.</p>
<p>"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"</p>
<p>Mr. Bennet replied that he had not.</p>
<p>"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."</p>
<p>Mr. Bennet made no answer.</p>
<p>"Do you not want to know who has taken it?" cried his wife impatiently.</p>
<p>"You want to tell me, and I have no objection to hearing it."</p>
<p>This was invitation enough.</p>
<p>"Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it, that he agreed with Mr. Morris immediately; that he is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week."</p>
</body>
</html>
`;
