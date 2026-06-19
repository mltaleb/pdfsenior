import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $showAuthModal, $isAuthenticated, $user } from '../stores/app-store';
import { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } from '../lib/firebase';

export default function AuthModal() {
  const showModal = useStore($showAuthModal);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!showModal) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user: firebaseUser, error: authError } = isSignUp
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);

      if (authError || !firebaseUser) {
        setError(typeof authError === 'string' ? authError : 'Erreur d\'authentification');
        return;
      }

      $isAuthenticated.set(true);
      $user.set({ id: firebaseUser.uid, email: firebaseUser.email || email, name: firebaseUser.displayName || email.split('@')[0] });
      $showAuthModal.set(false);

      window.location.href = '/pricing';
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError('');

    try {
      const fn = provider === 'google' ? signInWithGoogle : signInWithApple;
      const { user: firebaseUser, error: authError } = await fn();

      if (authError || !firebaseUser) {
        setError(typeof authError === 'string' ? authError : 'Erreur d\'authentification');
        return;
      }

      $isAuthenticated.set(true);
      $user.set({ id: firebaseUser.uid, email: firebaseUser.email || '', name: firebaseUser.displayName || '' });
      $showAuthModal.set(false);
      window.location.href = '/pricing';
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    $isAuthenticated.set(true);
    $user.set({ id: 'demo', email: 'demo@pdfsenior.com', name: 'Utilisateur démo' });
    $showAuthModal.set(false);
    window.location.href = '/pricing';
  };

  return (
    <div className="modal-overlay" onClick={() => $showAuthModal.set(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button
          onClick={() => $showAuthModal.set(false)}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
          Utilisez votre adresse e-mail pour continuer
        </h2>

        {/* Social logins */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuer avec Google
          </button>

          <button
            onClick={() => handleSocialLogin('apple')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continuer avec Apple
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">OU</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          {(isSignUp || email) && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50"
          >
            {loading ? 'Chargement...' : 'Télécharger'}
          </button>
        </form>

        {/* Demo login for development */}
        <button
          onClick={handleDemoLogin}
          className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Mode démo (sans compte)
        </button>

        {/* Toggle sign up / sign in */}
        <p className="text-center text-sm text-gray-600 mt-4">
          {isSignUp ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?'}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary-500 font-semibold hover:underline"
          >
            {isSignUp ? 'Connectez-vous' : 'Inscrivez-vous'}
          </button>
        </p>

        {/* Legal */}
        <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
          En cliquant sur <strong>Télécharger</strong>, vous acceptez les{' '}
          <a href="/" className="text-primary-500 hover:underline">Conditions d'utilisation</a>,{' '}
          la <a href="/" className="text-primary-500 hover:underline">Politique de confidentialité</a>{' '}
          et la <a href="/" className="text-primary-500 hover:underline">Politique de cookies</a>.
        </p>
      </div>
    </div>
  );
}
