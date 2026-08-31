import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AuthLayout from '../components/AuthLayout';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const token = params.get('token');
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'expired' | 'error'
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const didVerify = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }
    if (didVerify.current) return;
    didVerify.current = true;

    const verify = async () => {
      try {
        const { data } = await api.post('/auth/verify', { token });
        // Log the user in automatically
        setUser(data);
        setStatus('success');
        setMessage(data.message || 'Email verified!');
        toast.success('Email verified! Welcome to OKZ 🎉');
        setTimeout(() => navigate('/'), 2000);
      } catch (err) {
        const res = err.response?.data;
        if (res?.expired) {
          setStatus('expired');
          setMessage(res.message);
        } else {
          setStatus('error');
          setMessage(res?.message || 'Verification failed. The link may have already been used.');
        }
      }
    };
    verify();
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email: resendEmail });
      setResendSent(true);
      toast.success('Verification email sent!');
    } catch {
      toast.error('Could not resend email, please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Email Verification"
      subtitle="Activating your OKZ account"
    >
      <div className="flex flex-col items-center gap-6 py-6 text-center">
        {status === 'loading' && (
          <>
            <Loader className="h-14 w-14 animate-spin text-wheat-500" />
            <p className="text-timber-600">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-14 w-14 text-green-500" />
            <div>
              <p className="text-lg font-semibold text-timber-900">Email Verified!</p>
              <p className="mt-1 text-sm text-timber-500">Redirecting you to the store…</p>
            </div>
          </>
        )}

        {(status === 'expired' || status === 'error') && (
          <>
            <XCircle className="h-14 w-14 text-red-400" />
            <div>
              <p className="text-lg font-semibold text-timber-900">
                {status === 'expired' ? 'Link Expired' : 'Verification Failed'}
              </p>
              <p className="mt-1 text-sm text-timber-500">{message}</p>
            </div>

            {!resendSent ? (
              <form onSubmit={handleResend} className="w-full space-y-3">
                <p className="text-sm text-timber-500">Enter your email to get a new link:</p>
                <input
                  id="resend-email"
                  type="email"
                  required
                  className="auth-input"
                  placeholder="you@email.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn-wheat w-full py-3 text-sm font-bold uppercase tracking-[0.14em]"
                  disabled={resendLoading}
                >
                  {resendLoading ? 'Sending…' : 'Resend Verification Email'}
                </button>
              </form>
            ) : (
              <p className="text-sm font-medium text-green-600">
                ✓ Verification email sent! Check your inbox.
              </p>
            )}

            <Link to="/login" className="text-sm text-wheat-500 underline-offset-2 hover:underline">
              Back to login
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
