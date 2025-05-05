import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

interface UploadEbookFormProps {
  onUploadSuccess?: () => void;
}

// Function to convert Firebase UID to UUID format
const convertToUUID = (uid: string): string => {
  // Ensure the string is 32 characters long by padding with zeros if necessary
  const paddedUid = uid.padEnd(32, '0');
  // Format into UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return `${paddedUid.slice(0, 8)}-${paddedUid.slice(8, 12)}-${paddedUid.slice(12, 16)}-${paddedUid.slice(16, 20)}-${paddedUid.slice(20, 32)}`;
};

export default function UploadEbookForm({ onUploadSuccess }: UploadEbookFormProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user);
      setIsAuthenticated(!!user);
      setCurrentUser(user);
      
      if (!user) {
        console.log('No authenticated user, redirecting to sign in');
        navigate('/signin');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Add this function before handleSubmit
  const sanitizeFilename = (filename: string): string => {
    // Remove accents/diacritics
    const normalized = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Replace spaces with hyphens and remove other special characters
    return normalized
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-.]/g, '')
      .toLowerCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('You must be logged in to upload ebooks');
      return;
    }

    if (!pdfFile || !coverImage) {
      toast.error('Please select both a PDF and a cover image');
      return;
    }

    try {
      setIsUploading(true);

      // Sanitize filenames
      const sanitizedPdfName = sanitizeFilename(pdfFile.name);
      const sanitizedCoverName = sanitizeFilename(coverImage.name);

      // Check if a file with the same name already exists
      const { data: existingFiles } = await supabase.storage
        .from('store-assets')
        .list('pdfs', {
          search: sanitizedPdfName
        });

      if (existingFiles && existingFiles.length > 0) {
        toast.error('A file with this name already exists');
        return;
      }

      // Upload PDF
      const { error: pdfError } = await supabase.storage
        .from('store-assets')
        .upload(`pdfs/${sanitizedPdfName}`, pdfFile);

      if (pdfError) throw pdfError;

      // Upload cover
      const { error: coverError } = await supabase.storage
        .from('store-assets')
        .upload(`covers/${sanitizedPdfName}`, coverImage);

      if (coverError) throw coverError;

      // Save metadata
      const { error: metadataError } = await supabase
        .from('ebooks_metadata')
        .insert({
          filename: sanitizedPdfName,
          title: title,
          description: description,
          price: parseFloat(price)
        });

      if (metadataError) throw metadataError;

      toast.success('Ebook uploaded successfully');
      resetForm();
      onUploadSuccess?.();
    } catch (error) {
      console.error('Error uploading ebook:', error);
      toast.error('Failed to upload ebook');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setCoverImage(null);
    setPdfFile(null);
    setError('');

    // Clear file input elements
    const coverInput = document.getElementById('coverImage') as HTMLInputElement;
    const pdfInput = document.getElementById('pdfFile') as HTMLInputElement;
    
    if (coverInput) coverInput.value = '';
    if (pdfInput) pdfInput.value = '';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          disabled={!isAuthenticated || isUploading}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          disabled={!isAuthenticated || isUploading}
        />
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
          Price
        </label>
        <input
          type="number"
          id="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          disabled={!isAuthenticated || isUploading}
        />
      </div>

      <div>
        <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700">
          Cover Image
        </label>
        <input
          type="file"
          id="coverImage"
          accept="image/*"
          onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
          disabled={!isAuthenticated || isUploading}
        />
      </div>

      <div>
        <label htmlFor="pdfFile" className="block text-sm font-medium text-gray-700">
          PDF File
        </label>
        <input
          type="file"
          id="pdfFile"
          accept=".pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
          disabled={!isAuthenticated || isUploading}
        />
      </div>

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isAuthenticated || isUploading}
      >
        {isUploading ? 'Uploading...' : 'Upload eBook'}
      </button>
    </form>
  );
} 