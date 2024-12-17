import { useState, useEffect, useCallback } from "react";
import "../../styles/globals.css";
import ReactDOM from "react-dom/client";
import { DeviceUser, DeviceUserRole, Quiz, QuizQuestion } from "@prisma/client";
import { WindowIdentifier } from "@/shared/constants";
import { motion, AnimatePresence } from "framer-motion";
import confetti from 'canvas-confetti';

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

function QuizPlayer() {
  const [quiz, setQuiz] = useState<Quiz & { questions: Array<QuizQuestion> } | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizId, setQuizId] = useState('');
  const [user, setUser] = useState<DeviceUser | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [score, setScore] = useState(0);
  const [answerStatus, setAnswerStatus] = useState<'correct' | 'incorrect' | null>(null);

  const fetchQuiz = async (quizId: string) => {
    try {
      const fetchedQuiz = await api.database.getQuizById(quizId);
      if (!fetchedQuiz?.length) {
        throw new Error("Quiz not found");
      }

      const quiz = fetchedQuiz[0];
      setQuiz(quiz);
      setTimeLeft(quiz.questions[0].time);
      setSelectedAnswers(new Array(quiz.questions.length).fill(null));
      setTotalPoints(quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0));
    } catch (error) {
      console.error("Error fetching quiz:", error);
    }
  };

  const fetchUserData = async () => {
    try {
      const devices = await api.database.getDevice();
      if (!devices?.length) return;

      const device = devices[0];
      const activeUsers = await api.database.getActiveUserByDeviceId(device.id, device.labId);
      if (!activeUsers?.length) return;

      const users = await api.database.getDeviceUserByActiveUserId(activeUsers[0].userId);
      if (users?.length) {
        setUser(users[0]);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    api.quiz.getQuizId((event: any, quizId: string) => {
      setQuizId(quizId);
      fetchQuiz(quizId);
    });
    fetchUserData();
  }, []);

  const completeQuiz = useCallback(() => {
    setQuizCompleted(true);
  }, []);

  const saveQuizRecord = async () => {
    if (!quiz || !user) return;

    try {
      await api.database.saveQuizRecord({
        subjectId: quiz.subjectId,
        userId: user.id,
        quizId: quiz.id,
        score,
        totalQuestions: quiz.questions.length,
        completedAt: new Date(),
      });
    } catch (error) {
      console.error("Error saving quiz record:", error);
    }
  };

  const handleCorrectAnswer = (points: number) => {
    setAnswerStatus('correct');
    setScore(prev => prev + (points || 0));
    //new Audio('/sounds/correct.mp3').play();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleIncorrectAnswer = () => {
    setAnswerStatus('incorrect');
    //new Audio('/sounds/wrong.mp3').play();
    const sadEmoji = document.createElement('div');
    sadEmoji.innerHTML = '😢';
    Object.assign(sadEmoji.style, {
      position: 'fixed',
      fontSize: '64px',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      animation: 'fadeOut 1s forwards'
    });
    document.body.appendChild(sadEmoji);
    setTimeout(() => sadEmoji.remove(), 1000);
  };

  const handleAnswerSelect = (answer: string) => {
    if (!quiz) return;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const options = JSON.parse(currentQuestion.options as string) as QuizOption[];
    const selectedOption = options.find(opt => opt.text === answer);

    setSelectedAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = answer;
      return newAnswers;
    });

    if (selectedOption?.isCorrect) {
      handleCorrectAnswer(currentQuestion.points);
    } else {
      handleIncorrectAnswer();
    }

    setTimeout(() => {
      setAnswerStatus(null);
      if (currentQuestionIndex < quiz.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setTimeLeft(quiz.questions[currentQuestionIndex + 1].time);
      } else {
        completeQuiz();
      }
    }, 1500);
  };

  useEffect(() => {
    if (!quiz || quizCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            return quiz.questions[currentQuestionIndex + 1].time;
          } else {
            completeQuiz();
            return 0;
          }
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz, currentQuestionIndex, quizCompleted, completeQuiz]);

  if (!quiz) {
    return (
      <div className="flex items-center justify-center h-screen text-2xl bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white">
        Loading quiz... {quizId}
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  if (quizCompleted) {
    if (user?.role === DeviceUserRole.STUDENT) {
      saveQuizRecord();
    }

    const scorePercentage = (score / totalPoints) * 100;
    let message = '';
    let emoji = '';

    if (scorePercentage === 100) {
      message = 'Perfect Score! Outstanding!';
      emoji = '🏆';
    } else if (scorePercentage >= 80) {
      message = 'Excellent Work!';
      emoji = '🌟';
    } else if (scorePercentage >= 60) {
      message = 'Good Job!';
      emoji = '👍';
    } else if (scorePercentage >= 40) {
      message = 'Keep Practicing!';
      emoji = '💪';
    } else {
      message = 'Don\'t Give Up!';
      emoji = '🎯';
    }

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="bg-white text-gray-800 p-12 rounded-lg shadow-2xl"
        >
          <h1 className="text-5xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Quiz Completed!
          </h1>
          <div className="text-7xl font-bold mb-8 text-center">
            {score} / {totalPoints}
          </div>
          <div className="text-3xl mb-8 text-center">
            <p>{message}</p>
            <p className="text-5xl mt-2">{emoji}</p>
          </div>
          <button
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-4 rounded-full text-xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105"
            onClick={() => api.window.close(WindowIdentifier.QuizPlayer)}
          >
            Back to Menu
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white p-8"
    >
      <motion.div
        key={currentQuestionIndex}
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -300, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="flex-grow flex flex-col justify-center mb-8"
      >
        <div className="bg-white text-gray-800 p-8 rounded-lg shadow-2xl mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-semibold">{currentQuestion.question}</h2>
            <div className="text-2xl font-bold text-purple-600">{timeLeft}s</div>
          </div>
          <motion.div
            className="w-full bg-gray-200 rounded-full h-4 mb-8"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: currentQuestion.time, ease: "linear" }}
          >
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 h-4 rounded-full" />
          </motion.div>
          <ul className="space-y-4">
            <AnimatePresence>
              {(JSON.parse(currentQuestion.options as string) as QuizOption[]).map((option, index) => {
                const isSelected = selectedAnswers[currentQuestionIndex] === option.text;
                const bgColor = isSelected
                  ? answerStatus === 'correct'
                    ? 'bg-green-500'
                    : answerStatus === 'incorrect'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  : 'bg-gray-100 hover:bg-gray-200';

                return (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <button
                      className={`p-5 w-full text-left rounded-lg transition-all transform hover:scale-105 ${bgColor} ${isSelected ? 'text-white' : ''}`}
                      onClick={() => handleAnswerSelect(option.text)}
                      disabled={selectedAnswers[currentQuestionIndex] !== null}
                    >
                      {option.text}
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      </motion.div>
      <div className="text-xl font-semibold mb-4">
        Question {currentQuestionIndex + 1} of {quiz.questions.length}
      </div>
    </motion.div>
  );
}

(() => {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Failed to find the root element.');
  }
  ReactDOM.createRoot(container).render(<QuizPlayer />);
})();
