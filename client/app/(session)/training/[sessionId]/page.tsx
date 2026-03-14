import { MeetingRoom } from "@/components/organisms/MeetingRoom";

type TrainingSessionPageProps = {
    params: Promise<{
        sessionId: string;
    }>;
};

export default async function TrainingSessionPage({
    params,
}: TrainingSessionPageProps) {
    const { sessionId } = await params;
    return <MeetingRoom initialSessionId={sessionId} />;
}
