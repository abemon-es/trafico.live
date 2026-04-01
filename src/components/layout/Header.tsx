"use client";

import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Logo } from "@/components/brand/Logo";
import { DesktopNav } from "@/components/layout/nav/DesktopNav";
import { MobileMenu } from "@/components/layout/nav/MobileMenu";
import { NavStateContext, useNavStateValue } from "@/components/layout/nav/useNavState";

export function Header() {
  const navState = useNavStateValue();

  return (
    <NavStateContext value={navState}>
      <header className="dark bg-gradient-to-r from-tl-900 via-tl-950 to-tl-900 border-b border-tl-700/30 sticky top-0 z-50">
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          aria-label="Navegación principal"
        >
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Logo variant="horizontal" size="sm" theme="dark" />

            {/* Desktop Navigation — mega menu triggers + search */}
            <DesktopNav />

            {/* Right-side actions — only theme toggle + mobile hamburger */}
            <div className="flex items-center gap-1.5">
              <ThemeToggle />

              {/* Mobile menu button */}
              <button
                type="button"
                aria-label={
                  navState.mobileMenuOpen ? "Cerrar menú" : "Abrir menú"
                }
                aria-expanded={navState.mobileMenuOpen}
                aria-controls="mobile-nav"
                className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-tl-800/50 hover:text-gray-200"
                onClick={() =>
                  navState.setMobileMenuOpen(!navState.mobileMenuOpen)
                }
              >
                {navState.mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile menu — accordion */}
        <MobileMenu />

        {/* Backdrop overlay when mega menu is open */}
        {navState.activePanel && (
          <div
            className="fixed inset-0 top-16 z-30 bg-black/20 backdrop-blur-[2px]"
            onClick={navState.closeAll}
            aria-hidden="true"
          />
        )}
      </header>
    </NavStateContext>
  );
}
