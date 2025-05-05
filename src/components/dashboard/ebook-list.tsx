import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileObject } from '@supabase/storage-js';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth } from '@/lib/firebase';

interface EbookMetadata {
  title: string;
  description: string;
  price: number;
  filename: string;
}

interface Ebook {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: string;
  coverUrl: string | null;
  metadata: EbookMetadata;
}

export default function EbookList() {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEbooks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch metadata first
      const { data: metadata, error: metadataError } = await supabase
        .from('ebooks_metadata')
        .select('*');

      if (metadataError) {
        console.error('Error fetching metadata:', metadataError);
        throw metadataError;
      }

      console.log('Fetched metadata:', metadata);

      if (!metadata || metadata.length === 0) {
        setEbooks([]);
        return;
      }

      // Get list of filenames from metadata
      const filenames = metadata.map(m => m.filename);

      // Fetch PDFs that match our metadata with retry logic
      let pdfs: any[] = [];
      try {
        const { data: pdfData, error: pdfError } = await supabase.storage
          .from('store-assets')
          .list('pdfs', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (pdfError) {
          console.error('Error fetching PDFs:', pdfError);
          // Continue with empty PDFs array instead of throwing
        } else {
          pdfs = pdfData || [];
        }
      } catch (err) {
        console.error('Error fetching PDFs:', err);
        // Continue with empty PDFs array
      }

      // Fetch covers with retry logic
      let covers: any[] = [];
      try {
        const { data: coverData, error: coverError } = await supabase.storage
          .from('store-assets')
          .list('covers', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (coverError) {
          console.error('Error fetching covers:', coverError);
          // Continue with empty covers array instead of throwing
        } else {
          covers = coverData || [];
        }
      } catch (err) {
        console.error('Error fetching covers:', err);
        // Continue with empty covers array
      }

      // Create a map of metadata by filename for quick lookup
      const metadataMap = new Map(metadata.map(m => [m.filename, m]));

      // Combine PDFs with their covers and metadata
      const combinedEbooks = pdfs
        .filter(pdf => {
          // Only include PDFs that have corresponding metadata
          return metadataMap.has(pdf.name);
        })
        .map(pdf => {
          const cover = covers.find(c => c.name === pdf.name);
          const ebookMetadata = metadataMap.get(pdf.name);

          if (!ebookMetadata) {
            console.warn(`No metadata found for PDF: ${pdf.name}`);
            return null;
          }

          return {
            id: pdf.id,
            name: pdf.name,
            path: pdf.name,
            size: (pdf.metadata?.size || 0) / (1024 * 1024), // Convert to MB
            type: 'application/pdf',
            lastModified: new Date(pdf.created_at).toLocaleDateString(),
            coverUrl: cover ? supabase.storage.from('store-assets').getPublicUrl(`covers/${cover.name}`).data.publicUrl : null,
            metadata: {
              title: ebookMetadata.title,
              description: ebookMetadata.description,
              price: ebookMetadata.price,
              filename: ebookMetadata.filename
            }
          };
        })
        .filter((ebook): ebook is Ebook => ebook !== null);

      console.log('Combined ebooks:', combinedEbooks);
      setEbooks(combinedEbooks);
    } catch (err) {
      console.error('Error fetching ebooks:', err);
      setError('Failed to load ebooks. Please try again later.');
      toast.error('Failed to load ebooks. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ebook: Ebook) => {
    if (!confirm('Are you sure you want to delete this ebook?')) return;

    try {
      // Remove the item from the UI immediately
      setEbooks(prevEbooks => prevEbooks.filter(e => e.name !== ebook.name));

      // First check if the metadata exists
      const { data: checkData, error: checkError } = await supabase
        .from('ebooks_metadata')
        .select('*')
        .eq('filename', ebook.name);

      if (checkError) {
        console.error('Error checking metadata:', checkError);
      } else {
        console.log('Found metadata before deletion:', checkData);
      }

      // Delete the metadata
      const { data: deleteData, error: metadataError } = await supabase
        .from('ebooks_metadata')
        .delete()
        .eq('filename', ebook.name)
        .select();

      if (metadataError) {
        console.error('Error deleting metadata:', metadataError);
        // If metadata deletion fails, restore the item in the UI
        setEbooks(prevEbooks => [...prevEbooks, ebook]);
        throw metadataError;
      }

      console.log('Deleted metadata:', deleteData);

      // Then delete the PDF file from storage
      const { error: pdfError } = await supabase.storage
        .from('store-assets')
        .remove([`pdfs/${ebook.name}`]);

      if (pdfError) {
        console.error('Error deleting PDF:', pdfError);
        // If PDF deletion fails, restore the item in the UI
        setEbooks(prevEbooks => [...prevEbooks, ebook]);
        throw pdfError;
      }

      // Finally delete the cover image if it exists
      if (ebook.coverUrl) {
        const { error: coverError } = await supabase.storage
          .from('store-assets')
          .remove([`covers/${ebook.name}`]);

        if (coverError) {
          console.error('Error deleting cover:', coverError);
          // If cover deletion fails, restore the item in the UI
          setEbooks(prevEbooks => [...prevEbooks, ebook]);
          throw coverError;
        }
      }

      // Verify the deletion
      const { data: verifyData, error: verifyError } = await supabase
        .from('ebooks_metadata')
        .select('*')
        .eq('filename', ebook.name);

      if (verifyError) {
        console.error('Error verifying deletion:', verifyError);
      } else {
        console.log('Metadata after deletion:', verifyData);
        if (verifyData && verifyData.length > 0) {
          console.error('Metadata still exists after deletion!', verifyData);
        }
      }

      toast.success('Ebook deleted successfully');
      // Force a refresh of the list
      await fetchEbooks();
    } catch (error) {
      console.error('Error deleting ebook:', error);
      toast.error('Failed to delete ebook');
      // If there was an error, refresh the list to ensure consistency
      await fetchEbooks();
    }
  };

  useEffect(() => {
    fetchEbooks();
  }, []);

  if (loading) {
    return <div>Loading ebooks...</div>;
  }

  if (ebooks.length === 0) {
    return <div>No ebooks found</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {ebooks.map((ebook) => (
        <div key={ebook.id} className="bg-white rounded-lg shadow-md h-[480px] flex flex-col">
          <div className="relative h-[300px] w-full">
            <img
              src={ebook.coverUrl || ''}
              alt={ebook.metadata.title}
              className="absolute inset-0 w-full h-full object-cover rounded-t-lg"
            />
          </div>
          <div className="p-4 flex flex-col flex-1">
            <h3 className="text-lg font-semibold truncate mb-1" title={ebook.metadata.title}>
              {ebook.metadata.title}
            </h3>
            <p className="text-gray-600 text-sm truncate mb-2" title={ebook.metadata.description}>
              {ebook.metadata.description}
            </p>
            <div className="mt-auto">
              <p className="text-primary font-semibold mb-2">${ebook.metadata.price.toFixed(2)}</p>
              <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                <span>{ebook.size.toFixed(2)} MB</span>
                <span>{ebook.lastModified}</span>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => window.open(supabase.storage.from('store-assets').getPublicUrl(`pdfs/${ebook.name}`).data.publicUrl, '_blank')}
                  className="p-2 text-gray-600 hover:text-primary transition-colors"
                >
                  <Eye size={20} />
                </button>
                <button
                  onClick={() => {/* TODO: Implement edit functionality */}}
                  className="p-2 text-gray-600 hover:text-primary transition-colors"
                >
                  <Edit size={20} />
                </button>
                <button
                  onClick={() => handleDelete(ebook)}
                  className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 