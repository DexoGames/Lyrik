import { Link, useLocation } from "react-router-dom";
import type { CatalogueDef } from "../../catalogues/types";
import { IconHelp, IconStats } from "../../icons";
import { cx } from "../../lib/cx";
import styles from "./Header.module.css";

const MODES = [
  { path: "daily", label: "Daily" },
  { path: "run", label: "Endless" },
  { path: "practice", label: "Practice" },
];

interface Props {
  /** Null on the catalogue picker, where there are no modes to link to. */
  catalogue: CatalogueDef | null;
  onStats: () => void;
  onHelp: () => void;
}

export function Header({ catalogue, onStats, onHelp }: Props) {
  const { pathname } = useLocation();

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <Link to="/" state={{ showHub: true }} className={styles.brand} aria-label="Lyrik home">
          Lyrik<span className={styles.dot}>.</span>
        </Link>
        {catalogue && (
          <Link to={`/${catalogue.id}`} className={styles.catalogue}>
            {catalogue.shortName}
          </Link>
        )}
      </div>

      <nav className={styles.links} aria-label="Modes">
        {catalogue &&
          MODES.map((m) => {
            const to = `/${catalogue.id}/${m.path}`;
            return (
              <Link key={to} to={to} className={cx(styles.link, pathname === to && styles.active)}>
                {m.label}
              </Link>
            );
          })}
      </nav>

      <div className={styles.tools}>
        <button className={styles.icon} onClick={onHelp} aria-label="How to play">
          <IconHelp size={18} />
        </button>
        {catalogue && (
          <button
            className={styles.icon}
            onClick={onStats}
            aria-label={`${catalogue.name} statistics`}
          >
            <IconStats size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
