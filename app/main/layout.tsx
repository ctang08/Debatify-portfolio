"use client";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import SideNav from "../components/sidenav";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const path = pathname ?? ""; // null-safe
  const isOfficeHours = path.startsWith("/main/office-hours");

  const handleDataFromChild = (data: boolean) => {
    setSidebarOpen(data);
  };

  const variants = isOfficeHours
    ? {
        initial: { opacity: 0, x: 0 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 0 },
      }
    : {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
      };

  return (
    <div className="min-h-screen transition-all text-gray-900 dark:text-white">
      <main className="flex min-h-screen">
        {/* Sidebar */}
        <div
          className={`transition-all duration-300 ${
            isSidebarOpen ? "w-64" : "w-10"
          } dark:bg-gray-800 dark:text-white`}
        >
          <SideNav sendDataToParent={handleDataFromChild} />
        </div>

        {/* Main Content */}
<div
  className={`flex-1 flex flex-col transition-all duration-300 ${
    isSidebarOpen ? 'hidden md:flex' : 'flex'
  } ${isOfficeHours ? 'p-0' : 'p-4'}`}
>
          <div className="relative w-full h-full overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={path}
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
