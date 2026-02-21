interface ProgressBarProps {
  message?: string;
}

export function ProgressBar({ message = '處理中...' }: ProgressBarProps) {
  return (
    <div className="my-6 text-center">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full animate-[indeterminate_1.5s_infinite_ease-in-out] rounded-full bg-blue-500" />
      </div>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
    </div>
  );
}
