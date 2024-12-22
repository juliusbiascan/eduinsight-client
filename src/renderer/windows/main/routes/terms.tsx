import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/button';
import { useNavigate } from 'react-router-dom';

const TermsPage = () => {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-6 rounded-2xl border border-[#1A1617]/5 shadow-xl max-w-3xl w-full overflow-y-auto max-h-[90vh]"
        >
            <h2 className="text-2xl font-bold text-[#1A1617] mb-4">
                Terms and <span className="text-[#C9121F]">Conditions</span>
            </h2>

            <div className="prose max-w-none">
                {/* Replace the content below with your actual Terms and Conditions */}
                <h3>1. Introduction</h3>
                <p>
                    Welcome to EduInsight! By accessing or using our application, you agree to be bound by these Terms and Conditions.
                </p>

                <h3>2. Use of the Service</h3>
                <p>
                    You agree to use the service only for lawful purposes and in accordance with these Terms.
                </p>

                <h3>3. User Accounts</h3>
                <p>
                    When you create an account, you must provide accurate information and keep your account secure.
                </p>

                <h3>4. Privacy</h3>
                <p>
                    Your privacy is important to us. Please review our Privacy Policy for information on how we handle your data.
                </p>

                <h3>5. Intellectual Property</h3>
                <p>
                    All content provided in the application is the property of EduInsight and is protected by intellectual property laws.
                </p>

                <h3>6. Termination</h3>
                <p>
                    We reserve the right to terminate or suspend your account at our sole discretion, without notice, for conduct that we believe violates these Terms.
                </p>

                <h3>7. Disclaimer of Warranties</h3>
                <p>
                    The service is provided "as is" without any warranties of any kind.
                </p>

                <h3>8. Limitation of Liability</h3>
                <p>
                    EduInsight shall not be liable for any damages arising from the use or inability to use the service.
                </p>

                <h3>9. Changes to Terms</h3>
                <p>
                    We may update these Terms from time to time. Continued use of the service constitutes acceptance of the revised Terms.
                </p>
            </div>

            <div className="mt-6 flex justify-end">
                <Button
                    onClick={() => navigate(-1)}
                    className="py-2 px-4 bg-[#C9121F] text-white rounded-lg hover:bg-[#a10e1c] transition"
                >
                    Back
                </Button>
            </div>
        </motion.div>
    );
}

export default TermsPage;
