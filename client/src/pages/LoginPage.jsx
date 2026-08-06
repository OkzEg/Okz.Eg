import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { defaultStaffPage, isStaff } from '../utils/permissions';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success('Welcome back');
      if (isStaff(user)) navigate(defaultStaffPage(user.role));
      else navigate(params.get('redirect') || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-wheat-100 via-cream to-cream">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4">
        <div className="text-center mb-2">
          <div className="flex justify-center">
            <BrandLogo size="lg" />
          </div>
          <p className="text-sm text-timber-500 mt-3">Sign in to your account</p>
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className="input pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-timber-400 hover:text-timber-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button type="submit" className="btn-wheat w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-sm text-center text-timber-500">
          New here? <Link to="/signup" className="text-wheat-500 font-medium">Create account</Link>
        </p>
        <p className="text-sm text-center">
          <Link to="/" className="text-timber-500 hover:text-wheat-500 transition-colors">← Back to home</Link>
        </p>
      </form>
    </div>
  );
}
