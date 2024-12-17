import { motion } from 'framer-motion';

interface MessageProps {
  type: 'success' | 'error';
  message: string;
}

const Message = ({ type, message }: MessageProps) => {
  const bgColor = type === 'success' ? 'bg-green-50' : 'bg-red-50';
  const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
  const borderColor = type === 'success' ? 'border-green-200' : 'border-red-200';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`${bgColor} ${textColor} ${borderColor} px-4 py-3 rounded-lg border mb-4`}
    >
      {message}
    </motion.div>
  );
};

export default Message;
