import { useState } from 'react';
import { DeviceUser, DeviceUserRole } from '@prisma/client';
import { useNavigate } from 'react-router-dom';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import Message from './ui/message';
import LoadingSpinner from './ui/loading-spinner';
import PasswordStrength from './ui/password-strength';

interface ActivationFormProps {
  user: DeviceUser;
  onActivate: (data: { email: string; contactNo: string; password: string }) => Promise<void>;
  onBack?: () => void;
}

export const ActivationForm = ({ user, onActivate, onBack }: ActivationFormProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: user.email || '',
    contactNo: user.contactNo || '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otp, setOtp] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [skipVerification, setSkipVerification] = useState(false);

  const formatContactNumber = (value: string) => {
    let numbers = value.replace(/[^\d+]/g, '');
    if (!numbers.startsWith('+63')) {
      numbers = '+63' + numbers.replace(/^0+/, '');
    }
    numbers = numbers.replace(/^(\+63)?(\d{0,10})$/, (_, p1, p2) => {
      if (!p1) return `(+63) ${p2}`;
      return `(+63) ${p2}`;
    });
    const maxLength = 16;
    if (numbers.length > maxLength) return formData.contactNo;
    return numbers;
  };

  const handleChange = (field: string, value: string) => {
    if (field === 'contactNo') {
      value = formatContactNumber(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'password' || field === 'confirmPassword') {
      setPasswordMatch(
        field === 'password' 
          ? value === formData.confirmPassword
          : value === formData.password
      );
    }

    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const getRequiredFields = () => {
    const required = [];
    if (!user.email || !user.emailVerified) required.push('email');
    if (!user.contactNo) required.push('contactNo');
    if (!user.password || user.password === '') {
      required.push('password');
    }
    return required;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const requiredFields = getRequiredFields();

    if (requiredFields.includes('email') && !skipVerification) {
      const emailRegex = /\S+@\S+\.\S+/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Invalid email format";
      }
    }

    if (requiredFields.includes('contactNo')) {
      const contactRegex = /^\(\+63\) \d{10}$/;
      if (!contactRegex.test(formData.contactNo)) {
        newErrors.contactNo = "Contact number must be in format (+63) 9XXXXXXXXX";
      }
    }

    if (requiredFields.includes('password')) {
      if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords don't match";
        setPasswordMatch(false);
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOtp = async () => {
    try {
      const response = await api.auth.sendOtp(formData.email);
      if (response.success) {
        setMessage({ type: 'success', text: 'OTP has been sent to your email.' });
        setErrors({});
      } else {
        setErrors({ email: response.message || 'Failed to send OTP.' });
        setMessage(null);
      }
    } catch (err) {
      setErrors({ email: 'An unexpected error occurred.' });
      setMessage(null);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const response = await api.auth.verifyOtp({
        userId: user.id,
        email: formData.email,
        otp,
        skipVerification
      });
      
      if (response.success) {
        setIsEmailVerified(true);
        // Update the user's emailVerified timestamp
        await api.database.updateUser({
          userId: user.id,
          emailVerified: new Date()
        });
        setMessage({ type: 'success', text: 'Email verified successfully.' });
        setErrors({});
      } else {
        setErrors({ otp: response.message || 'Invalid OTP.' });
        setMessage(null);
      }
    } catch (err) {
      setErrors({ otp: 'An unexpected error occurred.' });
      setMessage(null);
    }
  };

  const handleSkipVerification = async () => {
    try {
      // Don't allow skipping if user doesn't have a password
      if (!user.password) {
        setMessage({ 
          type: 'error', 
          text: 'Please set a password before skipping verification' 
        });
        return;
      }

      setSkipVerification(true);
      setIsEmailVerified(true);
      
      // Update the user with the email but without verification timestamp
      await api.database.updateUser({
        userId: user.id,
        email: formData.email,
        emailVerified: null
      });

      // Proceed with form submission immediately after skipping
      const dataToUpdate = {
        email: formData.email,
        contactNo: formData.contactNo,
        password: formData.password || user.password || ''
      };

      // Filter out empty values
      Object.keys(dataToUpdate).forEach(key => {
        if (!dataToUpdate[key as keyof typeof dataToUpdate]) {
          delete dataToUpdate[key as keyof typeof dataToUpdate];
        }
      });

      if (Object.keys(dataToUpdate).length > 0) {
        await onActivate(dataToUpdate);
      }

      // Navigate based on user role
      if (user.role === DeviceUserRole.STUDENT) {
        navigate('/student');
      } else if (user.role === DeviceUserRole.TEACHER) {
        navigate('/teacher');
      }

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to skip verification' 
      });
      console.error('Skip verification error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = getRequiredFields();
    
    if (requiredFields.includes('email') && !isEmailVerified && !skipVerification) {
      setErrors({ email: 'Please verify your email first or skip verification.' });
      return;
    }
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      // Create data object with all required fields
      const dataToUpdate = {
        email: formData.email,  // Always include email
        contactNo: formData.contactNo,  // Always include contactNo
        password: formData.password || user.password || ''  // Include password if set
      };

      // Filter out empty values
      Object.keys(dataToUpdate).forEach(key => {
        if (!dataToUpdate[key as keyof typeof dataToUpdate]) {
          delete dataToUpdate[key as keyof typeof dataToUpdate];
        }
      });

      // Only proceed if there are fields to update
      if (Object.keys(dataToUpdate).length > 0) {
        await onActivate(dataToUpdate);
        
        setMessage({
          type: 'success',
          text: 'Account activated successfully! Redirecting...'
        });

        // Add delay for user feedback
        setTimeout(() => {
          if (user.role === DeviceUserRole.STUDENT) {
            navigate('/student');
          } else if (user.role === DeviceUserRole.TEACHER) {
            navigate('/teacher');
          }
        }, 1500);
      } else {
        setMessage({
          type: 'error',
          text: 'No changes to update'
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to activate account'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormTitle = () => {
    const missing = [];
    if (!user.email) missing.push('email');
    if (!user.contactNo) missing.push('contact');
    if (!user.password || user.password === '') {
      missing.push('password');
    }

    if (missing.length >= 3) {
      return 'Activate Your Account';
    }
    return 'Account Security';
  };

  const getFormDescription = () => {
    const missing = [];
    if (!user.email) missing.push('email address');
    else if (!user.emailVerified) missing.push('email verification');
    if (!user.contactNo) missing.push('contact number');
    if (!user.password || user.password === '') {
      missing.push('password');
    }

    if (missing.length === 0) return 'Your account is fully set up.';
    if (missing.length === 1) return `Please complete your ${missing[0]}.`;
    if (missing.length === 2) return `Please complete your ${missing[0]} and ${missing[1]}.`;
    return 'Please complete your account setup.';
  };

  const getButtonText = () => {
    const missing = [];
    if (!user.email) missing.push('email');
    if (!user.contactNo) missing.push('contact');
    if (!user.password || user.password === '') {
      missing.push('password');
    }

    if (missing.length >= 3) return 'Activate Account';
    if (missing.length === 1) {
      const item = missing[0];
      return item === 'email' ? 'Verify Email' : 
             item === 'contact' ? 'Add Contact' : 'Set Password';
    }
    return 'Update Security Info';
  };

  const requiredFields = getRequiredFields();

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-[#EBC42E]/10 rounded-bl-full -z-10" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#C9121F]/5 rounded-tr-full -z-10" />
      
      <div className="container mx-auto flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white p-8 rounded-2xl border border-[#1A1617]/5 shadow-xl max-w-4xl w-full"
        >
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 text-[#1A1617]/70 hover:text-[#1A1617] transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}

          <div className="flex flex-col space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1A1617] mb-2">
                <span className="text-[#C9121F]">{getFormTitle()}</span>
              </h2>
              <p className="text-[#1A1617]/70">
                Welcome {user.firstName} {user.lastName}! {getFormDescription()}
              </p>
            </div>

            {message && <Message type={message.type} message={message.text} />}

            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold text-[#1A1617] pb-2 border-b">
                  Contact Information
                </legend>
                
                {requiredFields.includes('email') && (
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email Address 
                      {user.emailVerified && (
                        <span className="ml-2 text-sm text-green-600">✓ Verified</span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className={errors.email ? 'border-red-500' : ''}
                        disabled={isEmailVerified}
                      />
                      {!isEmailVerified && (
                        <Button
                          type="button"
                          onClick={handleSendOtp}
                          className="bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white whitespace-nowrap"
                        >
                          Send OTP
                        </Button>
                      )}
                    </div>
                    {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                  </div>
                )}

                {requiredFields.includes('email') && !isEmailVerified && !skipVerification && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">OTP Verification</Label>
                      <div className="flex gap-2">
                        <Input
                          id="otp"
                          type="text"
                          placeholder="Enter OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className={errors.otp ? 'border-red-500' : ''}
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyOtp}
                          className="bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white"
                        >
                          Verify
                        </Button>
                      </div>
                      {errors.otp && <p className="text-red-500 text-sm">{errors.otp}</p>}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleSkipVerification}
                        className="text-sm text-gray-500 hover:text-[#C9121F]"
                        variant="link"
                      >
                        Skip Verification and Continue
                      </Button>
                    </div>
                  </div>
                )}

                {requiredFields.includes('contactNo') && (
                  <div className="space-y-2">
                    <Label htmlFor="contactNo">Contact Number</Label>
                    <Input
                      id="contactNo"
                      type="tel"
                      placeholder="(+63) 9XXXXXXXXX"
                      value={formData.contactNo}
                      onChange={(e) => handleChange('contactNo', e.target.value)}
                      className={errors.contactNo ? 'border-red-500' : ''}
                    />
                    {errors.contactNo && <p className="text-red-500 text-sm">{errors.contactNo}</p>}
                  </div>
                )}
              </fieldset>

              {requiredFields.includes('password') && (
                <fieldset className="space-y-4">
                  <legend className="text-lg font-semibold text-[#1A1617] pb-2 border-b">
                    Security Settings
                  </legend>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      className={errors.password ? 'border-red-500' : ''}
                    />
                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                    <PasswordStrength password={formData.password} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        className={`${!passwordMatch && formData.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showPassword ? 
                          <EyeOff className="w-5 h-5 text-gray-500" /> : 
                          <Eye className="w-5 h-5 text-gray-500" />
                        }
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
                    )}
                  </div>
                </fieldset>
              )}

              <div className="md:col-span-2 flex gap-4">
                {requiredFields.includes('email') && !isEmailVerified && !skipVerification && user.password && (
                  <Button
                    type="button"
                    onClick={handleSkipVerification}
                    className="w-full py-3 text-lg font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all duration-300 rounded-xl"
                  >
                    Skip Verification
                  </Button>
                )}
                <Button
                  type="submit"
                  className="w-full py-3 text-lg font-semibold bg-[#EBC42E] hover:bg-[#C9121F] text-[#1A1617] hover:text-white transition-all duration-300 rounded-xl"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <LoadingSpinner /> : getButtonText()}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
