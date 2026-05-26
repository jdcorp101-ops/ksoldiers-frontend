import { formatDateKR } from '@/lib/date';

type Props = {
  authorName?: string;
  date: string;
  readMinutes: number;
};

export default function PostAuthor({
  authorName = 'ksoldiers Editorial',
  date,
  readMinutes,
}: Props) {
  const initial = authorName.charAt(0).toUpperCase();
  return (
    <div className="post-author">
      <div className="post-author-avatar" aria-hidden="true">
        {initial}
      </div>
      <div className="post-author-info">
        <div className="post-author-name">By {authorName}</div>
        <div className="post-author-meta">
          <time dateTime={date}>{formatDateKR(date)}</time>
          <span className="post-author-sep">·</span>
          <span>{readMinutes}분 읽기</span>
        </div>
      </div>
    </div>
  );
}
