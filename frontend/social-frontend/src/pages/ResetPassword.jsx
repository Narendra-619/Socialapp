import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import API from "../utils/api";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = location.state?.resetToken;
  const timeoutRef = useRef();

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    if (!resetToken) {
      navigate("/forgot-password");
    }
  }, [resetToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await API.post("/auth/reset-password", { resetToken, newPassword });
      setSuccess(true);
      timeoutRef.current = setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 shadow-xl shadow-blue-500/20 rotate-3 transition-transform hover:rotate-0">
            <img src="/logo.png" alt="logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Reset Password</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Create a new password for your account</p>
        </div>

        <div className="card p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 font-medium">Password reset successful!</p>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Redirecting to login...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 mb-6 rounded-xl flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="input-field"
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="input-field"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <Link to="/" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                Back to Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
