interface QuestionType {
  icon: React.ReactNode;
  label: string;
  category: 'basic' | 'openEnded' | 'interactive' | 'math';
}

const questionTypes: QuestionType[] = [
  { icon: '✅', label: 'Multiple Choice', category: 'basic' },
  { icon: '➖', label: 'Fill in the Blank', category: 'basic' },
  { icon: '✍️', label: 'Identification', category: 'basic' },
  { icon: '📝', label: 'Enumeration', category: 'basic' },
  { icon: '🔗', label: 'True or False', category: 'basic' },
  { icon: '🎨', label: 'Draw (Soon)', category: 'openEnded' },
  { icon: '📊', label: 'Poll (Soon)', category: 'openEnded' },
  { icon: '🔗', label: 'Match', category: 'interactive' },
  { icon: '🔄', label: 'Reorder', category: 'interactive' },
  { icon: '🔀', label: 'Drag and Drop', category: 'interactive' },
  { icon: '⬇️', label: 'Drop Down', category: 'interactive' },
  { icon: '🎯', label: 'Hotspot', category: 'interactive' },
  { icon: '🏷️', label: 'Labeling', category: 'interactive' },
  { icon: '📊', label: 'Categorize', category: 'interactive' },
  { icon: '🧮', label: 'Math Response', category: 'math' },
  { icon: '📈', label: 'Graphing', category: 'math' },
];

export { questionTypes, QuestionType }
