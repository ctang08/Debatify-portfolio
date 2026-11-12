'use client';
import React from 'react';

export default function TermsOfUse() {
  return (
    <div className="flex flex-col mt-10 ml-5 mr-5 mb-20 defaulttext">
      <h1 className="text-3xl font-semibold mb-3">Terms of Use</h1>
      <p className="text-sm text-gray-500 mb-6">Effective Date: July 15, 2025</p>

      <p className="mb-4">
        Welcome to our website. By accessing or using this site (the “Site”), you agree to be bound by these Terms of Use (“Terms”). If you do not agree with these Terms, you should not use the Site.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Acceptance of Terms</h2>
      <p className="mb-4">
        By using the Site, you confirm that you are at least 13 years old and legally able to enter into this agreement. Your continued use of the Site constitutes your acceptance of any future updates to these Terms.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. Use of the Site</h2>
      <p className="mb-4">
        You agree to use the Site for lawful purposes only. You also agree not to hold us responsible for any harm, inconvenience, or damages resulting from your use of the Site.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. Content and Information</h2>
      <p className="mb-4">
        All information provided on this Site is for general informational purposes only. We make no guarantees about its accuracy, completeness, or reliability. Any reliance you place on such information is strictly at your own risk.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. Third-Party Links</h2>
      <p className="mb-4">
        This Site may contain links to third-party websites. We are not responsible for the content, privacy policies, or practices of any third-party sites, and your use of those sites is entirely at your own risk.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">5. Complete Disclaimer of Liability</h2>
      <p className="mb-4">
        To the maximum extent allowed by law, we disclaim all liability for any direct, indirect, incidental, consequential, special, or punitive damages — including but not limited to lost profits, lost data, or personal injury — arising out of or in connection with your use of the Site, even if we have been advised of the possibility of such damages.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">6. Modifications to the Terms</h2>
      <p className="mb-4">
        We reserve the right to change these Terms at any time. Updates will be posted on this page, and continued use of the Site after changes are made constitutes your acceptance of the revised Terms.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">7. Governing Law</h2>
      <p className="mb-4">
        These Terms are governed by the laws of the jurisdiction in which the website operator is based, without regard to conflict of law rules.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">8. Punishment</h2>
      <p className="mb-4">
        We reserve the right to take action against your account, for instance, deletion or lockdown, without refunding any purchases made. We may due this at any time. Possible reasons include but are not limited to account sharing, bot usage, or spam. Account sharing, bot usage, and spam are explicitly prohibited and we have systems in place to counteract them.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">9. Contact Us</h2>
      <p className="mb-6">
        If you have any questions about these Terms, please contact us at:
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
