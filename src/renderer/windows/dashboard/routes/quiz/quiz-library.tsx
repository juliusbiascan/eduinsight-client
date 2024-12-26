import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, MoreOutlined, PlayCircleOutlined, EditOutlined, DeleteOutlined, CloseOutlined, LoadingOutlined, SearchOutlined, BookOutlined, FileOutlined, QuestionCircleOutlined, TagOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Dropdown, Menu, Typography, Space, Row, Col, Modal, Spin, Layout, Input, Tooltip, Select, Form } from 'antd';
import { DeviceUser, Quiz, QuizQuestion, Subject } from '@prisma/client';
import { useToast } from '@/renderer/hooks/use-toast';
import { debounce } from 'lodash';

const { Title, Text } = Typography;
const { Header, Sider, Content } = Layout;
const { Option } = Select;

const QuizLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('published');
  const [user, setUser] = useState<DeviceUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [publishedQuizzes, setPublishedQuizzes] = useState<(Quiz & { questions: QuizQuestion[], subject: Subject })[]>([]);
  const [draftQuizzes, setDraftQuizzes] = useState<(Quiz & { questions: QuizQuestion[], subject: Subject })[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const devices = await api.database.getDevice();
        if (devices && devices.length > 0) {
          const activeUsers = await api.database.getActiveUserByDeviceId(devices[0].id, devices[0].labId);
          if (activeUsers && activeUsers.length > 0) {
            const users = await api.database.getDeviceUserByActiveUserId(activeUsers[0].userId);
            if (users && users.length > 0) {
              setUser(users[0]);
              const fetchedQuizzes = await api.database.getQuizzesByUserId(users[0].id);
              const published = fetchedQuizzes.filter(quiz => quiz.published);
              const drafts = fetchedQuizzes.filter(quiz => !quiz.published);
              setPublishedQuizzes(published);
              setDraftQuizzes(drafts);

              // Fetch subjects
              const fetchedSubjects = await api.database.getSubjectsByLabId(users[0].labId);
              setSubjects(fetchedSubjects);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch user data",
          variant: "destructive",
        })
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [toast]);

  const handleDeleteQuiz = async (quiz: Quiz) => {
    setQuizToDelete(quiz);
  };

  const confirmDeleteQuiz = async () => {
    if (quizToDelete) {
      try {
        await api.database.deleteQuiz(quizToDelete.id);
        if (quizToDelete.published) {
          setPublishedQuizzes(publishedQuizzes.filter(q => q.id !== quizToDelete.id));
        } else {
          setDraftQuizzes(draftQuizzes.filter(q => q.id !== quizToDelete.id));
        }
        toast({
          title: "Success",
          description: "Quiz deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting quiz:", error);
        toast({
          title: "Error",
          description: "Failed to delete quiz",
          variant: "destructive",
        });
      } finally {
        setQuizToDelete(null);
      }
    }
  };

  const handleEditQuiz = (quiz: Quiz & { questions: QuizQuestion[], subject: Subject }) => {
    navigate('/quiz/manager', {
      state: {
        user,
        quizId: quiz.id,
      }
    });
  };

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value === 'all' ? null : value);
  };

  const handleSearch = debounce((value: string) => {
    setSearchTerm(value);
  }, 300);

  const filterQuizzes = (quizzes: (Quiz & { questions: QuizQuestion[], subject: Subject })[]) => {
    return quizzes.filter(quiz =>
      (quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.author.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!selectedSubject || quiz.subject?.id === selectedSubject)
    );
  };

  const handlePlayQuiz = (quiz: Quiz & { questions: QuizQuestion[], subject: Subject }) => {
    api.quiz.play(quiz.id);
  };

  const renderQuizGrid = (quizzes: (Quiz & { questions: QuizQuestion[], subject: Subject })[]) => (
    <>
      {filterQuizzes(quizzes).length > 0 ? (
        <Row gutter={[24, 24]}>
          {filterQuizzes(quizzes).map(quiz => (
            <Col xs={24} sm={12} md={12} lg={8} xl={6} key={quiz.id}>
              <Card
                hoverable
                cover={
                  <div style={{ height: 200, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: quiz.color || `hsl(${Math.random() * 360}, 70%, 80%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Title level={4} style={{ color: '#fff', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
                        {quiz.title}
                      </Title>
                    </div>
                  </div>
                }
                actions={[
                  <Tooltip title="Play Quiz">
                    <Button icon={<PlayCircleOutlined />} type="text" onClick={() => handlePlayQuiz(quiz)}>Play</Button>
                  </Tooltip>,
                  <Tooltip title="Edit Quiz">
                    <Button icon={<EditOutlined />} type="text" onClick={() => handleEditQuiz(quiz)}>Edit</Button>
                  </Tooltip>,
                  <Dropdown
                    overlay={
                      <Menu>
                        <Menu.Item
                          key="delete"
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteQuiz(quiz)}
                        >
                          Delete
                        </Menu.Item>
                      </Menu>
                    }
                    placement="bottomRight"
                  >
                    <Button icon={<MoreOutlined />} type="text" />
                  </Dropdown>
                ]}
              >
                <Card.Meta
                  title={<Title level={4} ellipsis={{ rows: 1 }}>{quiz.title}</Title>}
                  description={
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Text type="secondary">
                        <QuestionCircleOutlined /> {quiz.questions.length} Questions
                        
                      </Text>
                      {quiz.subject && (
                        <Text type="secondary">
                          <TagOutlined /> {quiz.subject.name}
                        </Text>
                      )}
                      <Text type="secondary">
                        <UserOutlined /> {quiz.author}
                      </Text>
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Title level={4}>No {activeTab === 'published' ? 'published' : 'draft'} quizzes available</Title>
          <Text type="secondary">
            {activeTab === 'published'
              ? "You haven't published any quizzes yet."
              : "You don't have any draft quizzes at the moment."}
          </Text>
        </div>
      )}
    </>
  );

  const showCreateQuizModal = () => {
    setIsCreateModalVisible(true);
  };

  const handleCreateQuiz = async () => {
    try {
      const values = await form.validateFields();
      const untitledQuiz = {
        userId: user?.id || '',
        title: `Untitled Quiz ${Math.floor(Math.random() * 1000)}`,
  
        author: user?.firstName + ' ' + user?.lastName || 'Anonymous',
        color: '#f0f0f0',
        visibility: 'public',
        published: false,
        subjectId: values.subjectId,
      };

      const createdQuiz = await api.database.createQuiz(untitledQuiz);
      setDraftQuizzes([...draftQuizzes, { ...createdQuiz, questions: [], subject: subjects.find(s => s.id === values.subjectId) }]);

      navigate('/quiz/manager', {
        state: {
          user,
          quizId: createdQuiz.id
        }
      });

    } catch (error) {
      console.error("Error creating quiz:", error);
      toast({
        title: "Error",
        description: "Failed to create quiz",
        variant: "destructive",
      });
    } finally {
      setIsCreateModalVisible(false);
      form.resetFields();
    }
  };

  const handleCloseWindow = () => {
    window.close();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="light">
        <div style={{ padding: '24px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={3}>My Quizify</Title>
          <Text type="secondary">Powered by EduInsight</Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={({ key }) => setActiveTab(key)}
          items={[
            { key: 'published', icon: <BookOutlined />, label: `Published (${publishedQuizzes.length})` },
            { key: 'drafts', icon: <FileOutlined />, label: `Drafts (${draftQuizzes.length})` },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="Search quizzes"
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <Select
              style={{ width: 200 }}
              placeholder="Filter by subject"
              onChange={handleSubjectChange}
              defaultValue="all"
            >
              <Option value="all">All Subjects</Option>
              {subjects.map(subject => (
                <Option key={subject.id} value={subject.id}>{subject.name}</Option>
              ))}
            </Select>
          </Space>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={showCreateQuizModal}>
              Create Quiz
            </Button>
            <Button icon={<CloseOutlined />} onClick={handleCloseWindow} />
          </Space>
        </Header>
        <Content style={{ margin: '24px', background: '#fff', padding: 24, minHeight: 280 }}>
          {activeTab === 'published' ? renderQuizGrid(publishedQuizzes) : renderQuizGrid(draftQuizzes)}
        </Content>
      </Layout>
      <Modal
        title="Delete Quiz"
        visible={!!quizToDelete}
        onOk={confirmDeleteQuiz}
        onCancel={() => setQuizToDelete(null)}
        okText="Delete"
        cancelText="Cancel"
      >
        <p>Are you sure you want to delete the quiz "{quizToDelete?.title}"? This action cannot be undone.</p>
      </Modal>
      <Modal
        title="Create New Quiz"
        visible={isCreateModalVisible}
        onOk={handleCreateQuiz}
        onCancel={() => setIsCreateModalVisible(false)}
        okText="Create"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="subjectId"
            label="Select Subject"
            rules={[{ required: true, message: 'Please select a subject' }]}
          >
            <Select placeholder="Choose a subject">
              {subjects.map(subject => (
                <Option key={subject.id} value={subject.id}>{subject.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default QuizLibrary;