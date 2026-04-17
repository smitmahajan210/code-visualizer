import { FiCode, FiHash, FiFileText, FiMessageSquare, FiBox, FiCpu } from 'react-icons/fi';

const STAT_CARDS = [
  { key: 'totalLines', label: 'Total Lines', icon: FiFileText, color: 'from-blue-500 to-blue-600' },
  { key: 'codeLines', label: 'Code Lines', icon: FiCode, color: 'from-green-500 to-green-600' },
  { key: 'commentLines', label: 'Comments', icon: FiMessageSquare, color: 'from-yellow-500 to-yellow-600' },
  { key: 'functionCount', label: 'Functions', icon: FiCpu, color: 'from-purple-500 to-purple-600' },
  { key: 'classCount', label: 'Classes', icon: FiBox, color: 'from-pink-500 to-pink-600' },
  { key: 'charCount', label: 'Characters', icon: FiHash, color: 'from-indigo-500 to-indigo-600' },
];

export default function Stats({ metrics, darkMode }) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className={`stat-card rounded-xl p-4 text-white shadow-lg bg-gradient-to-br ${color}`}
        >
          <div className="flex items-center justify-between mb-2">
            <Icon className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-2xl font-bold">{(metrics[key] ?? 0).toLocaleString()}</div>
          <div className="text-xs opacity-80 mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}
