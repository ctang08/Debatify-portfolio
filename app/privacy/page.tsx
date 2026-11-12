'use client';
import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col mt-10 ml-5 mr-5 mb-20 defaulttext">
      <h1 className="text-3xl font-semibold mb-3">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-6">Effective Date: July 15, 2025</p>

      <p className="mb-4">
        This Privacy Policy explains how we collect, use, and protect your information when you use this website (the "Site"). By accessing or using the Site, you consent to this Policy.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Information We Collect</h2>
      <p className="mb-4">
        We may collect, store, and process information including but not limited to:
        <ul className="list-disc list-inside mt-2">
          <li>Email addresses</li>
          <li>Login credentials (such as hashed passwords)</li>
          <li>Payment information (processed through Stripe)</li>
          <li>Technical and usage data (IP address, device type, access logs, etc.) via Vercel and Supabase</li>
        </ul>
        Additional data may be collected automatically or manually for performance monitoring, debugging, analytics, abuse prevention, site functionality, and system security. This list is not exhaustive.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. How We Collect It</h2>
      <p className="mb-4">
        We collect data when you:
        <ul className="list-disc list-inside mt-2">
          <li>Create an account or log in</li>
          <li>Interact with features</li>
          <li>Make a purchase through Stripe</li>
          <li>Access the site, which generates analytics and logs via Vercel and Supabase</li>
        </ul>
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. How We Use Your Information</h2>
      <p className="mb-4">
        Your information may be used to:
        <ul className="list-disc list-inside mt-2">
          <li>Enable and secure account-based features</li>
          <li>Perform website functionality</li>
          <li>Process payments and provide transaction records</li>
          <li>Monitor traffic, prevent abuse, and improve site performance</li>
          <li>Debug errors or address security issues</li>
          <li>Send updates or respond to support requests</li>
          <li>This list is not exhaustive</li>
        </ul>
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. How We Share Your Information</h2>
      <p className="mb-4">
        We do not sell or rent your personal data. We may share it with trusted service providers as needed to operate the Site:
        <ul className="list-disc list-inside mt-2">
          <li>Supabase (database, authentication, logging)</li>
          <li>Stripe (payment processing)</li>
          <li>Vercel (hosting, performance monitoring)</li>
          <li>Other service providers or contractors who help maintain or improve the platform</li>
        </ul>
        These third parties are expected to handle your data in accordance with applicable laws and only for the intended purposes.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">5. Data Security</h2>
      <p className="mb-4">
        We implement reasonable technical and organizational safeguards to protect your data, including secure storage of passwords. However, no system is 100% secure.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">6. Children's Privacy</h2>
      <p className="mb-4">
        This Site is not intended for children under 13. We do not knowingly collect personal information from children.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">7. Your Rights</h2>
      <p className="mb-4">
        You may request access to, correction of, or deletion of your data by contacting us. We will respond to such requests as required by law.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">8. Changes to This Policy</h2>
      <p className="mb-4">
        We may revise this Privacy Policy at any time. Changes will be posted to this page with a new effective date.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">9. Contact</h2>
      <p className="mb-6">
        If you have any questions or concerns about this Privacy Policy, please contact us at:
        <br />
        <a href="mailto:debatify.app@gmail.com" className="underline">debatify.app@gmail.com</a> 
      </p>

      {/* Return to Main Site Button */}
      <a
        href="/"
        className="self-start inline-block px-4 py-2 mt-4 simpleform"
      >
        Return to Main Site
      </a>
    </div>
  );
}
