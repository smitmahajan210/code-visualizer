import { FiSun, FiMoon } from 'react-icons/fi';

export default function ThemeToggle({ darkMode, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm
        transition-all duration-200 shadow-lg
        ${
          darkMode
            ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300'
            : 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
        }
      `}
    >
      {darkMode ? (
        <>
          <FiSun className="w-4 h-4" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <FiMoon className="w-4 h-4" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
}
