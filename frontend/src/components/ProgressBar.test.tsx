import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('顯示預設訊息「處理中...」', () => {
    render(<ProgressBar />);
    expect(screen.getByText('處理中...')).toBeInTheDocument();
  });

  it('顯示自訂訊息', () => {
    render(<ProgressBar message="轉換中..." />);
    expect(screen.getByText('轉換中...')).toBeInTheDocument();
  });

  it('渲染動畫進度條', () => {
    const { container } = render(<ProgressBar />);
    // 確認有進度條外層容器
    expect(container.firstChild).toBeInTheDocument();
  });
});
