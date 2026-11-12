// app/api/sona/route.ts
import { NextRequest, NextResponse } from 'next/server';
// import OpenAI from 'openai';  // or your preferred client

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // TODO: call your ChatGPT backend here.
    // Example (pseudo-code):
    //
    // const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    // const completion = await client.chat.completions.create({
    //   model: 'gpt-4o-mini',
    //   messages,
    // });
    // const reply = completion.choices[0]?.message?.content ?? '';
    //
    const reply =
      "This is a placeholder response from Sona.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ reply: "Sorry, I'm having trouble right now." }, { status: 500 });
  }
}
