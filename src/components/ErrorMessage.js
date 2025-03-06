export const ErrorMessage = ({ message }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 max-w-md w-full">
      <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
      <p className="text-gray-300">{message}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-6 w-full py-2 bg-red-500/20 hover:bg-red-500/30 
                 border border-red-500/50 rounded-lg text-red-400
                 transition-all duration-200"
      >
        Retry
      </button>
    </div>
  </div>
); 