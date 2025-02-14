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
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [schoolId, setSchoolId] = useState('');
    const [isIdentityVerified, setIsIdentityVerified] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const verifyIdentity = async () => {
        try {
            const response = await api.auth.verifyPersonalInfo({
                email,
                firstName,
                lastName,
                schoolId
            });
            if (response.success) {
                setUserId(response.userId);
                setIsIdentityVerified(true);
                
                // Automatically send OTP after successful identity verification
                const otpResponse = await api.auth.sendOtp(email);
                if (otpResponse.success) {
                    setIsEmailVerified(true);
                    setMessage('Identity verified successfully and OTP has been sent to your email.');
                } else {
                    setError(otpResponse.message || 'Failed to send OTP.');
                    setMessage(null);
                }
                setError(null);
            } else {
                setError(response.message || 'Identity verification failed.');
                setMessage(null);
            }
        } catch (err) {
            setError('An unexpected error occurred.');
            setMessage(null);
        }
    };

    const handleSendOtp = async () => {
        if (!isEmailVerified) {
            setError('Please verify your email first.');
            return;
        }
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
                userId,
                email,
                otp,
                newPassword,
            });
            if (response.success) {
                setMessage('Password has been reset successfully.');
                setError(null);
                navigate('/login');
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
                    Please verify your identity to reset your password.
                </p>

                {message && <p className="text-green-500">{message}</p>}
                {error && <p className="text-red-500">{error}</p>}

                {!isIdentityVerified ? (
                    <>
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
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                type="text"
                                placeholder="Enter your first name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                type="text"
                                placeholder="Enter your last name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="schoolId">School ID</Label>
                            <Input
                                id="schoolId"
                                type="text"
                                placeholder="Enter your school ID"
                                value={schoolId}
                                onChange={(e) => setSchoolId(e.target.value)}
                                required
                            />
                        </div>

                        <Button
                            type="button"
                            onClick={verifyIdentity}
                            className="w-full py-4 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl"
                        >
                            Verify Identity
                        </Button>
                    </>
                ) : !isEmailVerified ? (
                    // Show OTP request section after identity verification
                    <Button
                        type="button"
                        onClick={handleSendOtp}
                        className="w-full py-4 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl"
                    >
                        Send OTP
                    </Button>
                ) : (
                    // Show password reset form after OTP verification
                    <>
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
                            type="submit" 
                            className="w-full py-4 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl"
                        >
                            Reset Password
                        </Button>
                    </>
                )}

                <p className="text-center text-[#1A1617]/70">
                    Remember your password?{' '}
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
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