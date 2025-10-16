import React from 'react';

interface SaaSInputFormProps {
  description: string;
  setDescription: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

const SaaSInputForm: React.FC<SaaSInputFormProps> = ({
  description,
  setDescription,
  onSubmit,
  isLoading,
  errorMessage,
}) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-4">1. Define Your SaaS Application</h2>
      <p className="text-gray-400 mb-4 text-sm">
        Provide a detailed description of your desired application. The AI orchestrator will use this as the primary input.
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full h-48 p-3 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200 resize-none"
        placeholder="e.g., Build a bookmark manager SaaS..."
        disabled={isLoading}
      />
      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:scale-100"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Orchestrating...
          </>
        ) : (
          'Generate SaaS Application'
        )}
      </button>
      {errorMessage && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default SaaSInputForm;
