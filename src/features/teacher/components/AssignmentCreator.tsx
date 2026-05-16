import React, { useState } from 'react';
import { FileText, Plus, Trash2, Save, Eye } from 'lucide-react';
import { useTheme } from 'hooks/useTheme';

interface AssignmentCreatorProps {
  classId: string;
  onAssign?: (assignment: any) => void;
}

const AssignmentCreator: React.FC<AssignmentCreatorProps> = ({ classId, onAssign }) => {
  const { theme } = useTheme();
  const [assignment, setAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
    subject: 'math',
    points: 100,
    neuroSupport: {
      dyslexia: false,
      dysgraphia: false,
      adhd: false,
      autism: false,
      spd: false
    }
  });

  const handleSubmit = () => {
    if (onAssign) {
      onAssign(assignment);
    }
    alert('Assignment created successfully!');
  };

  return (
    <div className={`p-6 rounded-2xl shadow-xl ${
      theme === 'light' ? 'bg-white' : theme === 'dark' ? 'bg-gray-800' : 'bg-sepia-50'
    }`}>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText className="w-6 h-6 text-neuro-blue" />
        Create Assignment
      </h2>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Assignment Title"
          value={assignment.title}
          onChange={(e) => setAssignment({...assignment, title: e.target.value})}
          className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-900"
        />

        <textarea
          placeholder="Description"
          value={assignment.description}
          onChange={(e) => setAssignment({...assignment, description: e.target.value})}
          rows={3}
          className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-900"
        />

        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            value={assignment.dueDate}
            onChange={(e) => setAssignment({...assignment, dueDate: e.target.value})}
            className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-900"
          />
          <select
            value={assignment.subject}
            onChange={(e) => setAssignment({...assignment, subject: e.target.value})}
            className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="math">Mathematics</option>
            <option value="reading">Reading</option>
            <option value="writing">Writing</option>
            <option value="science">Science</option>
          </select>
        </div>

        <div>
          <h3 className="font-medium mb-2">Neuro-Inclusive Support:</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(assignment.neuroSupport).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setAssignment({
                    ...assignment, 
                    neuroSupport: {...assignment.neuroSupport, [key]: e.target.checked}
                  })}
                />
                <span className="capitalize">{key}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full px-6 py-3 bg-gradient-to-r from-neuro-blue to-neuro-green text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition"
        >
          <Save className="w-4 h-4" />
          Create Assignment
        </button>
      </div>
    </div>
  );
};

export default AssignmentCreator;