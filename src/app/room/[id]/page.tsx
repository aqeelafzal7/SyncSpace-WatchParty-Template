import { RoomClient } from '@/components/room/RoomClient';

/**
 * @fileOverview Room page wrapper.
 * Configured for the Edge runtime. Standard import is used, 
 * with hydration safety handled inside the RoomClient component.
 */

export const runtime = 'edge';

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <RoomClient roomId={id} />;
}
