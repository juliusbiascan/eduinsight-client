import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');

    const handleSendOtp = async () => {
        try {
            const response = await api.auth.sendOtp(email);
            if (response.success) {
                setMessage('OTP has been sent to your email.');
                setError(null);
            } else {
                setError(response.message || 'Failed to send OTP.');
                setMessage(null);
            }
        } catch (err) {
            setError('An unexpected error occurred.');
            setMessage(null);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.auth.verifyOtpAndResetPassword({
                email,
                otp,
                newPassword,
            });
            if (response.success) {
                setMessage('Password has been reset successfully.');
                setError(null);
                navigate('/');
            } else {
                setError(response.message || 'Failed to reset password.');
                setMessage(null);
            }
        } catch (err) {
            setError('An unexpected error occurred.');
            setMessage(null);
        }
    };

    return (
        <div className="bg-white p-10 rounded-2xl border border-[#1A1617]/5 shadow-xl">
            <h2 className="text-3xl font-bold text-[#1A1617] mb-8">
                Reset <span className="text-[#C9121F]">Password</span>
            </h2>

            <form onSubmit={handleReset} className="space-y-6">
                <p className="text-[#1A1617]/70 mb-6">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                {message && <p className="text-green-500">{message}</p>}
                {error && <p className="text-red-500">{error}</p>}

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="otp">OTP</Label>
                    <Input
                        id="otp"
                        type="text"
                        placeholder="Enter the OTP sent to your email"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                        id="newPassword"
                        type="password"
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                </div>

                <Button
                    type="button"
                    onClick={handleSendOtp}
                    className="w-full py-4 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl"
                >
                    Send OTP
                </Button>

                <Button type="submit" className="w-full py-4 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl">
                    Reset Password
                </Button>

                <p className="text-center text-[#1A1617]/70">
                    Remember your password?{' '}
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="text-[#C9121F] hover:underline font-semibold"
                    >
                        Sign In
                    </button>
                </p>
            </form>
        </div>
    );
}

export default ResetPasswordPage;