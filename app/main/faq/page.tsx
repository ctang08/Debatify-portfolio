'use client';
import React from 'react';

export default function FAQ() {
  return (
    <div className="flex flex-col mt-10 ml-5 mr-5 defaulttext">
      <h1 className="text-3xl font-semibold mb-3">Frequently Asked Questions</h1>

      <div className="mb-5">
        <h2 className="text-xl font-semibold mb-1">Do you store our cards?</h2>
        <p className="text-lg">
          No, the only information we store is your login/authentication information and basic analytics. Additionally, Rhetorify only stores your cards locally on your device—nothing is sent to our servers, so we can’t see or access anything you save.
        </p>
      </div>

      <div className="mb-5">
        <h2 className="text-xl font-semibold mb-1">How do I report a bug or give feedback?</h2>
        <p className="text-lg">
          Please email us at{' '}
          <a
            href="mailto:debatify.app@gmail.com"
            className="text-blue-600 hover:underline"
          >
            debatify.app@gmail.com
          </a>
          . We really appreciate your help!
        </p>
      </div>

      <div className="mb-5">
        <h2 className="text-xl font-semibold mb-1">Can I suggest a new feature?</h2>
        <p className="text-lg">
          Absolutely! We love hearing new ideas. Just send us an email and we'll consider it in future updates.
        </p>
      </div>
    </div>
  );
}
