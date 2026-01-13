import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/firebase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a Supabase client with the anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Function to sync Firebase auth with Supabase
export const syncFirebaseAuthWithSupabase = async (firebaseUser: any) => {
  if (!firebaseUser) return null;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: firebaseUser.email,
    password: 'dummy-password' // This is just to satisfy the API, won't be used
  });

  if (error) {
    console.error('Error syncing auth:', error);
    return null;
  }

  return data;
};

// Function to handle file uploads
export const uploadFile = async (file: File, path: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('store-assets')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Function to insert ebook metadata
export const insertEbookMetadata = async (metadata: any) => {
  try {
    const { data, error } = await supabase
      .from('ebooks_metadata')
      .insert(metadata)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error inserting ebook metadata:', error);
    throw error;
  }
};

// Create or get Supabase user matching Firebase user
export const syncFirebaseAuth = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No Firebase user found');
    }

    const email = currentUser.email;
    if (!email) {
      throw new Error('Firebase user has no email');
    }

    // Try to sign in with email
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: 'admin123' // Use the same password you set in Supabase
    });

    if (signInError) {
      // If sign in fails, create a new user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: 'admin123', // Use the same password you set in Supabase
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) throw signUpError;
      return signUpData.user;
    }

    return signInData.user;
  } catch (error) {
    console.error('Error syncing Firebase auth with Supabase:', error);
    throw error;
  }
};

// Verify the current session
export const verifySession = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    
    if (!session) {
      // If no Supabase session exists, sync with Firebase
      return await syncFirebaseAuth();
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('No user found in session');

    return user;
  } catch (error) {
    console.error('Session verification error:', error);
    throw error;
  }
};

export const getEbooks = async () => {
  try {
    const { data, error } = await supabase
      .from('ebooks_metadata')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Add cover image URLs and category info
    const ebooksWithCoverUrls = data.map((ebook: any) => {
      // Handle category - Supabase returns it as an object for single relations
      let category = null;
      if (ebook.categories) {
        // If it's an array (shouldn't happen for many-to-one, but handle it)
        if (Array.isArray(ebook.categories) && ebook.categories.length > 0) {
          category = { id: ebook.categories[0].id, name: ebook.categories[0].name };
        } else if (typeof ebook.categories === 'object' && ebook.categories.id) {
          category = { id: ebook.categories.id, name: ebook.categories.name };
        }
      }
      
      return {
        ...ebook,
        cover_url: ebook.filename ? supabase.storage.from('store-assets').getPublicUrl(`covers/${ebook.filename}`).data.publicUrl : null,
        category: category
      };
    });

    return ebooksWithCoverUrls;
  } catch (error) {
    console.error('Error fetching ebooks:', error);
    throw error;
  }
};

export const getEbookById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('ebooks_metadata')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Ebook not found');

    // Add cover image URL and category info
    let category = null;
    if (data.categories) {
      // Handle category - Supabase returns it as an object for single relations
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        category = { id: data.categories[0].id, name: data.categories[0].name };
      } else if (typeof data.categories === 'object' && data.categories.id) {
        category = { id: data.categories.id, name: data.categories.name };
      }
    }
    
    const ebookWithCoverUrl = {
      ...data,
      cover_url: data.filename 
        ? supabase.storage.from('store-assets').getPublicUrl(`covers/${data.filename}`).data.publicUrl 
        : null,
      category: category
    };

    return ebookWithCoverUrl;
  } catch (error) {
    console.error('Error fetching ebook:', error);
    throw error;
  }
};

// Category management functions
export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const createCategory = async (name: string, description?: string): Promise<Category> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

export const updateCategory = async (id: string, name: string, description?: string): Promise<Category> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// Curiosidades (Blog Posts) management functions
export interface CuriosidadeCategory {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Curiosidade {
  id: string;
  title: string;
  author: string;
  category_id: string | null;
  category?: CuriosidadeCategory | null;
  body: string;
  status: 'draft' | 'published';
  attachments: string[];
  created_at: string;
  updated_at: string;
}

export const getCuriosidades = async (includeDrafts: boolean = false): Promise<Curiosidade[]> => {
  try {
    // First try with the join, if it fails, try without
    let query = supabase
      .from('curiosidades')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includeDrafts) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // If we have data, try to fetch categories separately
    const curiosidadesWithCategories = await Promise.all((data || []).map(async (item: any) => {
      let category = null;
      
      // Try to fetch category if category_id exists
      if (item.category_id) {
        try {
          const { data: catData, error: catError } = await supabase
            .from('curiosidades_categories')
            .select('id, name, description')
            .eq('id', item.category_id)
            .single();
          
          if (!catError && catData) {
            category = catData;
          }
        } catch (err) {
          // Category table might not exist yet, ignore
          console.warn('Could not fetch category:', err);
        }
      }
      
      return {
        ...item,
        category,
        attachments: Array.isArray(item.attachments) ? item.attachments : []
      };
    }));
    
    return curiosidadesWithCategories;
  } catch (error) {
    console.error('Error fetching curiosidades:', error);
    throw error;
  }
};

