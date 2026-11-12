'use client';

import React, { useEffect, useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { FaBrain, FaFileAlt, FaStar, FaPaperclip, FaBug } from 'react-icons/fa';
import { FiMail, FiMic, FiHelpCircle, FiEdit } from 'react-icons/fi';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/app/account/logout/actions';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface ChildComponentProps {
  sendDataToParent: (data: boolean) => void;
}

async function getUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

type BadgeKind = 'pro' | 'beta' | 'dev' | 'new' | null;

type NavItem =
  | {
    key: 'user';
    type: 'user';
    icon: React.ReactNode;
    href: string;
  }
  | {
    key: 'auth';
    type: 'auth';
  }
  | {
    key: string;
    type: 'route';
    icon: React.ReactNode;
    href: string;
    label: string;
    badge?: BadgeKind;
  };

const SideNav: React.FC<ChildComponentProps> = ({ sendDataToParent }) => {
  const [isHovered, setIsHovered] = useState(false);      // desktop hover
  const [isMobile, setIsMobile] = useState(false);        // viewport check
  const [mobileOpen, setMobileOpen] = useState(false);    // mobile toggle
  const [userData, setUserData] = useState<any>(null);

  const pathname = usePathname();
  const router = useRouter();

  // Fetch user once
  useEffect(() => {
    (async () => setUserData(await getUser()))();
  }, []);

  // Detect mobile (client only)
  useEffect(() => {
    const handleResize = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Final expanded state:
  // - mobile: controlled by mobileOpen
  // - desktop: controlled by hover
  const expanded = isMobile ? mobileOpen : isHovered;

  // Tell parent when width state changes
  useEffect(() => {
    sendDataToParent(expanded);
  }, [expanded, sendDataToParent]);

  const getEmailPrefix = (email: string) => email.split('@')[0];
  const truncateEmail = (email: string, maxLength: number) =>
    email.length > maxLength - 3 ? email.substring(0, maxLength - 3) + '...' : email;

  const userLabel = userData ? truncateEmail(getEmailPrefix(userData.user.email), 18) : 'Guest';

  // -------------------- Config --------------------

  const topItems: NavItem[] = [
    {
      key: 'user',
      type: 'user',
      href: '/main/account',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M12 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 12c-4.97 0-9 2.014-9 4.5V20h18v-1.5c0-2.486-4.03-4.5-9-4.5z" />
        </svg>
      ),
    },
    {
      key: 'search',
      type: 'route',
      href: '/main',
      label: 'Search',
      icon: (
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          className="w-6 h-6"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6 6a7.5 7.5 0 0 0 10.65 10.65z" />
        </svg>
      ),
    },
    // {
    //   key: 'office-hours',
    //   type: 'route',
    //   href: '/main/office-hours',
    //   label: 'Office\u00A0Hours\u00A0',
    //   icon: (
    //     <svg
    //     viewBox="0 0 24 24"
    //     fill="none"
    //     stroke="currentColor"
    //     strokeWidth="2"
    //     strokeLinecap="round"
    //     strokeLinejoin="round"
    //     className="w-6 h-6"
    //     >
    //     <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    //     <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5V4.5z" />
    //     </svg>
    //   ),
    //   badge: 'new',
    // },
    { key: 'rhetorify', type: 'route', href: '/main/rhetorify', label: 'Rhetorify', icon: <FiMic className="w-6 h-6" /> },
    {
      key: 'contentions',
      type: 'route',
      href: '/main/contentions',
      label: 'Browse\u00A0Contentions',
      icon: <FaPaperclip className="w-6 h-6" />,
      badge: 'pro',
    },
    {
      key: 'blockfile',
      type: 'route',
      href: '/main/blockfile',
      label: 'Debatify\u00A0Blockfile',
      icon: <FaFileAlt className="w-6 h-6" />,
      badge: 'pro',
    },
    { key: 'extendify', type: 'route', href: '/main/extendify', label: 'Extendify', icon: <FiEdit className="w-6 h-6" />, badge: 'pro' },
    { key: 'ai', type: 'route', href: '/main/ai', label: 'DebatifyAI', icon: <FaBrain className="w-6 h-6" />, badge: 'beta' },
    { key: 'auth', type: 'auth' },
  ];

  const bottomItems: NavItem[] = [
    {
      key: 'subscriptions',
      type: 'route',
      href: '/main/pricing',
      label: 'Paid\u00A0Plans\u00A0',
      icon: (
        <svg viewBox="0 0 17 20" fill="currentColor" className="w-6 h-6">
          <path d="M7.958 19.393a7.7 7.7 0 0 1-6.715-3.439c-2.868-4.832 0-9.376.944-10.654l.091-.122a3.286 3.286 0 0 0 .765-3.288A1 1 0 0 1 4.6.8c.133.1.313.212.525.347A10.451 10.451 0 0 1 10.6 9.3c.5-1.06.772-2.213.8-3.385a1 1 0 0 1 1.592-.758c1.636 1.205 4.638 6.081 2.019 10.441a8.177 8.177 0 0 1-7.053 3.795Z" />
        </svg>
      ),
      badge: 'new',
    },
    { key: 'contact', type: 'route', href: '/main/contact-us', label: 'Contact\u00A0Us', icon: <FiMail className="w-6 h-6" /> },
    { key: 'faq', type: 'route', href: '/main/faq', label: 'FAQ', icon: <FiHelpCircle className="w-6 h-6" /> },
    { key: 'bug', type: 'route', href: '/main/known-bugs', label: 'Known\u00A0Bugs', icon: <FaBug className="w-6 h-6" /> },
  ];

  // -------------------- Render helpers --------------------

  const renderBadge = (badge?: BadgeKind) => {
    if (!badge) return null;
    if (badge === 'pro' || badge === 'dev' || badge === 'beta') {
      const text = badge === 'pro' ? 'Pro' : badge === 'dev' ? 'Dev' : 'Beta';
      return (
        <span className="inline-flex items-center justify-center px-2 ms-4 text-sm font-medium text-gray-800 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-300">
          {text}
        </span>
      );
    }
    if (badge === 'new') {
      return (
        <span className="inline-flex items-center ms-4 gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <span className="font-bold">New</span>
          <FaStar aria-hidden="true" />
        </span>
      );
    }
    return null;
  };

  const handleRoute = (href: string) => {
    router.push(href);
    if (isMobile) setMobileOpen(false); // auto-close on mobile after navigation
  };

  const renderRouteItem = (item: Extract<NavItem, { type: 'route' }>) => {
    const isActive = !!pathname && (
      pathname === item.href ||
      (
        item.href !== '/main' &&          // prevent main from matching everything
        pathname.startsWith(item.href + '/')
      )
    );

    const btnBase = 'w-full flex items-center p-2 rounded-lg transition duration-200 cursor-pointer';
    const btnActive = 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400';
    const btnInactive = 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700';

    const textClassActive = 'text-blue-600 dark:text-blue-400';
    const textClassInactive = 'group-hover:text-gray-900 dark:group-hover:text-white';

    return (
      <li key={item.key} className="w-full group">
        <button onClick={() => handleRoute(item.href)} className={`${btnBase} ${isActive ? btnActive : btnInactive}`}>
          <span className="shrink-0 mr-0">{item.icon}</span>

          {expanded &&
            (item.badge ? (
              <div className="ms-3 inline-flex whitespace-nowrap items-center transition-colors">
                <span className={`transition-colors ${isActive ? textClassActive : textClassInactive}`}>{item.label}</span>
                {renderBadge(item.badge)}
              </div>
            ) : (
              <span className={`ms-3 transition-colors ${isActive ? textClassActive : textClassInactive}`}>{item.label}</span>
            ))}
        </button>
      </li>
    );
  };

  const renderUserItem = (item: Extract<NavItem, { type: 'user' }>) => {
    const isActive = pathname === item.href;

    const btnBase = 'w-full flex items-center p-2 rounded-lg transition duration-200 cursor-pointer';
    const btnActive = 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400';
    const btnInactive = 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700';

    const textClassActive = 'text-blue-600 dark:text-blue-400';
    const textClassInactive = 'group-hover:text-gray-900 dark:group-hover:text-white';

    return (
      <li key={item.key} className="w-full group">
        <button onClick={() => handleRoute(item.href)} className={`${btnBase} ${isActive ? btnActive : btnInactive}`}>
          <span className="shrink-0">{item.icon}</span>
          {expanded && <span className={`ms-3 transition-colors ${isActive ? textClassActive : textClassInactive}`}>{userLabel}</span>}
        </button>
      </li>
    );
  };

  const renderAuthItem = () => {
    if (userData) {
      return (
        <li key="auth">
          <button
            className="w-full flex cursor-pointer items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 group"
            onClick={() => {
              logout();
              if (isMobile) setMobileOpen(false);
            }}
          >
            <svg
              className="shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M17 2h5v20h-5v-2h3V4h-3V2ZM15 12v-2H5V7l-5 5 5 5v-3h10Z" />
            </svg>
            {expanded && (
              <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white ms-3 whitespace-nowrap">
                Log&nbsp;out
              </span>
            )}
          </button>
        </li>
      );
    }

    return (
      <li key="auth">
        <Link
          href="/account/login"
          onClick={() => isMobile && setMobileOpen(false)}
          className="w-full flex cursor-pointer items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 group"
        >
          <svg
            className="shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M10 2H3c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h7v-2H4V4h6V2zm4 5v3H8v4h6v3l5-5-5-5z" />
          </svg>
          {expanded && <span className="ms-3 whitespace-nowrap">Log&nbsp;in</span>}
        </Link>
      </li>
    );
  };

  const renderItem = (item: NavItem) => {
    if (item.type === 'route') return renderRouteItem(item);
    if (item.type === 'user') return renderUserItem(item);
    if (item.type === 'auth') return renderAuthItem();
    return null;
  };

  // -------------------- JSX --------------------

  return (
    <div
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      className={`fixed top-0 left-0 h-full bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-white
        transition-all duration-300 ease-in-out relative
        ${expanded ? 'w-64' : 'w-12'}
      `}
    >
      {/* Mobile toggle button */}
      <button
        type="button"
        aria-label={mobileOpen ? 'Close sidebar' : 'Open sidebar'}
        onClick={() => setMobileOpen((v) => !v)}
        className={`md:hidden absolute top-2 left-2 inline-flex items-center justify-center rounded-md p-1.5
          text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/60
          transition
        `}
      >
        {mobileOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
      </button>

      <ul className="space-y-2 font-medium pt-10 md:pt-8 w-full">
        {topItems.map(renderItem)}
      </ul>

      <ul className="pt-4 mt-4 space-y-2 font-medium border-t border-gray-200 dark:border-gray-700">
        {bottomItems.map(renderItem)}
      </ul>
    </div>
  );
};

export default SideNav;
