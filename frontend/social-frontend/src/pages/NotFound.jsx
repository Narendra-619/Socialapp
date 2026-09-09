import { Link, useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="max-w-xl mx-auto py-32 px-6 text-center fade-in">
      <h1 className="text-[120px] font-thin text-zinc-200 dark:text-zinc-800 leading-none tracking-tighter select-none">
        404
      </h1>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-white -mt-4 mb-3">
        Page not found
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-10 max-w-sm mx-auto">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/feed" className="btn-primary">
          Back to Feed
        </Link>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
