import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase, getCategories, createCategory, type Category } from '@/lib/supabase';
import { auth } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EbookMetadata {
  title: string;
  description: string;
  price: number;
  filename: string;
  category_id?: string | null;
}

interface EditEbookFormProps {
  ebook: {
    id: string;
    name: string;
    path: string;
    size: number;
    type: string;
    lastModified: string;
    coverUrl: string | null;
    metadata: EbookMetadata;
  };
  onEditSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditEbookForm({ ebook, onEditSuccess, onCancel }: EditEbookFormProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(ebook.metadata.title);
  const [description, setDescription] = useState(ebook.metadata.description);
  const [price, setPrice] = useState(ebook.metadata.price.toString());
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ebook.metadata.category_id || '');
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setCurrentUser(user);
      
      if (!user) {
        navigate('/signin');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('You must be logged in to edit ebooks');
      return;
    }

    try {
      setIsUploading(true);

      // Update metadata
      const { error: metadataError } = await supabase
        .from('ebooks_metadata')
        .update({
          title: title,
          description: description,
          price: parseFloat(price),
          category_id: selectedCategoryId || null
        })
        .eq('filename', ebook.name);

      if (metadataError) throw metadataError;

      // If a new cover image was selected, upload it
      if (coverImage) {
        const { error: coverError } = await supabase.storage
          .from('store-assets')
          .upload(`covers/${ebook.name}`, coverImage, { upsert: true });

        if (coverError) throw coverError;
      }

      toast.success('Ebook updated successfully');
      onEditSuccess?.();
    } catch (error) {
      console.error('Error updating ebook:', error);
      toast.error('Failed to update ebook');
    } finally {
      setIsUploading(false);
    }
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
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category (optional)
        </label>
        <select
          id="category"
          value={selectedCategoryId}
          onChange={(e) => {
            if (e.target.value === '__create_new__') {
              setCreateCategoryDialogOpen(true);
              // Reset to current selection to avoid showing "__create_new__" in the select
              setTimeout(() => {
                const select = document.getElementById('category') as HTMLSelectElement;
                if (select) select.value = selectedCategoryId || '';
              }, 0);
            } else {
              setSelectedCategoryId(e.target.value);
            }
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          disabled={!isAuthenticated || isUploading}
        >
          <option value="">No category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
          <option value="__create_new__">+ Create New Category</option>
        </select>
      </div>

      <div>
        <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700">
          Cover Image (optional)
        </label>
        <input
          type="file"
          id="coverImage"
          accept="image/*"
          onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
          disabled={!isAuthenticated || isUploading}
        />
        {ebook.coverUrl && !coverImage && (
          <div className="mt-2">
            <p className="text-sm text-gray-500">Current cover image:</p>
            <img src={ebook.coverUrl} alt="Current cover" className="mt-1 h-20 w-auto" />
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          disabled={isUploading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isAuthenticated || isUploading}
        >
          {isUploading ? 'Updating...' : 'Update eBook'}
        </button>
      </div>

      {/* Create Category Dialog */}
      <Dialog open={createCategoryDialogOpen} onOpenChange={setCreateCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Create a new category for organizing your eBooks
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newCategoryName">Category Name *</Label>
              <Input
                id="newCategoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                disabled={isCreatingCategory}
              />
            </div>
            <div>
              <Label htmlFor="newCategoryDescription">Description (optional)</Label>
              <Textarea
                id="newCategoryDescription"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Enter category description"
                rows={3}
                disabled={isCreatingCategory}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateCategoryDialogOpen(false);
                setNewCategoryName('');
                setNewCategoryDescription('');
              }}
              disabled={isCreatingCategory}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newCategoryName.trim()) {
                  toast.error('Category name is required');
                  return;
                }

                try {
                  setIsCreatingCategory(true);
                  const newCategory = await createCategory(
                    newCategoryName.trim(),
                    newCategoryDescription.trim() || undefined
                  );
                  toast.success('Category created successfully');
                  
                  // Refresh categories list
                  await fetchCategories();
                  
                  // Select the newly created category
                  setSelectedCategoryId(newCategory.id);
                  
                  // Close dialog and reset form
                  setCreateCategoryDialogOpen(false);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                } catch (error: any) {
                  console.error('Error creating category:', error);
                  toast.error(error.message || 'Failed to create category');
                } finally {
                  setIsCreatingCategory(false);
                }
              }}
              disabled={isCreatingCategory}
            >
              {isCreatingCategory ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
} 