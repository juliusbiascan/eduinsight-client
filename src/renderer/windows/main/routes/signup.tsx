import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { useNavigate, Link } from 'react-router-dom'; // Add import for Link
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { useEffect, useState } from 'react';
import { useToast } from '@/renderer/hooks/use-toast';
import { Device } from '@prisma/client';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import { motion } from 'framer-motion';
import Message from '../../../components/ui/message';
import { WindowIdentifier } from '@/shared/constants';

const initialFormData = {
  firstName: '',
  lastName: '',
  schoolId: '',
  course: '',
  yearLevel: '',
  role: ''
};

const SignUpForm = () => {
    const navigate = useNavigate();
    useToast();
    const [device, setDevice] = useState<Device | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [devicePurpose, setDevicePurpose] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false); // Add state for terms agreement
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [labStatus, setLabStatus] = useState<{ isRegistrationDisabled: boolean }>();

    useEffect(() => {
        Promise.all([
            api.database.getDevice(),
            api.store.get('devicePurpose'),
            api.database.getLaboratoryStatus() // Add this new call
        ]).then(([device, purpose, status]) => {
            setDevice(device);
            setDevicePurpose(purpose);
            setLabStatus(status);
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

    // Modify the handleChange function
    const handleChange = (field: string, value: string) => {
        if (field === 'schoolId') {
            value = formatSchoolId(value);
        }
        
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Modify validation for contact number
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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Add validation utilities


    // Update handleSignUp to use validation
    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if registration is disabled
        if (labStatus?.isRegistrationDisabled) {
            setMessage({
                type: 'error',
                text: 'Registration is currently disabled for this laboratory. Please contact your administrator.'
            });
            return;
        }

        if (!agreeTerms) {
            setErrors(prev => ({ ...prev, terms: "You must agree to the terms and conditions." }));
            return;
        }
        if (!validateForm()) return;

        setIsLoading(true);
        setMessage(null);

        try {
            const submissionData = {
                ...formData,
                yearLevel: devicePurpose === 'TEACHING' ? 'FIRST' : formData.yearLevel,
                schoolId: devicePurpose === 'TEACHING' ? 'TEACHER' : formData.schoolId
            };

            const { success, message } = await api.auth.register({
                deviceId: device?.id,
                ...submissionData
            });

            if (success) {
                // Attempt to login immediately after successful registration
                const loginResult = await api.auth.login({
                    deviceId: device?.id,
                    email: '',
                    studentId: formData.schoolId,
                    password: 'eduinsight',
                    allowDirectLogin: true,
                });

                setMessage({
                    type: loginResult.success ? 'success' : 'error',
                    text: loginResult.message
                });

                if (loginResult.success) {
                    // Close window after successful login
                    setTimeout(() => {
                        api.window.openInTray(WindowIdentifier.Dashboard);
                        window.close();
                    }, 1500);
                }
            } else {
                setMessage({
                    type: 'error',
                    text: message
                });
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

            {labStatus?.isRegistrationDisabled && (
                <Message 
                    type="error" 
                    message="Registration is currently disabled for this laboratory. Please contact your administrator." 
                />
            )}

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
                                placeholder="First Name"
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
                                placeholder="Last Name"
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
                        disabled={isLoading || labStatus?.isRegistrationDisabled}
                        title={labStatus?.isRegistrationDisabled ? 'Registration is currently disabled' : ''}
                    >
                        {isLoading ? <LoadingSpinner /> : 
                         labStatus?.isRegistrationDisabled ? 'Registration Disabled' : 'Sign Up'}
                    </Button>

                    <p className="text-center text-[#1A1617]/70 text-sm">
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
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