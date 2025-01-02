import {
  DialogFooter,
} from '@/renderer/components/ui/dialog';
import { Button } from '@/renderer/components/ui/button';
import { useEffect, useState } from 'react';
import { Modal } from '@/renderer/components/ui/modal';
import { Input } from '@/renderer/components/ui/input'; // Assuming there's an Input component for filtering
import { Select } from '@/renderer/components/ui/select'; // Assuming there's a Select component for rows per page
// eslint-disable-next-line import/no-named-as-default
import styled from 'styled-components'; // Assuming styled-components is being used for styling

interface BeginQuizModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  quizzes: Array<{ id: string; title: string }> | undefined;
  selectedQuiz: string | null;
  setSelectedQuiz: (quizId: string) => void;
  handleStartLiveQuiz: () => void;
  navigate: (path: string) => void;
  selectedSubject: { id: string } | null;
}

const FilterContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const TableContainer = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1rem;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 0.5rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }

  th {
    background-color: #f4f4f4;
  }

  tr:hover {
    background-color: #f1f1f1;
  }
`;

export const BeginQuizModal: React.FC<BeginQuizModalProps> = ({
  isOpen,
  onOpenChange,
  quizzes,
  selectedQuiz,
  setSelectedQuiz,
  handleStartLiveQuiz,
  navigate,
  selectedSubject,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [filter, setFilter] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) {
    return null;
  }

  const filteredQuizzes = quizzes?.filter(quiz => 
    quiz.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Modal
      title="Begin Quiz"
      description="Select a quiz to begin"
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
    >
      <FilterContainer>
        <Input
          placeholder="Filter quizzes"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Select
          value={rowsPerPage.toString()}
          onValueChange={(value: string) => setRowsPerPage(Number(value))}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </Select>
      </FilterContainer>
      <TableContainer>
        <StyledTable>
          <thead>
            <tr>
              <th>Select</th>
              <th>Quiz Title</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuizzes?.slice(0, rowsPerPage).map((quiz) => (
              <tr key={quiz.id}>
                <td>
                  <input
                    type="radio"
                    name="quiz"
                    value={quiz.id}
                    checked={selectedQuiz === quiz.id}
                    onChange={() => setSelectedQuiz(quiz.id)}
                  />
                </td>
                <td>{quiz.title}</td>
              </tr>
            ))}
          </tbody>
        </StyledTable>
      </TableContainer>
      <DialogFooter>
        <Button onClick={handleStartLiveQuiz}>Start Quiz</Button>
        <Button onClick={() => navigate(`/subjects/${selectedSubject?.id}`)}>
          Cancel
        </Button>
      </DialogFooter>
    </Modal>
  );
};
