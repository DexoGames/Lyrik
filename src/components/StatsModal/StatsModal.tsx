import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { CatalogueDef } from "../../catalogues/types";
import { useStats } from "../../game/useStats";
import { BUCKETS, liveDailyStreak, type Bucket } from "../../game/stats";
import { DAILY_MAX } from "../../game/scoring";
import { Modal } from "../Modal/Modal";
import styles from "./StatsModal.module.css";

const BUCKET_LABEL: Record<Bucket, string> = {
  "3": "3 words",
  "4": "4 words",
  "5": "5 words",
  "6": "6 words",
  x: "missed",
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** Records are per catalogue; the modal always shows one artist's. */
  catalogue: CatalogueDef;
}

export function StatsModal({ open, onClose, catalogue }: Props) {
  const { daily, run } = useStats(catalogue.id);

  const streak = liveDailyStreak(daily);
  const avg = daily.played > 0 ? Math.round(daily.totalScore / daily.played) : 0;
  const hitRate = daily.rounds > 0 ? Math.round((daily.solved / daily.rounds) * 100) : 0;
  const counts = BUCKETS.map((b) => daily.dist[b] ?? 0);
  const maxBar = Math.max(1, ...counts);
  const anyRounds = counts.some((c) => c > 0);

  return (
    <Modal title={`${catalogue.name} — your record`} open={open} onClose={onClose}>
      <h3 className={styles.h}>Daily</h3>
      <div className={styles.row}>
        <Stat n={daily.played} label="Played" />
        <Stat n={`${hitRate}%`} label="Named" />
        <Stat n={streak} label="Streak" />
        <Stat n={daily.maxStreak} label="Max" />
      </div>
      <div className={styles.row2}>
        <Stat n={daily.bestScore} label={`Best of ${DAILY_MAX}`} />
        <Stat n={avg} label="Average" />
      </div>

      <h3 className={styles.h}>Words needed</h3>
      {!anyRounds ? (
        <p className={styles.empty}>{catalogue.copy.emptyStats}</p>
      ) : (
        <div className={styles.dist}>
          {BUCKETS.map((b, i) => (
            <div key={b} className={styles.distRow}>
              <span className={styles.distLabel}>{BUCKET_LABEL[b]}</span>
              <div className={styles.barTrack}>
                <motion.div
                  className={styles.bar}
                  data-bucket={b}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.max((counts[i] / maxBar) * 100, counts[i] > 0 ? 14 : 0)}%`,
                  }}
                  transition={{ delay: 0.05 * i, type: "spring", stiffness: 200, damping: 26 }}
                >
                  {counts[i] > 0 && <span>{counts[i]}</span>}
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className={styles.h}>Endless</h3>
      <div className={styles.row}>
        <Stat n={run.runs} label="Runs" />
        <Stat n={run.bestScore} label="Best" />
        <Stat n={run.bestStreak} label="Streak" />
        <Stat n={run.totalSolved} label="Named" />
      </div>

      <p className={styles.note}>
        {catalogue.shortName} only — every catalogue keeps its own record. Stored on this device.
      </p>
    </Modal>
  );
}

function Stat({ n, label }: { n: ReactNode; label: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statN}>{n}</div>
      <div className={styles.statL}>{label}</div>
    </div>
  );
}
