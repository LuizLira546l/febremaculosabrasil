import { createFileRoute } from '@tanstack/react-router';
import { answerResearch } from '@/lib/research.server';

export const Route = createFileRoute('/api/research')({ server: { handlers: { POST: ({ request }) => answerResearch(request) } } });