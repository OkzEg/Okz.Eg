import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { defaultStaffPage, isStaff } from '../utils/permissions';
import AuthLayout from '../components/AuthLayout';
import api from '../api/axios';

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const user = await googleLogin(credentialResponse.credential);
      toast.success('Welcome back');
      if (isStaff(user)) navigate(redirect || defaultStaffPage(user.role));
      else navigate(redirect || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google Login failed');
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUnverifiedEmail(null);
    try {
      const user = await login(email, password);
      toast.success('Welcome back');
      if (isStaff(user)) navigate(redirect || defaultStaffPage(user.role));
      else navigate(redirect || '/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.unverified) {
        setUnverifiedEmail(data.email || email);
      } else {
        toast.error(data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email: unverifiedEmail });
      setResendSent(true);
      toast.success('Verification email sent! Check your inbox.');
    } catch {
      toast.error('Could not resend email, please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to track orders, save favorites, and check out faster."
      footer={
        <>
          New here?{' '}
          <Link
            to={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
            className="font-semibold text-wheat-500 underline-offset-2 hover:underline"
          >
            Create account
          </Link>
        </>
      }
    >
      <div className="mb-6 flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => toast.error('Google Login failed')}
          useOneTap
          theme="outline"
          shape="circle"
          text="continue_with"
        />
      </div>
      
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-timber-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-cream px-2 text-timber-500">Or continue with email</span>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="label">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="next"
            required
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              enterKeyHint="go"
              required
              className="auth-input pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 end-0 flex min-w-12 items-center justify-center text-timber-400 hover:text-timber-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn-wheat mt-1 min-h-12 w-full py-3.5 text-sm font-bold uppercase tracking-[0.14em]"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        {unverifiedEmail && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium text-amber-800">Email not verified</p>
            <p className="mt-1 text-amber-700">
              Please verify your email before logging in.
            </p>
            {!resendSent ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="mt-2 font-semibold text-wheat-600 underline-offset-2 hover:underline"
              >
                {resendLoading ? 'Sending…' : 'Resend verification email'}
              </button>
            ) : (
              <p className="mt-2 font-medium text-green-700">✓ Verification email sent! Check your inbox.</p>
            )}
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
