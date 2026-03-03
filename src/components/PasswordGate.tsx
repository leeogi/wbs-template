import { useState, type ReactNode } from 'react';

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD as string;
const SESSION_KEY = 'wbs-template-auth';

interface Props {
  children: ReactNode;
}

export function PasswordGate({ children }: Props) {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  });
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  if (authenticated) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === APP_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthenticated(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-80">
        <h1 className="text-lg font-bold text-blue-700 mb-1">{(import.meta.env.VITE_APP_TITLE as string) || 'WBS'}</h1>
        <p className="text-xs text-gray-500 mb-6">パスワードを入力してください</p>
        <input
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="パスワード"
          className={`w-full border rounded px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-400 ${error ? 'border-red-500' : 'border-gray-300'}`}
          autoFocus
        />
        {error && <p className="text-red-500 text-xs mb-2">パスワードが違います</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          ログイン
        </button>
      </form>
    </div>
  );
}
