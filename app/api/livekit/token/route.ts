import { AccessToken, RoomServiceClient, AgentDispatchClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { warmupAgent } from '@/utils/livekit';

export async function POST(req: NextRequest) {
    const body = await req.json();
    console.log('Token Request Body:', body);
    const { agentName } = body;
    const room = body.room || `sona-office-hours-${Date.now()}`;
    await warmupAgent(agentName);
    const username = body.username || 'user-' + Math.random().toString(36).substring(7);

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const at = new AccessToken(apiKey, apiSecret, { identity: username, name: username });

    at.addGrant({
        roomJoin: true,
        room: room,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
    });

    const roomClient = new RoomServiceClient(wsUrl, apiKey, apiSecret);

    console.log(`Ensuring room ${room} exists...`);
    try {
        await roomClient.createRoom({ name: room });
    } catch (e) {
        console.log('Room already exists or could not be created:', e);
    }

    if (agentName === 'parli-tutor-nova') {
        const dispatchClient = new AgentDispatchClient(wsUrl, apiKey, apiSecret);
        console.log(`Dispatching agent ${agentName} to room ${room}...`);
        try {
            const dispatchRes = await dispatchClient.createDispatch(room, agentName, {
                metadata: JSON.stringify({
                    joined_at: Date.now(),
                    room_name: room,
                }),
            });
            console.log('Dispatch result:', dispatchRes);
        } catch (e) {
            console.error('Dispatch failed:', e);
        }
    }

    return NextResponse.json({
        token: await at.toJwt(),
        serverUrl: wsUrl,
        roomName: room,
        participantName: 'user'
    });
}

