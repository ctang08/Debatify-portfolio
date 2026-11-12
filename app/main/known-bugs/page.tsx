'use client';
import React from 'react';


export default function KnownBugs() {
  return (
    <div className="flex flex-col mt-10 ml-5 mr-5 defaulttext">
      <h1 className="text-3xl font-semibold mb-3">Known Bugs</h1>
      <p className="mb-2 text-lg">
    - Rhetorify doesn't work when the body of the card shares a paragraph with the citation </p>
      <p className="mb-2 text-lg">
    - Rhetorify doesn't work for word, paste into google docs first </p>
      <p className="mb-2 text-lg">
    - Rhetorify doesn't work if the citation is a heading </p>
      <p className="mb-2 text-lg">
    - Occassional issues with contentions not showing the full argument, download the file and take from there </p>
      <p className="mb-2 text-lg">
    - AI searches occasionally utilizes too much memory and fails </p>
    </div>
  );
}
