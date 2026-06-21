import { createClient } from '@supabase/supabase-js';
import type { AppLocale } from '@/locales/messages';
import { ebookMatchesSiteLanguage, type EbookContentLocale } from '@/lib/ebook-locale';

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
export const insertEbookMetadata = async (metadata: Record<string, unknown>) => {
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

export const getCurrentSupabaseUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user;
};

export const getSupabaseAccessToken = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session?.access_token ?? null;
};

export const getEbooks = async (options?: { locale?: AppLocale }) => {
  try {
    let query = supabase
      .from('ebooks_metadata')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (options?.locale) {
      query = query.eq('content_locale', options.locale);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Add cover image URLs and category info
    const ebooksWithCoverUrls = data.map((ebook: Record<string, unknown>) => {
      const typedEbook = ebook as {
        categories?: unknown;
        filename?: string;
      };
      // Handle category - Supabase returns it as an object for single relations
      let category = null;
      if (typedEbook.categories) {
        // If it's an array (shouldn't happen for many-to-one, but handle it)
        if (Array.isArray(typedEbook.categories) && typedEbook.categories.length > 0) {
          const firstCategory = typedEbook.categories[0] as { id: string; name: string };
          category = { id: firstCategory.id, name: firstCategory.name };
        } else if (typeof typedEbook.categories === 'object') {
          const singleCategory = typedEbook.categories as { id?: string; name?: string };
          if (singleCategory.id) {
            category = { id: singleCategory.id, name: singleCategory.name || '' };
          }
        }
      }
      
      return {
        ...ebook,
        content_locale: (ebook.content_locale as EbookContentLocale | undefined) ?? 'pt-BR',
        cover_url: typedEbook.filename ? supabase.storage.from('store-assets').getPublicUrl(`covers/${typedEbook.filename}`).data.publicUrl : null,
        category: category
      };
    });

    return ebooksWithCoverUrls;
  } catch (error) {
    console.error('Error fetching ebooks:', error);
    throw error;
  }
};

export const getEbookById = async (id: string, options?: { locale?: AppLocale }) => {
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

    if (options?.locale && !ebookMatchesSiteLanguage(data.content_locale, options.locale)) {
      throw new Error('Ebook not found');
    }

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
      content_locale: (data.content_locale as EbookContentLocale | undefined) ?? 'pt-BR',
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
  name_en?: string | null;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Curiosidade {
  id: string;
  title: string | null;
  title_en?: string | null;
  author: string;
  category_id: string | null;
  category?: CuriosidadeCategory | null;
  body: string | null;
  body_en?: string | null;
  status: 'draft' | 'published';
  attachments: string[];
  cover_image: string | null;
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
    const curiosidadesWithCategories = await Promise.all((data || []).map(async (item: Record<string, unknown>) => {
      const typedItem = item as { category_id?: string | null; attachments?: unknown };
      let category = null;
      
      // Try to fetch category if category_id exists
      if (typedItem.category_id) {
        try {
          const { data: catData, error: catError } = await supabase
            .from('curiosidades_categories')
            .select('id, name, name_en, description')
            .eq('id', typedItem.category_id)
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
        attachments: Array.isArray(typedItem.attachments) ? typedItem.attachments : []
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
          .select('id, name, name_en, description')
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
  title: string | null,
  author: string,
  category_id: string | null,
  body: string | null,
  status: 'draft' | 'published' = 'draft',
  attachments: string[] = [],
  cover_image: string | null = null,
  title_en: string | null = null,
  body_en: string | null = null
): Promise<Curiosidade> => {
  try {
    const { data, error } = await supabase
      .from('curiosidades')
      .insert({ 
        title: title?.trim() ? title.trim() : null,
        author,
        category_id,
        body: body?.trim() ? body.trim() : null,
        status,
        attachments: attachments.length > 0 ? attachments : [],
        cover_image,
        title_en: title_en?.trim() ? title_en.trim() : null,
        body_en: body_en?.trim() ? body_en.trim() : null,
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
          .select('id, name, name_en, description')
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
  title: string | null,
  author: string,
  category_id: string | null,
  body: string | null,
  status: 'draft' | 'published' = 'draft',
  attachments: string[] = [],
  cover_image: string | null = null,
  title_en: string | null = null,
  body_en: string | null = null
): Promise<Curiosidade> => {
  try {
    const { data, error } = await supabase
      .from('curiosidades')
      .update({ 
        title: title?.trim() ? title.trim() : null,
        author,
        category_id,
        body: body?.trim() ? body.trim() : null,
        status,
        attachments: attachments.length > 0 ? attachments : [],
        cover_image,
        title_en: title_en?.trim() ? title_en.trim() : null,
        body_en: body_en?.trim() ? body_en.trim() : null,
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
          .select('id, name, name_en, description')
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

    const { error } = await supabase.storage
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

// Upload cover image to Supabase storage
export const uploadCoverImage = async (file: File, curiosidadeId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${curiosidadeId}/cover-${Date.now()}.${fileExt}`;
    const filePath = `curiosidades-covers/${fileName}`;

    const { error } = await supabase.storage
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
    console.error('Error uploading cover image:', error);
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

export const createCuriosidadesCategory = async (
  name: string,
  description?: string,
  name_en?: string | null
): Promise<CuriosidadeCategory> => {
  try {
    const { data, error } = await supabase
      .from('curiosidades_categories')
      .insert({
        name,
        description,
        name_en: name_en?.trim() ? name_en.trim() : null,
      })
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

export const updateCuriosidadesCategory = async (
  id: string,
  name: string,
  description?: string,
  name_en?: string | null
): Promise<CuriosidadeCategory> => {
  try {
    const { data, error } = await supabase
      .from('curiosidades_categories')
      .update({
        name,
        description,
        name_en: name_en?.trim() ? name_en.trim() : null,
        updated_at: new Date().toISOString(),
      })
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