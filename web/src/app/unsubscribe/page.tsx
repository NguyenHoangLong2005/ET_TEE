import UnsubscribeClient from './UnsubscribeClient';

export const metadata = { title: 'Hủy nhận email ưu đãi | ET.TEE', robots: { index: false } };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  return <UnsubscribeClient token={typeof params.token === 'string' ? params.token : ''} />;
}
