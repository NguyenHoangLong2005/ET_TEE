import type { Metadata } from 'next';
import { SearchService } from '@/lib/services/searchService';
import SearchClient from './SearchClient';

export const metadata: Metadata = {
  title: 'Tìm kiếm',
  description: 'Tìm sản phẩm bằng lời mô tả hoặc bằng ảnh.',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const initial = q ? await SearchService.search(q, 24) : null;

  return (
    <div className="container mx-auto px-4 xl:px-8 pt-6 pb-20 min-h-[60vh]">
      {/* key: a new ?q= from the header search must reset the input and any photo result. */}
      <SearchClient key={q} initialQuery={q} initialResult={initial} />
    </div>
  );
}
