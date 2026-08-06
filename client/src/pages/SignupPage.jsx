import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

export default function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'Egypt',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country,
        },
      });
      toast.success('Account created');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <form onSubmit={submit} className="card w-full max-w-xl space-y-4">
        <div className="text-center">
          <div className="flex justify-center">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-lg text-timber-500 mt-3">Join the crew</h1>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Full name</label>
            <input required className="input" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input required className="input" value={form.phone} onChange={set('phone')} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                className="input pr-11"
                value={form.password}
                onChange={set('password')}
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
          {['street', 'city', 'state', 'zip', 'country'].map((f) => (
            <div key={f} className={f === 'street' ? 'md:col-span-2' : ''}>
              <label className="label capitalize">{f}</label>
              <input required className="input" value={form[f]} onChange={set(f)} />
            </div>
          ))}
        </div>
        <button type="submit" className="btn-wheat w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create account'}
        </button>
        <p className="text-sm text-center text-timber-500">
          Already have an account? <Link to="/login" className="text-wheat-500 font-medium">Sign in</Link>
        </p>
        <p className="text-sm text-center">
          <Link to="/" className="text-timber-500 hover:text-wheat-500 transition-colors">← Back to home</Link>
        </p>
      </form>
    </div>
  );
}
