'use client';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
interface Certificate { id: string; issuedAt: string; performanceSummary: string; learningPath: { title: string }; }
export default function AwardsPage() {
  const { data: certificates = [], isLoading, isError } = useQuery<Certificate[]>({ queryKey: ['studentCertificates'], queryFn: () => apiFetch('/progress/certificates') });
  return <section className="w-full rounded-xl border border-[#d6e0db] bg-white p-5">
    <h2 className="font-semibold">Earned certificates</h2>
    {isLoading || isError || certificates.length === 0 ? <p className="mt-3 text-sm text-[#56635c]">{isLoading ? 'Loading certificates…' : isError ? 'Unable to load certificates.' : 'No certificates earned yet.'}</p> : <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{certificates.map(certificate => <article key={certificate.id} className="rounded-lg border border-[#d6e0db] p-4"><h3 className="font-semibold">{certificate.learningPath.title}</h3><p className="mt-2 text-sm">{certificate.performanceSummary}</p><p className="mt-2 text-xs text-[#56635c]">Issued {new Date(certificate.issuedAt).toLocaleDateString()}</p></article>)}</div>}
  </section>;
}
