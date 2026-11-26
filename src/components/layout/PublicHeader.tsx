"use client";

import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface PublicHeaderProps {
  editionYear: number;
  editionLabel: string;
  isArchived?: boolean;
  basePath?: string;
}

/**
 * Builds a route path prefixed with `basePath` (for archived editions such as `/2026`).
 */
function buildHref(basePath: string | undefined, path: string): string {
  const normalizedBase = basePath ? basePath.replace(/\/+$/, "") : "";
  if (path === "/") {
    return normalizedBase || "/";
  }
  return `${normalizedBase}${path}`;
}

export function PublicHeader({
  editionYear,
  editionLabel,
  isArchived = false,
  basePath,
}: PublicHeaderProps) {
  const [openDropdown, setOpenDropdown] = useState<
    "authors" | "committee" | null
  >(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const toggleDropdown = (menu: "authors" | "committee") => {
    setOpenDropdown((prev) => (prev === menu ? null : menu));
  };

  const closeAllMenus = () => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  };

  const href = (path: string) => buildHref(basePath, path);

  return (
    <header
      ref={headerRef}
      className="top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-lg shadow-md relative"
    >
      {isArchived && (
        <div className="bg-amber-900/95 text-amber-100 text-xs sm:text-sm py-1.5 px-4 text-center border-b border-amber-700/60">
          Viewing archived {editionLabel || `MetaSphere ${editionYear}`} edition.{" "}
          <Link
            href="/"
            className="underline font-semibold text-orange-300 hover:text-orange-200 ml-1"
          >
            Go to current edition
          </Link>
        </div>
      )}

      {/* Banner Section */}
      <div className="relative">
        <img
          src="/Assets/METASPHERE WEBSITE BANNER .svg"
          alt="Conference Banner"
          className="w-full h-auto object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 pointer-events-none" />
      </div>

      {/* Navigation Bar */}
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 py-3">
        {/* Logo */}
        <Link
          href={href("/")}
          onClick={closeAllMenus}
          className="flex items-center space-x-2"
        >
          <span className="text-lg sm:text-xl font-bold text-white">
            {editionLabel || `MetaSphere ${editionYear}`}
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center">
          <nav className="flex items-center space-x-5 text-sm font-medium">
            <Link
              href={href("/")}
              className="text-white hover:text-orange-400 transition"
            >
              Home
            </Link>

            {/* Authors Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown("authors")}
                aria-expanded={openDropdown === "authors"}
                className="text-white hover:text-orange-400 flex items-center cursor-pointer"
              >
                Authors
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </button>
              {openDropdown === "authors" && (
                <div className="absolute mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <Link
                    href={href("/call-for-papers")}
                    onClick={closeAllMenus}
                    className="block px-4 py-2 text-gray-700 hover:bg-orange-100"
                  >
                    Call For Papers
                  </Link>
                  <Link
                    href={href("/paper-submission")}
                    onClick={closeAllMenus}
                    className="block px-4 py-2 text-gray-700 hover:bg-orange-100"
                  >
                    Paper Submission
                  </Link>
                </div>
              )}
            </div>

            <Link
              href={href("/technical-programs")}
              className="text-white hover:text-orange-400 transition"
            >
              Technical Programs
            </Link>
            <Link
              href={href("/registration")}
              className="text-white hover:text-orange-400 transition"
            >
              Registration
            </Link>
            <Link
              href={href("/speakers")}
              className="text-white hover:text-orange-400 transition"
            >
              Keynote Speakers
            </Link>

            {/* Committee Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown("committee")}
                aria-expanded={openDropdown === "committee"}
                className="text-white hover:text-orange-400 flex items-center cursor-pointer"
              >
                Committee
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </button>
              {openDropdown === "committee" && (
                <div className="absolute mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50">
                  <Link
                    href={href("/committees/scientific")}
                    onClick={closeAllMenus}
                    className="block px-4 py-2 text-gray-700 hover:bg-orange-100"
                  >
                    Scientific Committee
                  </Link>
                  <Link
                    href={href("/committees/advisory")}
                    onClick={closeAllMenus}
                    className="block px-4 py-2 text-gray-700 hover:bg-orange-100"
                  >
                    Advisory Committee
                  </Link>
                  <Link
                    href={href("/committees/technical")}
                    onClick={closeAllMenus}
                    className="block px-4 py-2 text-gray-700 hover:bg-orange-100"
                  >
                    Technical Programs Committee
                  </Link>
                  <Link
                    href={href("/committees/aaia")}
                    onClick={closeAllMenus}
                    className="block px-4 py-2 text-gray-700 hover:bg-orange-100"
                  >
                    AAIA Committee
                  </Link>
                </div>
              )}
            </div>

            <Link
              href={href("/sponsors")}
              className="text-white hover:text-orange-400 transition"
            >
              Technical Sponsors
            </Link>
            <Link
              href={href("/contact")}
              className="text-white hover:text-orange-400 transition"
            >
              Contact
            </Link>
          </nav>

          {/* Register Button */}
          <Link
            href={href("/registration")}
            className="ml-6 px-4 py-1.5 rounded-md text-sm font-semibold shadow-md transition bg-orange-500 text-white hover:bg-orange-600"
          >
            Register Now
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          className="md:hidden p-2 rounded-md text-white hover:bg-orange-400 cursor-pointer"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/70 text-white px-6 py-4 space-y-4">
          <Link
            href={href("/")}
            onClick={closeAllMenus}
            className="block hover:text-orange-400"
          >
            Home
          </Link>
          <Link
            href={href("/call-for-papers")}
            onClick={closeAllMenus}
            className="block hover:text-orange-400"
          >
            Call for Papers
          </Link>
          <Link
            href={href("/speakers")}
            onClick={closeAllMenus}
            className="block hover:text-orange-400"
          >
            Keynote Speakers
          </Link>
          <Link
            href={href("/paper-submission")}
            onClick={closeAllMenus}
            className="block hover:text-orange-400"
          >
            Paper Submission
          </Link>
          <Link
            href={href("/technical-programs")}
            onClick={closeAllMenus}
            className="block hover:text-orange-400"
          >
            Technical Programs
          </Link>
          <Link
            href={href("/registration")}
            onClick={closeAllMenus}
            className="block hover:text-orange-400"
          >
            Registration
          </Link>
          <Link
            href={href("/committees/scientific")}
            onClick={closeAllMenus}
            className="block hover:text-orange-400"
          >
            Scientific Committee
          </Link>
          <Link
            href={href("/committees/advisory")}
            onClick={closeAllMenus}
            className="block hover:text-orange-400"
          >
            Advisory Committee
          </Link>
          <Link
            href={href("/committees/technical")}
            onClick={closeAllMenus}
            className="block hover:text-orange-400"
          >
            Technical Program Committee
          </Link>
          <Link
            href={href("/committees/aaia")}
            onClick={closeAllMenus}
            className="block hover:text-orange-400"
          >
            AAIA Committee
          </Link>
          <Link
            href={href("/sponsors")}
            onClick={closeAllMenus}
            className="block hover:text-orange-400"
          >
            Technical Sponsors
          </Link>
          <Link
            href={href("/contact")}
            onClick={closeAllMenus}
            className="block hover:text-orange-400"
          >
            Contact
          </Link>
          <Link
            href={href("/registration")}
            onClick={closeAllMenus}
            className="block bg-orange-500 text-center rounded-md py-2 text-sm font-semibold hover:bg-orange-600"
          >
            Register Now
          </Link>
        </div>
      )}
    </header>
  );
}
