import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HtmlPreview } from './HtmlPreview';

describe('HtmlPreview', () => {
  it('顯示頁數標題', () => {
    render(<HtmlPreview html="<p>測試</p>" pageCount={3} />);
    expect(screen.getByText('預覽（共 3 頁）')).toBeInTheDocument();
  });

  it('渲染 HTML 內容', () => {
    render(<HtmlPreview html="<p>日本語テスト</p>" pageCount={1} />);
    expect(screen.getByText('日本語テスト')).toBeInTheDocument();
  });

  it('渲染 ruby 振り仮名標籤', () => {
    const html = '<ruby>漢字<rt>かんじ</rt></ruby>';
    const { container } = render(<HtmlPreview html={html} pageCount={1} />);
    expect(container.querySelector('ruby')).toBeInTheDocument();
    expect(container.querySelector('rt')).toBeInTheDocument();
  });

  it('pageCount 為 1 時顯示正確頁數', () => {
    render(<HtmlPreview html="" pageCount={1} />);
    expect(screen.getByText('預覽（共 1 頁）')).toBeInTheDocument();
  });
});
