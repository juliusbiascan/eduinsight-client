import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { useNavigate } from 'react-router-dom';

const ResetPasswordPage = () => {
    const navigate = useNavigate();

    const handleReset = (e: React.FormEvent) => {
        e.preventDefault();
        // Add reset logic
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

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="Enter your email" />
                </div>

                <Button type="submit" className="w-full py-4 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl">
                    Send Reset Link
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