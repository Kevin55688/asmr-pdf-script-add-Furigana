import { useCallback, useRef, useState } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  collapsed?: boolean;
  fileName?: string;
  onReset?: () => void;
}

export function FileUploader({
  onFileSelect,
  disabled,
  collapsed,
  fileName,
  onReset,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  // 收起態
  if (collapsed) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-[#FFF5F5] px-4 py-3 transition-all duration-300">
        <div className="flex items-center gap-2 text-ink">
          <span className="text-vermilion">📄</span>
          <span className="text-sm font-medium">{fileName}</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-vermilion hover:text-vermilion-light transition-colors"
        >
          重新選擇
        </button>
      </div>
    );
  }

  // 展開態
  return (
    <div
      className={[
        'rounded-lg border-2 border-dashed border-vermilion p-12 text-center cursor-pointer transition-all duration-300',
        isDragging ? 'border-solid bg-[#FFF5F5]' : 'bg-paper hover:bg-[#FFF5F5] hover:border-solid',
        disabled ? 'opacity-50 pointer-events-none' : '',
      ].join(' ')}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="mb-3 text-4xl text-vermilion">☁</div>
      <p className="text-base font-medium text-ink">拖放 PDF 至此</p>
      <p className="mt-1 text-sm text-ink-light">或 點擊選擇檔案</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        disabled={disabled}
        hidden
      />
    </div>
  );
}