export const getCuriosidadeById = async (id: string, includeDrafts: boolean = false): Promise<Curiosidade> => {
  try {
    let query = supabase
      .from('curiosidades')
      .select('*')
      .eq('id', id);

    if (!includeDrafts) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query.single();

    if (error) throw error;
    if (!data) throw new Error('Curiosidade not found');
    
    // Try to fetch category separately
    let category = null;
    if (data.category_id) {
      try {
        const { data: catData, error: catError } = await supabase
          .from('curiosidades_categories')
          .select('id, name, description')
          .eq('id', data.category_id)
          .single();
        
        if (!catError && catData) {
          category = catData;
        }
      } catch (err) {
        // Category table might not exist yet, ignore
        console.warn('Could not fetch category:', err);
      }
    }
    
    return {
      ...data,
      category,
      attachments: Array.isArray(data.attachments) ? data.attachments : []
    };
  } catch (error) {
    console.error('Error fetching curiosidade:', error);
    throw error;
  }
};

export const createCuriosidade = async (
  title: string,
  author: string,
  category_id: string | null,
  body: string,
  status: 'draft' | 'published' = 'draft',
  attachments: string[] = []
): Promise<Curiosidade> => {
  try {
    const { data, error } = await supabase
      .from('curiosidades')
      .insert({ 
        title, 
        author, 
        category_id, 
        body, 
        status,
        attachments: attachments.length > 0 ? attachments : []
      })
      .select('*')
      .single();

    if (error) throw error;
    
    // Try to fetch category separately
    let category = null;
    if (data.category_id) {
      try {
        const { data: catData, error: catError } = await supabase
          .from('curiosidades_categories')
          .select('id, name, description')
          .eq('id', data.category_id)
          .single();
        
        if (!catError && catData) {
          category = catData;
        }
      } catch (err) {
        // Category table might not exist yet, ignore
        console.warn('Could not fetch category:', err);
      }
    }
    
    return {
      ...data,
      category,
      attachments: Array.isArray(data.attachments) ? data.attachments : []
    };
  } catch (error) {
    console.error('Error creating curiosidade:', error);
    throw error;
  }
};

export const updateCuriosidade = async (
  id: string,
  title: string,
  author: string,
  category_id: string | null,
  body: string,
  status: 'draft' | 'published' = 'draft',
  attachments: string[] = []
): Promise<Curiosidade> => {
  try {
    const { data, error } = await supabase
      .from('curiosidades')
      .update({ 
        title, 
        author, 
        category_id, 
        body, 
        status,
        attachments: attachments.length > 0 ? attachments : [],
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    
    // Try to fetch category separately
    let category = null;
    if (data.category_id) {
      try {
        const { data: catData, error: catError } = await supabase
          .from('curiosidades_categories')
          .select('id, name, description')
          .eq('id', data.category_id)
          .single();
        
        if (!catError && catData) {
          category = catData;
        }
      } catch (err) {
        // Category table might not exist yet, ignore
        console.warn('Could not fetch category:', err);
      }
    }
    
    return {
      ...data,
      category,
      attachments: Array.isArray(data.attachments) ? data.attachments : []
    };
  } catch (error) {
    console.error('Error updating curiosidade:', error);
    throw error;
  }
};

// Upload attachment file to Supabase storage
export const uploadAttachment = async (file: File, curiosidadeId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${curiosidadeId}/${Date.now()}.${fileExt}`;
    const filePath = `curiosidades-attachments/${fileName}`;

    const { data, error } = await supabase.storage
      .from('store-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('store-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw error;
  }
};

export const deleteCuriosidade = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('curiosidades')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting curiosidade:', error);
    throw error;
  }
};

// Curiosidades Categories management functions
export const getCuriosidadesCategories = async (): Promise<CuriosidadeCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('curiosidades_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // If table doesn't exist yet, return empty array
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.warn('curiosidades_categories table does not exist yet');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching curiosidades categories:', error);
    // Return empty array if table doesn't exist
    if (error instanceof Error && (error.message?.includes('does not exist') || error.message?.includes('relation'))) {
      return [];
    }
    throw error;
  }
};

export const createCuriosidadesCategory = async (name: string, description?: string): Promise<CuriosidadeCategory> => {
  try {
    const { data, error } = await supabase
      .from('curiosidades_categories')
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      // Check if table doesn't exist
      if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        throw new Error('A tabela de categorias ainda não foi criada. Por favor, execute a migração 20241202000002_add_curiosidades_categories.sql no Supabase.');
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error creating curiosidades category:', error);
    throw error;
  }
};

export const updateCuriosidadesCategory = async (id: string, name: string, description?: string): Promise<CuriosidadeCategory> => {
  try {
    const { data, error } = await supabase
      .from('curiosidades_categories')
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        throw new Error('A tabela de categorias ainda não foi criada. Por favor, execute a migração 20241202000002_add_curiosidades_categories.sql no Supabase.');
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error updating curiosidades category:', error);
    throw error;
  }
};

export const deleteCuriosidadesCategory = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('curiosidades_categories')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        throw new Error('A tabela de categorias ainda não foi criada. Por favor, execute a migração 20241202000002_add_curiosidades_categories.sql no Supabase.');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting curiosidades category:', error);
    throw error;
  }
}; 