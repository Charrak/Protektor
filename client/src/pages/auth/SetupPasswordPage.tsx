import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiCall } from '../../utils/api';
import { CheckCircle, AlertCircle, Lock } from 'lucide-react';

interface ValidationResult {
  valid: boolean;
  companyName?: string;
  contactEmail?: string;
  error?: string;
}

export default function SetupPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const tenant = searchParams.get('tenant');

  const [validating, setValidating] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    validateToken();
  }, [token, tenant]);

  const validateToken = async () => {
    if (!token || !tenant) {
      setValidating(false);
      setValidationResult({ valid: false, error: 'Ungültiger Link' });
      return;
    }

    try {
      const result = await apiCall<ValidationResult>(
        `/api/v1/password-setup/validate?token=${encodeURIComponent(token)}&tenant=${encodeURIComponent(tenant)}`
      );
      setValidationResult(result);
    } catch (err: any) {
      setValidationResult({ valid: false, error: err.message || 'Validierung fehlgeschlagen' });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token || !tenant) {
      setError('Ungültiger Link');
      return;
    }

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    setSubmitting(true);

    try {
      await apiCall('/api/v1/password-setup/set-password', {
        method: 'POST',
        body: JSON.stringify({ token, tenant, password }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Setzen des Passworts');
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-security-dark via-security-navy to-primary-900 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Link wird überprüft...</p>
        </div>
      </div>
    );
  }

  if (!validationResult?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-security-dark via-security-navy to-primary-900 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ungültiger Link</h1>
          <p className="text-gray-600 mb-6">
            {validationResult?.error || 'Dieser Link ist ungültig oder abgelaufen.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary w-full py-3"
          >
            Zur Anmeldeseite
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-security-dark via-security-navy to-primary-900 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Passwort gesetzt!</h1>
          <p className="text-gray-600 mb-6">
            Ihr Passwort wurde erfolgreich gesetzt. Sie können sich jetzt anmelden.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary w-full py-3"
          >
            Zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-security-dark via-security-navy to-primary-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Passwort festlegen</h1>
          <p className="text-gray-400 mt-2">{validationResult?.companyName}</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Willkommen!
          </h2>
          <p className="text-gray-600 mb-6">
            Bitte legen Sie Ihr persönliches Passwort fest, um Ihren Zugang zu aktivieren.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Neues Passwort
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Mindestens 8 Zeichen"
                required
                autoFocus
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Passwort bestätigen
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="Passwort wiederholen"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Wird gespeichert...
                </span>
              ) : (
                'Passwort festlegen'
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Dieser Link ist 24 Stunden gültig.
          </p>
        </div>
      </div>
    </div>
  );
}
