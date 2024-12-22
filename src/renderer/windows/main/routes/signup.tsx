import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { useNavigate, Link } from 'react-router-dom'; // Add import for Link
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { useEffect, useState } from 'react';
import { useToast } from '@/renderer/hooks/use-toast';
import { Device } from '@prisma/client';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import PasswordStrength from '../../../components/ui/password-strength';
import { motion } from 'framer-motion';
import Message from '../../../components/ui/message';
import { Eye, EyeOff } from 'lucide-react'; // Add import for eye icons

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
        password: '',
        confirmPassword: ''
    });
    const [devicePurpose, setDevicePurpose] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false); // Add state for terms agreement
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [passwordMatch, setPasswordMatch] = useState(true);
    const [showPassword, setShowPassword] = useState(false); // Add state for showing password

    useEffect(() => {
        Promise.all([
            api.database.getDevice(),
            api.store.get('devicePurpose')
        ]).then(([devices, purpose]) => {
            if (devices.length > 0) {
                setDevice(devices[0]);
            }
            setDevicePurpose(purpose);
            // Automatically set role and yearLevel based on device purpose
            if (purpose === 'TEACHING') {
                handleChange('role', 'TEACHER');
                handleChange('yearLevel', 'FIRST'); // Set default yearLevel for teachers
            } else if (purpose === 'STUDENT') {
                handleChange('role', 'STUDENT');
            }
        });
    }, []);

    const formatSchoolId = (value: string) => {
        // Remove non-numeric characters
        const numbers = value.replace(/[^\d]/g, '');
        
        // Limit to 7 digits
        if (numbers.length > 7) return formData.schoolId;
        
        // Format as XX-XXXXX
        if (numbers.length <= 2) {
            return numbers;
        } else {
            return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
        }
    };

    const handleChange = (field: string, value: string) => {
        if (field === 'schoolId') {
            value = formatSchoolId(value);
        }
        
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

        // Device purpose validation
        if (devicePurpose === 'TEACHING' && formData.role !== 'TEACHER') {
            newErrors.role = "This device is registered for teaching purposes only";
        }
        if (devicePurpose === 'STUDENT' && formData.role !== 'STUDENT') {
            newErrors.role = "This device is registered for student use only";
        }

        // Modify validation to only check school ID for students
        if (devicePurpose === 'STUDENT') {
            if (!formData.schoolId) {
                newErrors.schoolId = "School ID is required";
            }
            if (!formData.yearLevel) {
                newErrors.yearLevel = "Year level is required";
            }
        }

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
        if (!agreeTerms) {
            setErrors(prev => ({ ...prev, terms: "You must agree to the terms and conditions." }));
            return;
        }
        if (!validateForm()) return;

        setIsLoading(true);
        setMessage(null);

        try {
            // If teacher, ensure yearLevel is set
            const submissionData = {
                ...formData,
                yearLevel: devicePurpose === 'TEACHING' ? 'FIRST' : formData.yearLevel,
                schoolId: devicePurpose === 'TEACHING' ? 'TEACHER' : formData.schoolId
            };

            const { success, message } = await api.auth.register({
                deviceId: device?.id,
                ...submissionData
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
                    <div className={devicePurpose === 'STUDENT' ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4"}>
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
                    {/* Only show school ID for students */}
                    {devicePurpose === 'STUDENT' && (
                        <div className="space-y-2">
                            <Label htmlFor="schoolId">School ID</Label>
                            <Input
                                id="schoolId"
                                type="text"
                                placeholder="YY-XXXXX"
                                required
                                value={formData.schoolId}
                                onChange={(e) => handleChange('schoolId', e.target.value)}
                                maxLength={8} // 7 digits + 1 hyphen
                            />
                        </div>
                    )}
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
                        {/* Only show year level for students */}
                        {devicePurpose === 'STUDENT' && (
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
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Registering as</Label>
                        <div className="p-2 bg-gray-50 border rounded-md text-gray-700">
                            {devicePurpose === 'TEACHING' ? 'Teacher' : 'Student'}
                        </div>
                        {errors.role && <p className="text-red-500 text-sm">{errors.role}</p>}
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

                        
                    </div>
                </fieldset>

                {/* Account Security Section */}
                <fieldset className="space-y-4">
                    <legend className="text-base font-semibold text-[#1A1617] pb-1 border-b">
                        Account Security
                    </legend>
                    <div className="flex flex-col gap-4">
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
                            
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                    className={`${!passwordMatch && formData.confirmPassword ? 'border-red-500' : formData.confirmPassword && passwordMatch ? 'border-green-500' : ''}`}
                                    aria-invalid={!passwordMatch ? 'true' : 'false'}
                                    aria-describedby="confirm-password-error"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
                                </button>
                            </div>
                            <PasswordStrength password={formData.password} />
                            {!passwordMatch && formData.confirmPassword && (
                                <p className="text-red-500 text-sm" id="confirm-password-error">
                                    Passwords don't match
                                </p>
                            )}
                        </div>
                    </div>
                </fieldset>
                </div>
                <div className="flex items-center">
                    <input
                        id="terms"
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="h-4 w-4 text-[#C9121F] border-gray-300 rounded"
                        required
                    />
                    <label htmlFor="terms" className="ml-2 block text-sm text-[#1A1617]">
                        I agree to the{' '}
                        <Link to="/terms" className="text-[#C9121F] hover:underline">
                            Terms and Conditions
                        </Link> {/* Replace <a> with <Link> */}
                    </label>
                </div>
                {errors.terms && <p className="text-red-500 text-sm">{errors.terms}</p>}
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