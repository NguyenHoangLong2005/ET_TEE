import ConfirmNewsletterClient from './ConfirmNewsletterClient';

export const metadata = { title: 'Xác nhận đăng ký nhận tin', robots: { index: false } };

export default async function ConfirmNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  return <ConfirmNewsletterClient token={typeof params.token === 'string' ? params.token : ''} />;
}
