import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LeftOutlined, SaveOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Layout, Button, Select, Radio, Checkbox, Input, Space, Typography, Tabs, Tooltip, Card, message, Divider } from 'antd';
import { questionTypes, QuestionType } from '@/renderer/types/quiz';

const { Header, Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

interface LocationState {
  quizId: string;
  editingQuestion?: any;
  questionType?: QuestionType;
}

interface AnswerOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

const QuizQuestions: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  const { quizId, editingQuestion } = state;
  const [questionType, setQuestionType] = useState<QuestionType>(state.questionType || questionTypes[0]);
  const [timeLimit, setTimeLimit] = useState(editingQuestion?.time || 30);
  const [points, setPoints] = useState(editingQuestion?.points || 1);
  const [answerType, setAnswerType] = useState(
    editingQuestion
      ? JSON.parse(editingQuestion.options).filter((opt: AnswerOption) => opt.isCorrect).length > 1
        ? "multiple"
        : "single"
      : "single"
  );
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>(
    editingQuestion
      ? JSON.parse(editingQuestion.options).map((opt: AnswerOption, index: number) => ({ ...opt, id: index + 1 }))
      : [
        { id: 1, text: "", isCorrect: false },
        { id: 2, text: "", isCorrect: false },
        { id: 3, text: "", isCorrect: false },
        { id: 4, text: "", isCorrect: false },
      ]
  );
  const [question, setQuestion] = useState(editingQuestion?.question || "");

  useEffect(() => {
    if (editingQuestion) {
      setQuestionType(questionTypes.find(type => type.label === editingQuestion.type) || questionTypes[0]);

      // Set answer type based on the number of correct answers
      const correctAnswersCount = JSON.parse(editingQuestion.options).filter((opt: AnswerOption) => opt.isCorrect).length;
      setAnswerType(correctAnswersCount > 1 ? "multiple" : "single");
    }
  }, [editingQuestion]);

  useEffect(() => {
    // Initialize order for new questions based on current highest order
    if (!editingQuestion) {
      const setInitialOrder = async () => {
        const quiz = await api.database.getQuizById(quizId);
        if (quiz?.[0]?.questions) {
          const maxOrder = Math.max(...quiz[0].questions.map(q => q.order ?? 0));
          setAnswerOptions(prev => prev.map((opt, index) => ({
            ...opt,
            order: maxOrder + index + 1
          })));
        }
      };
      setInitialOrder();
    }
  }, [quizId, editingQuestion]);

  const handleAnswerOptionChange = (id: number, text: string) => {
    setAnswerOptions(options =>
      options.map(option =>
        option.id === id ? { ...option, text } : option
      )
    );
  };

  const handleCorrectAnswerChange = (id: number) => {
    setAnswerOptions(options =>
      options.map(option =>
        answerType === "single"
          ? { ...option, isCorrect: option.id === id }
          : option.id === id
            ? { ...option, isCorrect: !option.isCorrect }
            : option
      )
    );
  };

  const addAnswerOption = () => {
    setAnswerOptions(options => [
      ...options,
      { id: options.length + 1, text: "", isCorrect: false },
    ]);
  };

  const deleteAnswerOption = (id: number) => {
    setAnswerOptions(options => options.filter(option => option.id !== id));
  };

  const handleSaveQuestion = async () => {
    if (!question.trim()) {
      message.error('Please enter a question');
      return;
    }
  
    if (questionType.label === "Identification") {
      const validAnswers = answerOptions.filter(opt => opt.text.trim());
      if (validAnswers.length === 0) {
        message.error('Please provide at least one possible answer');
        return;
      }
  
      // Format the options specifically for Identification
      // Remove empty answers and set all as correct
      const formattedOptions = validAnswers.map(({ text }) => ({
        id: Math.random(), // Generate new IDs for each answer
        text: text.trim(),
        isCorrect: true // All answers are considered correct in Identification
      }));
  
      const questionData = {
        quizId,
        question: question.trim(),
        options: JSON.stringify(formattedOptions),
        type: questionType.label,
        time: timeLimit,
        order: editingQuestion?.order ?? undefined, // Preserve existing order when editing
        points,
      };
  
      try {
        let response;
        if (editingQuestion) {
          response = await api.database.updateQuizQuestion(editingQuestion.id, questionData);
        } else {
          response = await api.database.createQuizQuestionByQuizId(quizId, questionData);
        }
  
        if (response) {
          message.success(`Question ${editingQuestion ? 'updated' : 'saved'} successfully`);
          navigate('/quiz-manager', { state: { quizId } });
        } else {
          message.error(`Failed to ${editingQuestion ? 'update' : 'save'} question`);
        }
      } catch (error) {
        console.error('Error saving/updating question:', error);
        message.error('An error occurred while saving/updating the question');
      }
      return;
    }
  
    if (questionType.label === "Enumeration") {
      const validAnswers = answerOptions.filter(opt => opt.text.trim());
      if (validAnswers.length === 0) {
        message.error('Please provide at least one answer');
        return;
      }
  
      // Format options for Enumeration
      // Each answer is worth 1 point, total points equals number of required answers
      const formattedOptions = validAnswers.map(({ text }, index) => ({
        id: index + 1,
        text: text.trim(),
        isCorrect: true
      }));
  
      const questionData = {
        quizId,
        question: question.trim(),
        options: JSON.stringify(formattedOptions),
        type: questionType.label,
        time: timeLimit,
        order: editingQuestion?.order ?? undefined,
        // Set points equal to number of answers required
        points: formattedOptions.length,
      };
  
      try {
        let response;
        if (editingQuestion) {
          response = await api.database.updateQuizQuestion(editingQuestion.id, questionData);
        } else {
          response = await api.database.createQuizQuestionByQuizId(quizId, questionData);
        }
  
        if (response) {
          message.success(`Question ${editingQuestion ? 'updated' : 'saved'} successfully`);
          navigate('/quiz-manager', { state: { quizId } });
        } else {
          message.error(`Failed to ${editingQuestion ? 'update' : 'save'} question`);
        }
      } catch (error) {
        console.error('Error saving/updating question:', error);
        message.error('An error occurred while saving/updating the question');
      }
      return;
    }
  
    // Rest of the existing question type handling
    if (questionType.label === "Fill in the Blank") {
      const blankCount = (question.match(/_+/g) || []).length;
      
      if (!question.includes('_')) {
        message.error('Please include at least one blank (using underscores) in your question');
        return;
      }
  
      if (blankCount !== answerOptions.length) {
        message.error(`Number of blanks (${blankCount}) doesn't match number of answers (${answerOptions.length})`);
        return;
      }
  
      if (answerOptions.some(option => !option.text.trim())) {
        message.error('Please provide all correct answers');
        return;
      }
    }
  
    if (answerOptions.filter(option => option.text.trim()).length < 2 && 
        questionType.label !== "Fill in the Blank" && 
        questionType.label !== "Identification") {
      message.error('Please provide at least two answer options');
      return;
    }
  
    if (!answerOptions.some(option => option.isCorrect) && questionType.label !== "Fill in the Blank") {
      message.error('Please select at least one correct answer');
      return;
    }
  
    if (questionType.label === "Identification") {
      if (answerOptions.filter(opt => opt.text.trim()).length === 0) {
        message.error('Please provide at least one correct answer');
        return;
      }
      
      // Set all answers as correct for Identification
      setAnswerOptions(answerOptions.map(opt => ({ ...opt, isCorrect: true })));
    }
  
    // For Fill in the Blank, all options are correct answers
    const questionData = {
      quizId,
      question: question.trim(),
      options: JSON.stringify(
        questionType.label === "Fill in the Blank"
          ? answerOptions.map(({ id, text }) => ({
              id,
              text: text.trim(),
              isCorrect: true,
            })).filter(option => option.text)
          : answerOptions.map(({ id, text, isCorrect }) => ({
              id,
              text: text.trim(),
              isCorrect,
            })).filter(option => option.text)
      ),
      type: questionType.label,
      time: timeLimit,
      points,
      order: editingQuestion?.order ?? undefined // Preserve existing order when editing
    };
  
    try {
      let response;
      if (editingQuestion) {
        response = await api.database.updateQuizQuestion(editingQuestion.id, questionData);
        if (response) {
          message.success('Question updated successfully');
        } else {
          message.error('Failed to update question');
        }
      } else {
        response = await api.database.createQuizQuestionByQuizId(quizId, questionData);
        if (response) {
          message.success('Question saved successfully');
        } else {
          message.error('Failed to save question');
        }
      }
  
      if (response) {
        navigate('/quiz-manager', { state: { quizId } });
      }
    } catch (error) {
      console.error('Error saving/updating question:', error);
      message.error('An error occurred while saving/updating the question');
    }
  };

  const renderQuestionContent = () => {
    switch (questionType.label) {
      case "Multiple Choice":
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <TextArea
              rows={4}
              placeholder="Type question here"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
            <Tabs activeKey={answerType} onChange={setAnswerType}>
              <Tabs.TabPane tab="Single correct answer" key="single">
                <Radio.Group
                  style={{ width: '100%' }}
                  value={answerOptions.find(option => option.isCorrect)?.id}
                  onChange={(e) => handleCorrectAnswerChange(e.target.value)}
                >
                  {answerOptions.map((option) => (
                    <Card key={option.id} style={{ marginBottom: '8px' }}>
                      <Space>
                        <Radio value={option.id} />
                        <Input
                          value={option.text}
                          onChange={(e) => handleAnswerOptionChange(option.id, e.target.value)}
                          placeholder={`Option ${option.id}`}
                          style={{ width: '300px' }}
                        />
                        <Button
                          icon={<DeleteOutlined />}
                          onClick={() => deleteAnswerOption(option.id)}
                          disabled={answerOptions.length <= 2}
                        />
                      </Space>
                    </Card>
                  ))}
                </Radio.Group>
              </Tabs.TabPane>
              <Tabs.TabPane tab="Multiple correct answers" key="multiple">
                {answerOptions.map((option) => (
                  <Card key={option.id} style={{ marginBottom: '8px' }}>
                    <Space>
                      <Checkbox
                        checked={option.isCorrect}
                        onChange={() => handleCorrectAnswerChange(option.id)}
                      />
                      <Input
                        value={option.text}
                        onChange={(e) => handleAnswerOptionChange(option.id, e.target.value)}
                        placeholder={`Option ${option.id}`}
                        style={{ width: '300px' }}
                      />
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => deleteAnswerOption(option.id)}
                        disabled={answerOptions.length <= 2}
                      />
                    </Space>
                  </Card>
                ))}
              </Tabs.TabPane>
            </Tabs>
            <Button icon={<PlusOutlined />} onClick={addAnswerOption} style={{ marginTop: '16px' }}>
              Add another option
            </Button>
          </Space>
        );
      case "Fill in the Blank":
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Title level={5}>Enter your question text and use underscores (_____) to mark blanks</Typography.Title>
            <TextArea
              rows={4}
              placeholder="Example: The capital of France is _____."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
            <Typography.Text type="secondary">
              Each blank will be treated as a separate answer field
            </Typography.Text>
            <Divider>Correct Answers</Divider>
            {answerOptions.map((option) => (
              <Card key={option.id} style={{ marginBottom: '8px' }}>
                <Space>
                  <Typography.Text>Blank {option.id}:</Typography.Text>
                  <Input
                    value={option.text}
                    onChange={(e) => handleAnswerOptionChange(option.id, e.target.value)}
                    placeholder="Enter correct answer"
                    style={{ width: '300px' }}
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => deleteAnswerOption(option.id)}
                    disabled={answerOptions.length <= 1}
                  />
                </Space>
              </Card>
            ))}
            <Button icon={<PlusOutlined />} onClick={addAnswerOption} style={{ marginTop: '16px' }}>
              Add another answer
            </Button>
          </Space>
        );
      case "Identification":
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <TextArea
              rows={4}
              placeholder="Type your question here"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
            <Typography.Title level={5}>Possible Correct Answers</Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '16px' }}>
              Add multiple possible answers that will be considered correct. The student's answer will be marked as correct if it matches any of these (case-insensitive).
            </Typography.Text>
            {answerOptions.map((option) => (
              <Card key={option.id} style={{ marginBottom: '8px' }}>
                <Space>
                  <Input
                    value={option.text}
                    onChange={(e) => handleAnswerOptionChange(option.id, e.target.value)}
                    placeholder="Enter possible answer"
                    style={{ width: '300px' }}
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => deleteAnswerOption(option.id)}
                    disabled={answerOptions.length <= 1}
                  />
                </Space>
              </Card>
            ))}
            <Button icon={<PlusOutlined />} onClick={addAnswerOption} style={{ marginTop: '16px' }}>
              Add another possible answer
            </Button>
          </Space>
        );
      case "Enumeration":
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <TextArea
              rows={4}
              placeholder="Type your question here (e.g., List down 3 types of...)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
            <Typography.Title level={5}>Accepted Answers</Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '16px' }}>
              Add all possible correct answers. Students must list the exact number of required items.
              The order of answers doesn't matter.
            </Typography.Text>
            {answerOptions.map((option) => (
              <Card key={option.id} style={{ marginBottom: '8px' }}>
                <Space>
                  <Typography.Text>{option.id}.</Typography.Text>
                  <Input
                    value={option.text}
                    onChange={(e) => handleAnswerOptionChange(option.id, e.target.value)}
                    placeholder="Enter accepted answer"
                    style={{ width: '300px' }}
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => deleteAnswerOption(option.id)}
                    disabled={answerOptions.length <= 1}
                  />
                </Space>
              </Card>
            ))}
            <Button icon={<PlusOutlined />} onClick={addAnswerOption} style={{ marginTop: '16px' }}>
              Add another answer
            </Button>
          </Space>
        );
      default:
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Title level={3}>This question type is under development.</Title>
          </div>
        );
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <Space>
          <Button icon={<LeftOutlined />} onClick={() => navigate(-1)} />
          <Select
            value={questionType.label}
            style={{ width: 180 }}
            onChange={(value) => {
              const newType = questionTypes.find(type => type.label === value);
              if (newType) setQuestionType(newType);
            }}
          >
            {questionTypes.map((type) => (
              <Option key={type.label} value={type.label}>
                {type.icon} {type.label}
              </Option>
            ))}
          </Select>
        </Space>
        <Space>
          <Select value={points.toString()} style={{ width: 120 }} onChange={(value) => setPoints(parseInt(value))}>
            {[1, 2, 3].map((value) => (
              <Option key={value} value={value.toString()}>{value} point{value > 1 ? 's' : ''}</Option>
            ))}
          </Select>
          <Select value={timeLimit.toString()} style={{ width: 140 }} onChange={(value) => setTimeLimit(parseInt(value))}>
            <Option value="30">30 seconds</Option>
            <Option value="60">1 minute</Option>
            <Option value="120">2 minutes</Option>
            <Option value="180">3 minutes</Option>
            <Option value="240">4 minutes</Option>
            <Option value="300">5 minutes</Option>
            <Option value="600">10 minutes</Option>
          </Select>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveQuestion}>
            {editingQuestion ? 'Update question' : 'Save question'}
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space wrap style={{ marginBottom: '16px' }}>
              {['A', 'B', 'I', 'U', 'S'].map((item) => (
                <Tooltip key={item} title={getTooltipLabel(item)}>
                  <Button>{item}</Button>
                </Tooltip>
              ))}
              {['superscript', 'subscript', 'equation'].map((type) => (
                <Tooltip key={type} title={getTooltipLabel(type)}>
                  <Button>
                    {type === 'superscript' && <span>X<sup>2</sup></span>}
                    {type === 'subscript' && <span>X<sub>2</sub></span>}
                    {type === 'equation' && <span>Σ</span>}
                  </Button>
                </Tooltip>
              ))}
            </Space>
            {renderQuestionContent()}
          </Space>
        </Card>
      </Content>
    </Layout>
  );
};

// Helper function to get tooltip labels
const getTooltipLabel = (item: string) => {
  const labels: { [key: string]: string } = {
    'A': 'Font family',
    'B': 'Bold',
    'I': 'Italic',
    'U': 'Underline',
    'S': 'Strikethrough',
    'superscript': 'Superscript',
    'subscript': 'Subscript',
    'equation': 'Insert equation'
  };
  return labels[item] || item;
};

export default QuizQuestions;