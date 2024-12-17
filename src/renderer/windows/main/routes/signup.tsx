import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { useEffect, useState } from 'react';
import { useToast } from '@/renderer/hooks/use-toast';
import { Device } from '@prisma/client';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import PasswordStrength from '../../../components/ui/password-strength';
import { motion } from 'framer-motion';
import Message from '../../../components/ui/message';

const SignUpForm = () => {
    const navigate = useNavigate();
    useToast();
    const [device, setDevice] = useState<Device | null>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        schoolId: '',
        course: '',
        yearLevel: '',
        role: '',
        email: '',
        contactNo: '',
        address: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [passwordMatch, setPasswordMatch] = useState(true);

    useEffect(() => {
        api.database.getDevice().then(devices => {
            if (devices.length > 0) {
                setDevice(devices[0]);
            }
        });
    }, []);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Check password match on every change
        if (field === 'password' || field === 'confirmPassword') {
            if (field === 'password') {
                setPasswordMatch(value === formData.confirmPassword);
            } else {
                setPasswordMatch(value === formData.password);
            }
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords don't match";
            setPasswordMatch(false);
        } else {
            setPasswordMatch(true);
        }

        if (!formData.email.includes('@')) {
            newErrors.email = "Invalid email address";
        }

        if (formData.contactNo.length < 10) {
            newErrors.contactNo = "Invalid contact number";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setMessage(null);

        try {
            const { success, message } = await api.auth.register({
                deviceId: device?.id,
                ...formData
            });

            setMessage({
                type: success ? 'success' : 'error',
                text: message
            });

            if (success) {
                setTimeout(() => navigate('/'), 1500);
            }
        } catch (err: any) {
            setMessage({
                type: 'error',
                text: err.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-6 rounded-2xl border border-[#1A1617]/5 shadow-xl max-w-2xl w-full overflow-y-auto max-h-[90vh]"
        >
            <h2 className="text-2xl font-bold text-[#1A1617] mb-4">
                Create <span className="text-[#C9121F]">Account</span>
            </h2>

            {message && <Message type={message.type} message={message.text} />}

            <form onSubmit={handleSignUp} className="space-y-4">
                {/* Personal Information Section */}
                <div className='grid grid-cols-2 gap-4'>
                    
                
                <fieldset className="space-y-4">
                    <legend className="text-base font-semibold text-[#1A1617] pb-1 border-b">
                        Personal Information
                    </legend>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                type="text"
                                placeholder="John"
                                required
                                value={formData.firstName}
                                onChange={(e) => handleChange('firstName', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                type="text"
                                placeholder="Doe"
                                required
                                value={formData.lastName}
                                onChange={(e) => handleChange('lastName', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="schoolId">School ID</Label>
                        <Input
                            id="schoolId"
                            type="text"
                            placeholder="Enter your school ID"
                            required
                            value={formData.schoolId}
                            onChange={(e) => handleChange('schoolId', e.target.value)}
                        />
                    </div>
                </fieldset>

                {/* Academic Information Section */}
                <fieldset className="space-y-4">
                    <legend className="text-base font-semibold text-[#1A1617] pb-1 border-b">
                        Academic Information
                    </legend>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="course">Course</Label>
                            <Select onValueChange={(value) => handleChange('course', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select course" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BSA">BSA</SelectItem>
                                    <SelectItem value="BSCRIM">BSCRIM</SelectItem>
                                    <SelectItem value="BEED">BEED</SelectItem>
                                    <SelectItem value="BSBA">BSBA</SelectItem>
                                    <SelectItem value="BSCS">BSCS</SelectItem>
                                    <SelectItem value="BSHM">BSHM</SelectItem>
                                    <SelectItem value="BSTM">BSTM</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="yearLevel">Year Level</Label>
                            <Select onValueChange={(value) => handleChange('yearLevel', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FIRST">First Year</SelectItem>
                                    <SelectItem value="SECOND">Second Year</SelectItem>
                                    <SelectItem value="THIRD">Third Year</SelectItem>
                                    <SelectItem value="FOURTH">Fourth Year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Register as</Label>
                        <Select onValueChange={(value) => handleChange('role', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="STUDENT">Student</SelectItem>
                                <SelectItem value="TEACHER">Teacher</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </fieldset>

                {/* Contact Information Section */}
                <fieldset className="space-y-4">
                    <legend className="text-base font-semibold text-[#1A1617] pb-1 border-b">
                        Contact Information
                    </legend>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john.doe@example.com"
                                required
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className={errors.email ? 'border-red-500' : ''}
                            />
                            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contactNo">Contact Number</Label>
                            <Input
                                id="contactNo"
                                type="tel"
                                placeholder="Enter your contact number"
                                required
                                value={formData.contactNo}
                                onChange={(e) => handleChange('contactNo', e.target.value)}
                                className={errors.contactNo ? 'border-red-500' : ''}
                            />
                            {errors.contactNo && <p className="text-red-500 text-sm">{errors.contactNo}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                type="text"
                                placeholder="Enter your address"
                                required
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                            />
                        </div>
                    </div>
                </fieldset>

                {/* Account Security Section */}
                <fieldset className="space-y-4">
                    <legend className="text-base font-semibold text-[#1A1617] pb-1 border-b">
                        Account Security
                    </legend>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                className={errors.password ? 'border-red-500' : ''}
                                aria-invalid={errors.password ? 'true' : 'false'}
                                aria-describedby="password-error"
                            />
                            {errors.password && (
                                <p className="text-red-500 text-sm" id="password-error">
                                    {errors.password}
                                </p>
                            )}
                            <PasswordStrength password={formData.password} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                    className={`${!passwordMatch && formData.confirmPassword ? 'border-red-500' : formData.confirmPassword && passwordMatch ? 'border-green-500' : ''}`}
                                    aria-invalid={!passwordMatch ? 'true' : 'false'}
                                    aria-describedby="confirm-password-error"
                                />
                                {formData.confirmPassword && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        {passwordMatch ? (
                                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        )}
                                    </div>
                                )}
                            </div>
                            {!passwordMatch && formData.confirmPassword && (
                                <p className="text-red-500 text-sm" id="confirm-password-error">
                                    Passwords don't match
                                </p>
                            )}
                        </div>
                    </div>
                </fieldset>
                </div>
                <div className="pt-2 space-y-4">
                    <Button
                        type="submit"
                        className="w-full py-3 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl"
                        disabled={isLoading}
                    >
                        {isLoading ? <LoadingSpinner /> : 'Sign Up'}
                    </Button>

                    <p className="text-center text-[#1A1617]/70 text-sm">
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="text-[#C9121F] hover:underline font-semibold"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </form>
        </motion.div>
    );
}

export default SignUpForm;