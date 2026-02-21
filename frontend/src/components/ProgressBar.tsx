interface ProgressBarProps {
  message?: string;
}

export function ProgressBar({ message = '振り仮名を処理中...' }: ProgressBarProps) {
  return (
    <div className="my-6 text-center">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-washi-border">
        <div className="h-full animate-[indeterminate_1.5s_infinite_ease-in-out] rounded-full bg-vermilion" />
      </div>
      <p className="mt-2 text-sm text-ink-light">{message}</p>
    </div>
  );
}
