import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Book, Settings, HelpCircle } from 'lucide-react';

const Sidebar: React.FC = () => {
  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-6">Quiz App</h1>
      <nav>
        <ul className="space-y-2">
          <li>
            <NavLink to="/dashboard" className="flex items-center p-2 rounded-lg hover:bg-gray-700">
              <Home className="mr-2" size={20} />
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/quizzes" className="flex items-center p-2 rounded-lg hover:bg-gray-700">
              <Book className="mr-2" size={20} />
              Quizzes
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className="flex items-center p-2 rounded-lg hover:bg-gray-700">
              <Settings className="mr-2" size={20} />
              Settings
            </NavLink>
          </li>
          <li>
            <NavLink to="/help" className="flex items-center p-2 rounded-lg hover:bg-gray-700">
              <HelpCircle className="mr-2" size={20} />
              Help
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export { Sidebar };
