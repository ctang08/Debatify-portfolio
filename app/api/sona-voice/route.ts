import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTS } from 'node-edge-tts';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

// Simple random string generator if uuid is not installed
function randomString() {
    return Math.random().toString(36).substring(2, 15);
}

export async function POST(req: NextRequest) {
    let tempFilePath = '';
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const tts = new EdgeTTS({
            voice: 'en-US-AriaNeural', // High quality, friendly female voice
            lang: 'en-US',
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        });

        // Create a temp file path
        const tempDir = os.tmpdir();
        const fileName = `sona-voice-${randomString()}.mp3`;
        tempFilePath = path.join(tempDir, fileName);

        // Generate audio to file
        await tts.ttsPromise(text, tempFilePath);

        // Read the file
        const audioBuffer = await fs.readFile(tempFilePath);

        // Cleanup
        await fs.unlink(tempFilePath);

        return new NextResponse(audioBuffer as any, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
            },
        });
    } catch (err) {
        console.error('TTS Error:', err);

        // Cleanup if exists
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            } catch (e) {
                // ignore
            }
        }

        return NextResponse.json(
            { error: 'Failed to generate speech' },
            { status: 500 }
        );
    }
}
