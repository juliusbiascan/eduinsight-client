import { useState, useEffect, useCallback } from 'react';
import '../../styles/globals.css';
import ReactDOM from 'react-dom/client';
import { Device, DeviceUser, DeviceUserRole, Quiz, QuizQuestion } from '@prisma/client';
import { WindowIdentifier } from '@/shared/constants';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Typography } from 'antd';

const { Text } = Typography;

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

const QuizPlayer: React.FC = () => {
  const [quiz, setQuiz] = useState<
    (Quiz & { questions: Array<QuizQuestion> }) | null
  >(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [user, setUser] = useState<DeviceUser | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [score, setScore] = useState(0);
  const [answerStatus, setAnswerStatus] = useState<
    'correct' | 'incorrect' | null
  >(null);
  const [blankAnswers, setBlankAnswers] = useState<string[]>([]);
  const [identificationAnswer, setIdentificationAnswer] = useState('');
  const [enumerationAnswers, setEnumerationAnswers] = useState<string[]>([]);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [countdown, setCountdown] = useState(5); // Add countdown state

  const fetchQuiz = async (quizId: string) => {
    try {
      const fetchedQuiz = await api.database.getQuizById(quizId);
      if (!fetchedQuiz?.length) {
        throw new Error('Quiz not found');
      }

      const quiz = fetchedQuiz[0];
      // Sort questions by order before displaying
      quiz.questions = quiz.questions.sort((a, b) => a.order - b.order);

      setQuiz(quiz);
      setTimeLeft(quiz.questions[0].time);
      setSelectedAnswers(new Array(quiz.questions.length).fill(null));
      setTotalPoints(
        quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0),
      );
    } catch (error) {
      console.error('Error fetching quiz:', error);
    }
  };

  useEffect(() => {
    api.quiz.getQuizId((event: any, quizId: string) => {
      fetchQuiz(quizId);
    });
    api.database.getDevice().then((device: Device) => {
      api.database
        .getActiveUserByDeviceId(device.id, device.labId)
        .then((activeUser) => {
          setUser(activeUser.user);
        });
    });
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
        totalPoints,
        totalQuestions: quiz.questions.length,
        completedAt: new Date(),
      });
    } catch (error) {
      console.error('Error saving quiz record:', error);
    }
  };

  const handleCorrectAnswer = (points: number) => {
    setAnswerStatus('correct');
    setScore((prev) => prev + (points || 0));
    //new Audio('/sounds/correct.mp3').play();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handleIncorrectAnswer = () => {
    setAnswerStatus('incorrect');
    setShowCorrectAnswer(true);
    //new Audio('/sounds/wrong.mp3').play();
    const sadEmoji = document.createElement('div');
    sadEmoji.innerHTML = '😢';
    Object.assign(sadEmoji.style, {
      position: 'fixed',
      fontSize: '64px',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      animation: 'fadeOut 1s forwards',
    });
    document.body.appendChild(sadEmoji);
    setTimeout(() => sadEmoji.remove(), 1000);

    // Add timer to automatically proceed after showing correct answer
    setTimeout(() => {
      handleNextQuestion();
    }, 3000); // Show correct answer for 3 seconds before proceeding
  };

  const getCorrectAnswerDisplay = (question: QuizQuestion) => {
    const correctAnswers = JSON.parse(question.options as string);

    switch (question.type) {
      case 'Multiple Choice': {
        const correctOption = correctAnswers.find(
          (opt: QuizOption) => opt.isCorrect,
        );
        return (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg w-full">
            <div className="mb-2">
              <Text strong className="text-green-700">
                Correct Answer:
              </Text>
            </div>
            <Text className="text-green-600">{correctOption?.text}</Text>
          </div>
        );
      }

      case 'Fill in the Blank':
        return (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg w-full">
            <div className="mb-2">
              <Text strong className="text-green-700">
                Correct Answers:
              </Text>
            </div>
            {correctAnswers.map((answer: { text: string }, index: number) => (
              <div key={index} className="text-green-600">
                <Text>
                  Blank {index + 1}: {answer.text}
                </Text>
              </div>
            ))}
          </div>
        );

      case 'Identification':
        return (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg w-full">
            <div className="mb-2">
              <Text strong className="text-green-700">
                Accepted Answers:
              </Text>
            </div>
            {correctAnswers.map((answer: { text: string }, index: number) => (
              <div key={index} className="text-green-600">
                <Text>{answer.text}</Text>
              </div>
            ))}
          </div>
        );

      case 'Enumeration':
        return (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg w-full">
            <div className="mb-2">
              <Text strong className="text-green-700">
                Correct Answers:
              </Text>
            </div>
            {correctAnswers.map((answer: { text: string }, index: number) => (
              <div key={index} className="text-green-600">
                <Text>
                  {index + 1}. {answer.text}
                </Text>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (!quiz) return;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const options = JSON.parse(
      currentQuestion.options as string,
    ) as QuizOption[];
    const selectedOption = options.find((opt) => opt.text === answer);

    setSelectedAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = answer;
      return newAnswers;
    });

    if (selectedOption?.isCorrect) {
      handleCorrectAnswer(currentQuestion.points);
      setTimeout(handleNextQuestion, 1500);
    } else {
      handleIncorrectAnswer();
    }
  };

  const handleBlankAnswer = (answers: string[]) => {
    if (!quiz) return;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const correctAnswers = JSON.parse(currentQuestion.options as string);

    // Check if all answers match (case insensitive)
    const isCorrect = answers.every(
      (answer, index) =>
        answer.trim().toLowerCase() ===
        correctAnswers[index].text.trim().toLowerCase(),
    );

    if (isCorrect) {
      handleCorrectAnswer(currentQuestion.points);
      setTimeout(handleNextQuestion, 1500);
    } else {
      handleIncorrectAnswer();
    }
  };

  const handleIdentificationAnswer = () => {
    if (!quiz) return;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const correctAnswers = JSON.parse(currentQuestion.options as string);

    // Check if the answer matches any of the possible correct answers
    const isCorrect = correctAnswers.some(
      (answer: { text: string }) =>
        identificationAnswer.trim().toLowerCase() ===
        answer.text.trim().toLowerCase(),
    );

    if (isCorrect) {
      handleCorrectAnswer(currentQuestion.points);
      setTimeout(handleNextQuestion, 1500);
    } else {
      handleIncorrectAnswer();
    }
  };

  const handleEnumerationAnswer = () => {
    if (!quiz) return;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const correctAnswers = JSON.parse(currentQuestion.options as string);

    // Filter out empty answers
    const validAnswers = enumerationAnswers.filter((answer) => answer?.trim());

    if (validAnswers.length === 0) {
      handleIncorrectAnswer();
      return;
    }

    // Calculate partial points based on correct answers
    let correctCount = 0;
    const matchedAnswers = new Set(); // Track which correct answers have been matched

    validAnswers.forEach((answer) => {
      const normalizedAnswer = answer.trim().toLowerCase();
      // Find a correct answer that hasn't been matched yet
      const matchIndex = correctAnswers.findIndex(
        (correct: { text: string; id: number }) =>
          !matchedAnswers.has(correct.id) &&
          normalizedAnswer === correct.text.trim().toLowerCase(),
      );

      if (matchIndex !== -1) {
        correctCount++;
        matchedAnswers.add(correctAnswers[matchIndex].id);
      }
    });

    // Calculate points: 1 point per correct answer
    const earnedPoints = correctCount;

    if (earnedPoints > 0) {
      handleCorrectAnswer(earnedPoints);
      if (earnedPoints < correctAnswers.length) {
        // Show correct answers if not all were correct
        handleIncorrectAnswer();
      } else {
        setTimeout(handleNextQuestion, 1500);
      }
    } else {
      handleIncorrectAnswer();
    }
  };

  // Update the Enumeration question display to show score feedback
  const renderEnumerationFeedback = () => {
    if (!quiz || answerStatus !== 'incorrect') return null;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const correctAnswers = JSON.parse(currentQuestion.options as string);
    const validAnswers = enumerationAnswers.filter((answer) => answer?.trim());
    let correctCount = 0;
    const matchedAnswers = new Set();

    validAnswers.forEach((answer) => {
      const normalizedAnswer = answer.trim().toLowerCase();
      const matchIndex = correctAnswers.findIndex(
        (correct: { text: string; id: number }) =>
          !matchedAnswers.has(correct.id) &&
          normalizedAnswer === correct.text.trim().toLowerCase(),
      );

      if (matchIndex !== -1) {
        correctCount++;
        matchedAnswers.add(correctAnswers[matchIndex].id);
      }
    });

    return (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg w-full">
        <div className="mb-2">
          <Text strong className="text-green-700">
            You got {correctCount} out of {correctAnswers.length} correct
            answers
          </Text>
        </div>
        <div className="mb-2">
          <Text strong className="text-green-700">
            Correct Answers:
          </Text>
        </div>
        {correctAnswers.map((answer: { text: string }, index: number) => (
          <div key={index} className="text-green-600">
            <Text>
              {index + 1}. {answer.text}
            </Text>
          </div>
        ))}
      </div>
    );
  };

  const handleNextQuestion = () => {
    setShowCorrectAnswer(false);
    setAnswerStatus(null);
    setIdentificationAnswer('');
    setBlankAnswers([]);
    setEnumerationAnswers([]);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeLeft(quiz.questions[currentQuestionIndex + 1].time);
    } else {
      completeQuiz();
    }
  };

  const handleBackToMenu = () => {
    api.window.openInTray(WindowIdentifier.Dashboard);
    api.window.close(WindowIdentifier.QuizPlayer);
  };

  useEffect(() => {
    if (!quiz || quizCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
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

  if (countdown > 0) {
    return (
      <div className="flex items-center justify-center h-screen text-5xl bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white">
        Starting in {countdown}...
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-center h-screen text-2xl bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white">
        Loading quiz...
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
      message = "Don't Give Up!";
      emoji = '🎯';
    }

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
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
            onClick={() => handleBackToMenu()}
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
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex-grow flex flex-col justify-center mb-8"
      >
        <div className="bg-white text-gray-800 p-8 rounded-lg shadow-2xl mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-semibold">
              <span className="text-purple-600 mr-2">
                Q{currentQuestionIndex + 1}.
              </span>
              {currentQuestion.type === 'Fill in the Blank'
                ? // Replace underscores with input fields
                  currentQuestion.question.split(/(_+)/).map((part, index) => {
                    if (part.match(/^_+$/)) {
                      const blankIndex = Math.floor(index / 2);
                      return (
                        <input
                          key={index}
                          type="text"
                          className={`mx-2 px-3 py-1 border-b-2 focus:outline-none focus:border-purple-500 ${
                            answerStatus === 'correct'
                              ? 'border-green-500 bg-green-50'
                              : answerStatus === 'incorrect'
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-300'
                          }`}
                          style={{ width: '120px' }}
                          value={blankAnswers[blankIndex] || ''}
                          onChange={(e) => {
                            const newAnswers = [...blankAnswers];
                            newAnswers[blankIndex] = e.target.value;
                            setBlankAnswers(newAnswers);
                          }}
                          disabled={answerStatus !== null}
                        />
                      );
                    }
                    return <span key={index}>{part}</span>;
                  })
                : currentQuestion.type === 'Identification'
                  ? currentQuestion.question
                  : currentQuestion.type === 'Enumeration'
                    ? currentQuestion.question
                    : currentQuestion.question}
            </h2>
            <div className="text-2xl font-bold text-purple-600">
              {timeLeft}s
            </div>
          </div>

          <div className="relative w-full h-4 bg-gray-200 rounded-full mb-8">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: timeLeft, ease: 'linear' }}
            />
          </div>

          {currentQuestion.type === 'Fill in the Blank' ? (
            <div className="flex justify-end mt-4">
              <button
                className={`bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-2 rounded-lg transition-opacity ${
                  answerStatus !== null ||
                  !blankAnswers.some((answer) => answer?.trim())
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:opacity-90'
                }`}
                onClick={() => handleBlankAnswer(blankAnswers)}
                disabled={
                  answerStatus !== null ||
                  !blankAnswers.some((answer) => answer?.trim())
                }
              >
                Check Answer
              </button>
              {answerStatus === 'incorrect' &&
                showCorrectAnswer &&
                getCorrectAnswerDisplay(currentQuestion)}
            </div>
          ) : currentQuestion.type === 'Identification' ? (
            <div className="mt-8">
              <input
                type="text"
                className={`w-full p-4 text-lg border-2 rounded-lg focus:outline-none focus:border-purple-500 transition-colors ${
                  answerStatus === 'correct'
                    ? 'border-green-500 bg-green-50'
                    : answerStatus === 'incorrect'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                }`}
                placeholder="Type your answer here"
                value={identificationAnswer}
                onChange={(e) => setIdentificationAnswer(e.target.value)}
                disabled={answerStatus !== null}
                onKeyPress={(e) => {
                  if (
                    e.key === 'Enter' &&
                    identificationAnswer.trim() &&
                    !answerStatus
                  ) {
                    handleIdentificationAnswer();
                  }
                }}
              />
              <div className="flex justify-end mt-4">
                <button
                  className={`bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-all ${
                    answerStatus !== null || !identificationAnswer.trim()
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:opacity-90 hover:scale-105'
                  }`}
                  onClick={handleIdentificationAnswer}
                  disabled={
                    answerStatus !== null || !identificationAnswer.trim()
                  }
                >
                  Submit Answer
                </button>
                {answerStatus === 'incorrect' &&
                  showCorrectAnswer &&
                  getCorrectAnswerDisplay(currentQuestion)}
              </div>
            </div>
          ) : currentQuestion.type === 'Enumeration' ? (
            <div className="mt-8">
              <div className="space-y-4">
                {Array.from({
                  length: JSON.parse(currentQuestion.options as string).length,
                }).map((_, index) => (
                  <input
                    key={index}
                    type="text"
                    className={`w-full p-4 text-lg border-2 rounded-lg focus:outline-none focus:border-purple-500 transition-colors ${
                      answerStatus === 'correct'
                        ? 'border-green-500 bg-green-50'
                        : answerStatus === 'incorrect'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                    }`}
                    placeholder={`Answer ${index + 1}`}
                    value={enumerationAnswers[index] || ''}
                    onChange={(e) => {
                      const newAnswers = [...enumerationAnswers];
                      newAnswers[index] = e.target.value;
                      setEnumerationAnswers(newAnswers);
                    }}
                    disabled={answerStatus !== null}
                    onKeyPress={(e) => {
                      if (
                        e.key === 'Enter' &&
                        enumerationAnswers.length ===
                          JSON.parse(currentQuestion.options as string).length
                      ) {
                        handleEnumerationAnswer();
                      }
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  className={`bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-all ${
                    answerStatus !== null ||
                    !enumerationAnswers.some((answer) => answer?.trim())
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:opacity-90 hover:scale-105'
                  }`}
                  onClick={handleEnumerationAnswer}
                  disabled={
                    answerStatus !== null ||
                    !enumerationAnswers.some((answer) => answer?.trim())
                  }
                >
                  Submit Answers
                </button>
                {answerStatus === 'incorrect' &&
                  showCorrectAnswer &&
                  renderEnumerationFeedback()}
              </div>
            </div>
          ) : (
            // Modified multiple choice rendering with letters
            <ul className="space-y-4">
              <AnimatePresence>
                {(
                  JSON.parse(currentQuestion.options as string) as QuizOption[]
                ).map((option, index) => {
                  const isSelected =
                    selectedAnswers[currentQuestionIndex] === option.text;
                  const bgColor = isSelected
                    ? answerStatus === 'correct'
                      ? 'bg-green-500'
                      : answerStatus === 'incorrect'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    : 'bg-gray-100 hover:bg-gray-200';
                  const letter = String.fromCharCode(65 + index); // Convert 0 to 'A', 1 to 'B', etc.

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
                        disabled={
                          selectedAnswers[currentQuestionIndex] !== null
                        }
                      >
                        <span className="inline-block w-8 font-semibold">
                          {letter}.
                        </span>
                        {option.text}
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </motion.div>
      <div className="flex justify-between items-center text-xl font-semibold mb-4">
        <div>
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </div>
        <div>Points: {currentQuestion.points}</div>
      </div>
    </motion.div>
  );
};

(() => {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Failed to find the root element.');
  }
  ReactDOM.createRoot(container).render(<QuizPlayer />);
})();
