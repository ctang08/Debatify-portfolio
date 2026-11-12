'use client';
import React from 'react';

export default function Welcome() {
  return (
    <div className="flex flex-col mt-10 ml-5 mr-5 defaulttext">
      <h1 className="text-3xl font-semibold mb-3">Welcome!</h1>
      <p className="text-lg mb-3">
        Your account has been successfully confirmed. We're excited to have you on board!
      </p>
      <p className="text-lg">
        Try {' '}
        <a href="/main/login" className="text-blue-600 hover:underline">
          logging in.
        </a>{' '}
      </p>
    </div>
  );
}
