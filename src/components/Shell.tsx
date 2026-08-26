import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

const LINKS = [
  { to: "/", label: "Board" },
  { to: "/consensus", label: "Consensus" },
  { to: "/models", label: "Models" },
  { to: "/stats", label: "Stats" },
  { to: "/methodology", label: "Method" },
];

export function Shell({ children }: { children: ReactNode }) {
  const status = useQuery({ queryKey: ["status"], queryFn: api.status });
  const asOf = status.data?.registryAsOf ?? " - ";
  const count = status.data?.modelCount;

  return (
    <div className="shell">
      <header className="masthead">
        <NavLink to="/" className="brand">
          <span className="brand-name">TierScope</span>
          <span className="brand-meta">
            {count ? `${count} models` : "Catalog"} · registry {asOf}
          </span>
        </NavLink>
        <nav className="nav" aria-label="Primary">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/"}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="page">{children}</main>
      <footer className="foot">
        <span>Community ranking. Calibration votes are labeled.</span>
        <NavLink to="/methodology">How scores are computed</NavLink>
      </footer>
    </div>
  );
}
