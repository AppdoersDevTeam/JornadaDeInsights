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
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Add cover image URLs
    const ebooksWithCoverUrls = data.map(ebook => ({
      ...ebook,
      cover_url: ebook.filename ? supabase.storage.from('store-assets').getPublicUrl(`covers/${ebook.filename}`).data.publicUrl : null
    }));

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
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Ebook not found');

    // Add cover image URL
    const ebookWithCoverUrl = {
      ...data,
      cover_url: data.filename 
        ? supabase.storage.from('store-assets').getPublicUrl(`covers/${data.filename}`).data.publicUrl 
        : null
    };

    return ebookWithCoverUrl;
  } catch (error) {
    console.error('Error fetching ebook:', error);
    throw error;
  }
}; 