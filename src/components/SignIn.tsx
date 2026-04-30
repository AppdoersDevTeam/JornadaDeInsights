import { useEffect, useState } from 'react';
import { AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Book, Headphones } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

const ALLOWED_ADMIN_EMAILS = [
  'devteam@appdoers.co.nz',
  'ptasbr2020@gmail.com'
];

const SignIn = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; returnTo?: string } | undefined;
  const returnPath = state?.returnTo || state?.from || '/user-dashboard';

  useEffect(() => {
    const redirectSignedInUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        return;
      }

      const savedCart = sessionStorage.getItem('cartState');
      if (savedCart) {
        sessionStorage.removeItem('cartState');
      }

      if (ALLOWED_ADMIN_EMAILS.includes((data.user.email || '').toLowerCase())) {
        navigate('/dashboard');
      } else {
        navigate(returnPath);
      }
    };

    redirectSignedInUser();
  }, [navigate, returnPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(t('signin.fillAll', 'Please fill in all fields'));
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const user = data.user;
      
      if (!user?.email_confirmed_at) {
        navigate('/check-email');
      } else {
        const savedCart = sessionStorage.getItem('cartState');
        if (savedCart) {
          sessionStorage.removeItem('cartState');
        }
        
        if (ALLOWED_ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
          navigate('/dashboard');
        } else {
          navigate(returnPath);
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      if (error instanceof AuthError) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          setError(t('signin.invalidCreds', 'Incorrect email or password'));
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          setError(t('signin.confirmEmail', 'Please confirm your email before signing in'));
        } else {
          setError(error.message);
        }
      } else {
        setError(t('signin.fail', 'Could not sign in'));
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/signin`
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('signin.googleFail', 'Google sign-in failed');
      setError(errorMessage);
    }
  };

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-primary/10 to-background py-16 mt-16">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left Column - Text Area */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Headphones className="h-8 w-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-heading font-bold">
                  {t('signin.page.heading', 'Access your eBooks and exclusive content')}
                </h1>
              </div>
              <p className="text-lg text-muted-foreground">
                {t('signin.page.desc', 'When you sign in, you get full access to all your purchased eBooks, can download new content, and stay up to date with the latest releases.')}
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Book className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-muted-foreground">{t('signin.page.feat1', 'Track your eBook purchases')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Book className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-muted-foreground">{t('signin.page.feat2', 'Access exclusive downloads')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Book className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-muted-foreground">{t('signin.page.feat3', 'Get updates on new releases')}</p>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Form Area */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-card p-8 rounded-lg border border-border/50 shadow-md">
                <h2 className="text-2xl font-heading font-bold mb-6 text-center">
                  {t('signin.page.title', 'Welcome back!')}
                </h2>
                
                <form noValidate className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={t('signin.page.emailPlaceholder', 'Your email')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">
                        {t('signin.page.passwordLabel', 'Password')}
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={t('signin.page.passwordPlaceholder', 'Your password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="text-red-500 text-sm text-center">{error}</div>
                  )}

                  <div className="flex items-center justify-between">
                    <Button variant="link" asChild className="text-primary hover:text-primary/90">
                      <Link to="/forgot-password">{t('signin.page.forgotPassword', 'Forgot password?')}</Link>
                    </Button>
                    <Button variant="link" asChild className="text-primary hover:text-primary/90">
                      <Link to="/signup">{t('signin.page.createAccount', 'Create account')}</Link>
                    </Button>
                  </div>

                  <Button type="submit" className="w-full">
                    {t('signin.page.submit', 'Sign in')}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">{t('signin.page.orWith', 'Or continue with')}</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {t('signin.page.google', 'Sign in with Google')}
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SignIn;
